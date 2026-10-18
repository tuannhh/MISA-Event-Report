import {randomUUID,createHash} from 'node:crypto';
import {norm,defaultSettings} from './domain.js';
import {phoneText,identifiers} from './identifiers.js';
const reject=(status,message)=>{throw Object.assign(Error(message),{status});};
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Canonical source identity excludes changing workflow and provenance metadata.
// Exact occurrences are seeded from legacy snapshots, so shared phone numbers are never matched by row position.
export const recordFingerprint=row=>fingerprint(Object.fromEntries(['name','phone','email','tax_id','company','position','size','industry','submitted_at','tracking','source','attendance_mode','utm_content'].map(k=>[k,row[k]??''])));
const phone=row=>{const v=phoneText(row.phone);return /^0\d{9,10}$/.test(v)?v:'';};
const email=row=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email||'')?norm(row.email):'';
export function matchRegistration(row,records){
 const effective=r=>({...r.data,...r.overrides});
 const same=records.filter(r=>effective(r).attendance_mode===row.attendance_mode);
 const p=phone(row),e=email(row);
 const candidates=same.filter(r=>p&&phone(effective(r))===p||e&&email(effective(r))===e);
 if(candidates.length!==1)return {candidates,match:null};
 const candidate=candidates[0],old=effective(candidate);
 const conflict=(row.name&&old.name&&norm(row.name)!==norm(old.name))||(p&&phone(old)&&p!==phone(old))||(e&&email(old)&&e!==email(old));
 return {candidates,match:conflict?null:candidate};
}
export function mergeNonempty(previous,incoming){
 const merged={...previous};
 for(const [key,value] of Object.entries(incoming)){
  if(['id','version','assignee_id','assignee_name','can_edit','created_at','updated_at','registration_status'].includes(key))continue;
  if(value===null||value===undefined||value===''||Array.isArray(value)&&!value.length)continue;
  if(['source_details','identifier_original'].includes(key))merged[key]={...(previous[key]||{}),...Object.fromEntries(Object.entries(value).filter(([,v])=>v!==''&&v!=null))};
  else if(key==='call_status'&&(previous[key]==='called'||value==='unknown'&&previous[key]))continue;
  else merged[key]=value;
 }
 // A later invitation list never demotes a registered guest.
 merged.registration_status=previous.registration_status==='registered'?'registered':incoming.registration_status||previous.registration_status||'registered';
 return merged;
}
export async function initializeRegistry(c,event){
 if(event.registry_initialized)return;
 const {rows:[snapshot]}=event.active_snapshot_id?await c.query('SELECT * FROM snapshots WHERE id=$1 AND event_id=$2',[event.active_snapshot_id,event.id]):{rows:[]};
 if(!snapshot&&!event.source&&event.settings.target===1350&&JSON.stringify(event.settings.clevel)===JSON.stringify(['CEO/Giám đốc','Chủ doanh nghiệp'])&&event.settings.dedup==='none'&&!event.settings.targets.length){
  const {rowCount}=await c.query("SELECT 1 FROM audit WHERE event_id=$1 AND action='settings.updated' LIMIT 1",[event.id]);
  if(!rowCount){event.settings=defaultSettings();await c.query('UPDATE events SET settings=$1 WHERE id=$2',[JSON.stringify(event.settings),event.id]);await c.query("INSERT INTO audit(event_id,action) VALUES($1,'settings.cleared_unused_defaults')",[event.id]);}
 }
 const sourceId=randomUUID();
 if(snapshot||event.source)await c.query('INSERT INTO event_sources(id,event_id,source_key,label,kind,mode,config,target_plan,enabled,synced_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[sourceId,event.id,event.source?'sheet:'+event.source.url+':'+event.source.sheetName+':auto':'legacy','Dữ liệu hiện có',event.source?'sheet':'file','auto',JSON.stringify(event.source||{}),snapshot?.target_plan?JSON.stringify(snapshot.target_plan):null,!!event.source?.enabled,event.synced_at]);
 const legacyOccurrences=new Map();
 for(const row of snapshot?.rows||[]){
  const modes=row.attendance_mode==='both'?['online','offline']:[row.attendance_mode==='unknown'||!row.attendance_mode?event.mode==='hybrid'?'unknown':event.mode:row.attendance_mode];
  for(const mode of modes){const id=randomUUID(),data=identifiers({...row,attendance_mode:mode,registration_status:'registered'});delete data.id;
   await c.query('INSERT INTO registrations(id,event_id,legacy_id,data) VALUES($1,$2,$3,$4)',[id,event.id,row.id,JSON.stringify(data)]);
   const stable='row:'+recordFingerprint(data)+':'+mode,occurrence=legacyOccurrences.get(stable)||0;legacyOccurrences.set(stable,occurrence+1);await c.query('INSERT INTO source_records(source_id,record_key,registration_id) VALUES($1,$2,$3)',[sourceId,stable+':'+occurrence,id]);
  }
 }
 await c.query('UPDATE events SET registry_initialized=true WHERE id=$1',[event.id]);event.registry_initialized=true;
 if(snapshot)await projectSnapshot(c,event,null,'Khởi tạo hồ sơ khách',snapshot.quality);
}
export async function projectSnapshot(c,event,userId,label,quality={}){
 const {rows:records}=await c.query('SELECT * FROM registrations WHERE event_id=$1 ORDER BY created_at,id',[event.id]);
 const rows=records.map(r=>({...r.data,...r.overrides,id:r.id,version:r.version,imported_at:r.created_at}));
 const {rows:sources}=await c.query('SELECT mode,target_plan FROM event_sources WHERE event_id=$1 AND target_plan IS NOT NULL ORDER BY target_updated_at,id',[event.id]);
 const byMode={};let plan=null;
 for(const source of sources){if(['online','offline'].includes(source.mode))byMode[source.mode]=source.target_plan;else plan=source.target_plan;}
 if(Object.keys(byMode).length)plan={...(plan||{}),byMode};
 const id=randomUUID();
 await c.query('INSERT INTO snapshots(id,event_id,label,rows,quality,target_plan,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,event.id,label,JSON.stringify(rows),JSON.stringify({...quality,total:rows.length,invalidDates:rows.filter(r=>!r.submitted_at).length,missingPosition:rows.filter(r=>!r.position).length}),plan?JSON.stringify(plan):null,userId]);
 await c.query('UPDATE events SET active_snapshot_id=$1 WHERE id=$2',[id,event.id]);
 await c.query('INSERT INTO audit(event_id,user_id,action,detail) VALUES($1,$2,$3,$4)',[event.id,userId,'registry.snapshot',JSON.stringify({id,count:rows.length,label})]);
 return id;
}
export function participationRows(rows,mode,eventMode,status){
 return rows.flatMap(row=>{
  const original=row.attendance_mode||'unknown';
  if(['online','offline'].includes(mode)&&original!=='unknown'&&original!==mode)reject(400,'Có khách khác hình thức đã chọn. Chọn “Theo từng dòng” hoặc tách đúng nguồn Online/Offline.');
  const selected=['online','offline'].includes(mode)?mode:original==='unknown'&&eventMode!=='hybrid'?eventMode:original;
  return (selected==='both'?['online','offline']:[selected]).map(attendance_mode=>({...row,attendance_mode,registration_status:status||'registered'}));
 });
}
export async function upsertSource(c,event,{key,label,kind,mode='auto',config={},targetPlan,enabled=false}){
 const {rows:[source]}=await c.query(`INSERT INTO event_sources(id,event_id,source_key,label,kind,mode,config,target_plan,enabled,synced_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
 ON CONFLICT(event_id,source_key) DO UPDATE SET label=excluded.label,config=excluded.config,target_plan=COALESCE(excluded.target_plan,event_sources.target_plan),target_updated_at=CASE WHEN excluded.target_plan IS NOT NULL THEN now() ELSE event_sources.target_updated_at END,enabled=excluded.enabled RETURNING *`,[randomUUID(),event.id,key,label,kind,mode,JSON.stringify(config),targetPlan?JSON.stringify(targetPlan):null,enabled]);
 return source;
}
export async function mergeImport(c,event,source,rows,userId,{quality={},label=source.label,permissionUser=null}={}){
 await initializeRegistry(c,event);
 const {rows:records}=await c.query('SELECT * FROM registrations WHERE event_id=$1 ORDER BY created_at,id',[event.id]);
 const {rows:bindings}=await c.query('SELECT * FROM source_records WHERE source_id=$1',[source.id]);
 const permissions=permissionUser?new Map((await assignedRows(c,event.id,records.map(r=>({...r.data,...r.overrides,id:r.id})),permissionUser)).map(r=>[r.id,r.can_edit])):null;
 if(permissionUser&&(await assignedRows(c,event.id,rows,permissionUser)).some(r=>!r.can_edit))reject(403,'File có khách chưa được phân công cho bạn. Admin có thể nhập toàn bộ hoặc cấu hình mã nhân viên trước.');
 const byKey=new Map(bindings.map(b=>[b.record_key,b.registration_id]));
 const occurrences=new Map(),used=new Set();let added=0,updated=0,conflicts=0;
 for(const input of rows){
  const row={...input};delete row.id;
  // Source lead IDs are scoped to this source, tab and attendance mode. Anonymous rows use an exact occurrence key.
  const stable=row.lead_id?'lead:'+row.department+':'+row.lead_id: 'row:'+recordFingerprint(row);
  const occurrence=occurrences.get(stable+':'+row.attendance_mode)||0;occurrences.set(stable+':'+row.attendance_mode,occurrence+1);
  const key=stable+':'+row.attendance_mode+':'+occurrence;
  let match=records.find(r=>r.id===byKey.get(key));
  if(!match){const result=matchRegistration(row,records);match=result.match;
   if(permissions&&result.candidates.some(r=>!permissions.get(r.id)))reject(403,'File có khách thuộc người phụ trách khác. Liên hệ Admin để đối chiếu.');
   if(!match&&result.candidates.length){
    await c.query(`INSERT INTO import_conflicts(id,event_id,source_id,record_key,data,candidates,reason) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(source_id,record_key) DO UPDATE SET data=excluded.data,candidates=excluded.candidates WHERE import_conflicts.resolved_at IS NULL`,[randomUUID(),event.id,source.id,key,JSON.stringify(row),JSON.stringify(result.candidates.map(r=>r.id)),'Thông tin liên hệ trùng nhưng danh tính chưa rõ']);conflicts++;continue;
   }
  }
  if(match&&permissions&&!permissions.get(match.id))reject(403,'Bạn không được cập nhật khách thuộc người phụ trách khác.');
  if(match&&used.has(match.id)&&!row.lead_id)match=null;
  if(!match){match={id:randomUUID(),data:row,overrides:{}};records.push(match);permissions?.set(match.id,true);added++;await c.query('INSERT INTO registrations(id,event_id,data) VALUES($1,$2,$3)',[match.id,event.id,JSON.stringify(row)]);}
  else {const data=mergeNonempty(match.data,row);if(JSON.stringify(data)!==JSON.stringify(match.data)){updated++;await c.query('UPDATE registrations SET data=$1,version=version+1,updated_at=now() WHERE id=$2 AND event_id=$3',[JSON.stringify(data),match.id,event.id]);match.data=data;}}
  used.add(match.id);
  await c.query('INSERT INTO source_records(source_id,record_key,registration_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[source.id,key,match.id]);byKey.set(key,match.id);
 }
 await c.query('UPDATE event_sources SET synced_at=now(),error=null WHERE id=$1',[source.id]);
 const id=await projectSnapshot(c,event,userId,label,{...quality,added,updated,conflicts});
 return {id,added,updated,conflicts};
}
export async function assignedRows(c,eventId,rows,user){
 const {rows:assignments}=await c.query('SELECT a.code,a.user_id,u.name FROM staff_assignments a JOIN users u ON u.id=a.user_id JOIN members m ON m.user_id=u.id AND m.event_id=a.event_id WHERE a.event_id=$1 AND u.active',[eventId]);
 const map=new Map(assignments.map(a=>[norm(a.code),a]));
 const {rows:[member]}=await c.query('SELECT role FROM members WHERE event_id=$1 AND user_id=$2',[eventId,user.id]);
 const admin=user.global_role==='super_admin'||member?.role==='admin';
 return rows.map(row=>{const assigned=map.get(norm(row.staff_code||row.utm_content||row.tracking));return {...row,assignee_id:assigned?.user_id||null,assignee_name:assigned?.name||'',can_edit:admin||member?.role==='editor'&&assigned?.user_id===user.id};});
}
export async function editableRegistration(c,event,rowId,user){
 const {rows:[record]}=await c.query('SELECT * FROM registrations WHERE event_id=$1 AND (id::text=$2 OR legacy_id=$2) ORDER BY id LIMIT 1 FOR UPDATE',[event.id,rowId]);
 if(!record)reject(404,'Không tìm thấy khách trong sự kiện.');
 const [row]=await assignedRows(c,event.id,[{...record.data,...record.overrides}],user);
 if(!row.can_edit)reject(403,'Bạn chỉ được cập nhật khách đã phân công cho mình. Liên hệ Admin để phân công.');
 return record;
}
