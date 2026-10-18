import {identifiers,phoneText} from './identifiers.js';
import {isCallColumn,normalizeCalls} from './call-status.js';
import {attendanceMode,modeLabels} from './account-policy.js';
import {createHash} from 'node:crypto';
import {matchesSources, sourceBreakdowns} from './source-dimensions.js';
export const fields = {name:'Họ và tên',email:'Email',phone:'Số điện thoại',tax_id:'Mã số thuế',company:'Tên công ty',position:'Chức vụ',size:'Quy mô nhân sự',industry:'Lĩnh vực kinh doanh',submitted_at:'Thời gian submit',tracking:'Mã tracking / utm_content',source:'Nguồn khách',attendance_mode:'Hình thức tham dự',call_status:'Gọi xác nhận',department:'Phòng / nhóm',staff_code:'Mã nhân viên',lead_id:'Mã lead nguồn',province:'Tỉnh / thành phố'};
export const clean = v => String(v ?? '').trim();
export const norm = v => clean(v).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/đ/g,'d');
export const defaultSettings = () => ({target:null,channelTargets:{online:null,offline:null},clevel:[],dedup:'none',targets:[],reports:['positions','sizes','trend','sources']});
export function guessMapping(headers){
  const aliases={department:['phong','phong ban','nhom','department'],staff_code:['nv onb','nv am','ma nhan vien','nhan vien phu trach'],lead_id:['lead_id','lead id','ma lead','contact id'],province:['tinh','tinh/thanh pho'],tax_id:['ma so thue','mst','tax_id','tax code'],call_status:['lien he xac nhan','goi xac nhan','trang thai goi','ket qua goi','call_status','call status'],attendance_mode:['hinh thuc tham du','hinh thuc tham gia','hinh thuc','attendance_mode','tham du'],name:['ho va ten','ten lien he','ho ten ktt','ho ten','lien he','name'],email:['email'],phone:['so dien thoai','sdt','phone'],company:['ten cong ty','ten don vi','company'],position:['chuc vu','position','job title'],size:['quy mo nhan su','size'],industry:['linh vuc kinh doanh','industry'],submitted_at:['thoi gian submit','submitted_at','timestamp','ngay dang ky','thoi gian'],tracking:['utm_content','ma tracking','utm_term'],source:['nguon marketing','utm_source','source']};
  return Object.fromEntries(Object.entries(aliases).map(([k,values])=>[k,values.map(v=>headers.find(h=>norm(h)===v)).find(Boolean)||'']));
}
export function parseDate(value){
  if(value instanceof Date) return value.toISOString();
  const s=clean(value); if(!s)return null;
  const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const iso=m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${(m[4]||'00').padStart(2,'0')}:${m[5]||'00'}:${m[6]||'00'}+07:00`:s;
  if(!m&&!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s))return null;
  const v=/^\d{4}-\d{2}-\d{2}$/.test(iso)?iso+'T00:00:00+07:00':(/[Zz]|[+-]\d{2}:\d{2}$/.test(iso)?iso:iso+'+07:00');
  const d=new Date(v); if(!Number.isFinite(d.getTime())) return null;
  const datePart=iso.slice(0,10);if(!m){const probe=new Date(datePart+'T00:00:00Z');if(!Number.isFinite(probe.getTime())||probe.toISOString().slice(0,10)!==datePart)return null;}
  if(m&&localDay(d.toISOString())!==`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`)return null;
  return d.toISOString();
}
export const localDay = iso => new Date(new Date(iso).getTime()+7*3600000).toISOString().slice(0,10);
export function normalizeRows(raw,mapping,sourceColumns=[]){
  let invalidDates=0,missingPosition=0; const seen=new Set();let duplicateRows=0;
  const callColumns=[...new Set([mapping.call_status,...Object.keys(raw[0]||{}).filter(isCallColumn)].filter(h=>h&&isCallColumn(h)))];
  const rows=raw.filter(r=>Object.values(r).some(v=>clean(v))).map((r,index)=>{
    const o=identifiers(Object.fromEntries(Object.keys(fields).map(k=>[k,clean(r[mapping[k]])])));
    o.identifier_original={phone:clean(r[mapping.phone]),tax_id:clean(r[mapping.tax_id])};
    o.department=o.department||clean(r.__sheet);
    o.utm_content=clean(r[Object.keys(r).find(h=>norm(h)==='utm_content')]);
    o.attendance_mode=attendanceMode(o.attendance_mode);
    Object.assign(o,normalizeCalls(r,callColumns));
    o.submitted_at=parseDate(r[mapping.submitted_at]); if(!o.submitted_at)invalidDates++;
    if(!o.position)missingPosition++;
    if(sourceColumns.length)o.source_details=Object.fromEntries(sourceColumns.map(h=>[h,clean(r[h])]));
    const fingerprint=createHash('sha256').update(JSON.stringify(o)).digest('hex');if(seen.has(fingerprint))duplicateRows++;seen.add(fingerprint);
    return {...o,id:String(index+1)};
  });
  if(!rows.length)throw Error('Không tìm thấy dòng dữ liệu.');
  return {rows,quality:{total:rows.length,invalidDates,missingPosition,duplicateRows}};
}
export function selectRows(rows,settings,from,to,sourceFilters={},mode='all'){
  const seen=new Set();
  return rows.filter(r=>{
    if(r.registration_status==='invited')return false;
    if(settings.dedup!=='none') {const identity=norm(settings.dedup==='phone'?phoneText(r.phone):r[settings.dedup]);const key=identity?attendanceMode(r.attendance_mode)+':'+identity:'';if(key&&seen.has(key))return false;if(key)seen.add(key);}
    if(!matchesSources(r,sourceFilters))return false;
    if(mode!=='all'&&attendanceMode(r.attendance_mode)!==mode&&!(mode==='online'||mode==='offline' ? attendanceMode(r.attendance_mode)==='both' : false))return false;
    if(!from&&!to)return true;
    if(!r.submitted_at)return false;
    const day=localDay(r.submitted_at);return (!from||day>=from)&&(!to||day<=to);
  });
}
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
export function summarize(rows,settings,from,to,sourceFilters={},mode='all'){
  const selected=selectRows(rows,settings,from,to,sourceFilters,mode), total=selected.length;
  const clevel=r=>settings.clevel.some(v=>norm(v)===norm(r.position));
  const nC=selected.filter(clevel).length;
  const group=key=>Object.entries(selected.reduce((a,r)=>{const k=r[key]||'Chưa xác định';a[k]=(a[k]||0)+1;return a;},Object.create(null))).map(([label,count])=>({label,count,percent:pct(count,total)})).sort((a,b)=>b.count-a.count);
  const targets=settings.targets.map(t=>{const matches=selected.filter(r=>norm(r.tracking)===norm(t.code));const c=matches.filter(clevel).length;return {...t,count:matches.length,clevel:c,completion:pct(matches.length,t.target),clevel_share:pct(c,matches.length),clevel_completion:pct(c,t.target)};});
  const days=Object.create(null);for(const r of selected)if(r.submitted_at){const day=localDay(r.submitted_at);days[day]=(days[day]||0)+1;}
  const orderedDays=Object.keys(days).sort();
  if(orderedDays.length&&Date.parse(orderedDays.at(-1))-Date.parse(orderedDays[0])<=3660*86400000){const end=Date.parse(orderedDays.at(-1));for(let time=Date.parse(orderedDays[0]);time<=end;time+=86400000){const day=new Date(time).toISOString().slice(0,10);days[day]??=0;}}
  const known=new Set(settings.targets.map(t=>norm(t.code)));
  const groups=Object.values(targets.reduce((acc,t)=>{const k=t.group||'Chưa phân nhóm';acc[k]??={name:k,target:0,count:0,clevel:0,tracking_codes:0};acc[k].target+=t.target;acc[k].count+=t.count;acc[k].clevel+=t.clevel;acc[k].tracking_codes++;return acc;},Object.create(null)));
  const modes=Object.entries(modeLabels).map(([value,label])=>{const count=selected.filter(r=>attendanceMode(r.attendance_mode)===value).length;return {value,label,count,percent:pct(count,total)};});
  const called=selected.filter(r=>r.call_status==='called').length;
  const callUnknown=selected.filter(r=>!['called','not_called'].includes(r.call_status)).length;
  const attendance=[['online','Online'],['offline','Offline']].map(([value,label])=>{const count=selected.filter(r=>[value,'both'].includes(attendanceMode(r.attendance_mode))).length;return {value,label,count,percent:pct(count,total)};});
  return {called,call_rate:pct(called,total),call_unknown:callUnknown,attendance,modes,total,clevel:nC,clevel_share:pct(nC,total),clevel_completion:pct(nC,settings.target),completion:pct(total,settings.target),target:settings.target,positions:group('position'),sizes:group('size'),sources:group('source'),sourceBreakdowns:sourceBreakdowns(selected),targets,groups,trend:Object.entries(days).sort().map(([label,count])=>({label,count})),unmapped:selected.filter(r=>!known.has(norm(r.tracking))).length,invalidDates:selected.filter(r=>!r.submitted_at).length,targetSum:settings.targets.reduce((s,t)=>s+t.target,0)};
}
