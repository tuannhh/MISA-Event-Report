import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {randomUUID} from 'node:crypto';
import {defaultSettings,guessMapping,summarize,normalizeRows} from '../server/domain.js';
import {matchRegistration,mergeNonempty,participationRows,initializeRegistry} from '../server/registry.js';
import {readFile,normalizeData,syncEvent} from '../server/ingestion.js';
import {pool,transaction} from '../server/db.js';
import {hashPassword} from '../server/auth.js';

test('fresh settings are empty and imports never invent missing dates, positions or calls',()=>{
 assert.equal(defaultSettings().target,null);assert.deepEqual(defaultSettings().clevel,[]);assert.notEqual(defaultSettings().channelTargets,defaultSettings().channelTargets);
 const headers=['Tên liên hệ','Số điện thoại','Payload.confirmation_field_input'];const parsed=normalizeRows([{'Tên liên hệ':'An','Số điện thoại':'912345678','Payload.confirmation_field_input':true}],{...guessMapping(headers),call_status:headers[2]});
 assert.equal(parsed.rows[0].phone,'0912345678');assert.equal(parsed.rows[0].submitted_at,null);assert.equal(parsed.rows[0].position,'');assert.equal(parsed.rows[0].call_status,'unknown');
});
test('match only unambiguous identities within one participation mode; keep prior nonempty data',()=>{
 const old={id:'1',data:{name:'An',phone:'0912345678',email:'an@example.test',attendance_mode:'online',company:'A',call_status:'called'}};
 assert.equal(matchRegistration({...old.data,phone:'912345678'},[old]).match.id,'1');
 assert.equal(matchRegistration({...old.data,name:'Binh'},[old]).match,null);
 assert.equal(matchRegistration({...old.data,attendance_mode:'offline'},[old]).candidates.length,0);
 assert.equal(matchRegistration({...old.data},[old,{...old,id:'2'}]).match,null);
 assert.equal(mergeNonempty(old.data,{company:'',call_status:'not_called'}).company,'A');assert.equal(mergeNonempty(old.data,{call_status:'unknown'}).call_status,'called');
 const rows=participationRows([{...old.data,attendance_mode:'both'}],'auto','hybrid','registered');assert.equal(rows.length,2);assert.equal(summarize(rows,{...defaultSettings(),dedup:'phone'}).total,2);
 assert.equal(summarize([{...old.data,registration_status:'invited'}],defaultSettings()).total,0);
});
test('HCSN workbook detects headers per tab, ignores STT-only rows, preserves department and missing modes',async()=>{
 const book=new ExcelJS.Workbook();for(const name of ['ONB03','PKD01']){const sheet=book.addWorksheet(name);sheet.addRow(['Online: https://example.test']);sheet.addRow(['Offline']);sheet.addRow(['Ghi chú']);sheet.addRow(['Sự kiện 24/10']);sheet.addRow(['STT','Họ tên KTT','SĐT','Tên đơn vị','Tỉnh','NV ONB','Hình thức tham gia','TÌNH TRẠNG UPDATE BÁO CÁO']);sheet.addRow([1,'Khách '+name,912345678,'Trường A','Hà Nội','NV01',name==='ONB03'?'Ofline':'','ĐÃ UPDATE']);sheet.addRow([2]);sheet.addRow([3]);}
 const data=await readFile(Buffer.from(await book.xlsx.writeBuffer()),'hcsn.xlsx','*',0,{goals:false});const parsed=normalizeData(data,data.mapping);assert.equal(parsed.rows.length,2);assert.deepEqual(parsed.rows.map(r=>r.department),['ONB03','PKD01']);assert.deepEqual(parsed.rows.map(r=>r.attendance_mode),['offline','unknown']);assert.ok(parsed.rows.every(r=>!r.submitted_at&&!r.position&&r.call_status==='unknown'));assert.equal(parsed.rows[0].staff_code,'NV01');
});
test('persistent registry protects contacts across imports, scopes channels/targets, resolves ambiguous guests and enforces assignment',{skip:!process.env.BASE_URL||!process.env.DATABASE_URL},async t=>{
 t.after(()=>pool.end());const id=randomUUID(),email=`registry-${id}@misa.com.vn`,password='Registry-QA-2026!';
 await pool.query("INSERT INTO users(id,email,password,name,global_role,must_change_password) VALUES($1,$2,$3,'Registry QA','super_admin',false)",[id,email,hashPassword(password)]);
 let cookie='';const req=async(path,body,method=body?'POST':'GET',status=200)=>{const r=await fetch(process.env.BASE_URL+path,{method,headers:{Cookie:cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});const value=await r.json();assert.equal(r.status,status,JSON.stringify(value));if(path==='/api/login')cookie=r.headers.get('set-cookie').split(';')[0];return value;};
 await req('/api/login',{email,password});const event=await req('/api/events',{name:'Registry QA',mode:'hybrid'},'POST',201),base='/api/events/'+event.id;
 const settings=(await req(base)).settings;assert.equal(settings.target,null);await req(base+'/settings',{...settings,channelTargets:{online:10,offline:20}},'PUT');
 const upload=async(text,mode='online',registrationStatus='registered',filename='lead.csv')=>{const form=new FormData();form.append('file',new Blob([text]),filename);form.append('mode',mode);form.append('registrationStatus',registrationStatus);form.append('automatic','true');return req(base+'/import/file',form);};
 const csv='Họ và tên,Số điện thoại,Email,Tên công ty,utm_content\nAn,912345678,an@example.test,Công ty A,NV01';
 await upload(csv);let row=(await req(base+'/rows')).rows[0];const first=row.id;assert.equal(row.version,1);
 await req(base+'/rows/'+row.id+'/contacts',{version:row.version,channel:'phone',called:true,response:'call_back',note:'Gọi lại chiều',follow_up_at:'24/10/2026 14:00'});const historical=(await req(base)).active_snapshot_id;
 await upload('Họ và tên,Số điện thoại,Email,Tên công ty,utm_content\nAn,0912345678,an@example.test,,NV01');
 row=(await req(base+'/rows')).rows[0];assert.equal(row.id,first);assert.equal(row.company,'Công ty A');assert.equal(row.call_status,'called');assert.equal(row.contact_note,'Gọi lại chiều');assert.equal((await req(base+'/rows/'+row.id+'/contacts')).total,1);
 await req(base+'/rows/'+row.id+'/contacts',{version:1,channel:'phone',called:true,response:'confirmed'},'POST',409);
 await upload(csv,'offline');let report=await req(base+'/report');assert.equal(report.current.total,2);assert.equal(report.current.target,30);assert.equal(report.current.called,1);assert.equal((await req(base+'/report?mode=online')).current.target,10);assert.equal((await req(base+'/report?mode=offline')).current.target,20);
 await upload(csv+'\nBinh,988887777,b@example.test,Công ty B,NV02','offline','invited','invite.csv');assert.equal((await req(base+'/report')).current.total,2);assert.equal((await req(base+'/report')).current.invited,1);assert.equal((await req(base+'/report?mode=unknown')).current.invited,0);assert.equal((await req(base+'/report?from=2026-10-24')).current.invited,0);
 let invited=(await req(base+'/rows')).rows.find(r=>r.name==='Binh');await req(base+'/rows/'+invited.id+'/contacts',{version:invited.version,channel:'paper',called:false,response:'confirmed',note:'Đã nhận phiếu'});report=await req(base+'/report');assert.equal(report.current.total,3);assert.equal(report.current.called,1);
 await upload('Họ và tên,Số điện thoại,Email\nKhách khác,912345678,other@example.test');let conflicts=await req(base+'/conflicts');assert.equal(conflicts.total,1);assert.equal((await req(base+'/report')).current.total,3);
 await req(base+'/conflicts/'+conflicts.rows[0].id,{registration_id:null});assert.equal((await req(base+'/report')).current.total,4);
 await upload('Họ và tên,Số điện thoại,Email\nKhách khác,912345678,other@example.test');assert.equal((await req(base+'/report')).current.total,4);assert.equal((await req(base+'/conflicts')).total,0);
 assert.equal((await req(base+'/report?snapshot='+historical)).current.total,1);
 await req(base+'/settings',{...settings,channelTargets:{online:10,offline:null}},'PUT');assert.equal((await req(base+'/report')).current.target,null);assert.equal((await req(base+'/report?mode=unknown')).current.target,null);
 row=(await req(base+'/rows')).rows.find(r=>r.id===first);await req(base+'/rows/'+row.id,{version:row.version,row:{call_status:'not_called'}},'PATCH',409);
 // An explicit human correction survives a source refresh; one source error cannot roll back another.
 row=(await req(base+'/rows')).rows.find(r=>r.id===first);await req(base+'/rows/'+row.id,{version:row.version,row:{company:'Công ty đã sửa'}},'PATCH');assert.equal((await req(base+'/rows')).rows.find(r=>r.id===first).phone,'0912345678');
 const sourceId=randomUUID();await pool.query("INSERT INTO event_sources(id,event_id,source_key,label,kind,mode,config,enabled) VALUES($1,$2,'test-sync','Sync','sheet','online',$3,true)",[sourceId,event.id,JSON.stringify({url:'https://docs.google.com/spreadsheets/d/qa/edit'})]);
 const data={headers:['Họ và tên','Số điện thoại','Email','Tên công ty'],raw:[{'Họ và tên':'An','Số điện thoại':'912345678',Email:'an@example.test','Tên công ty':'Nguồn đổi'}]};
 // Shared phone now makes the source ambiguous: it must not overwrite either person.
 await syncEvent(event.id,null,{read:async()=>data});assert.equal((await req(base+'/rows')).rows.find(r=>r.id===first).company,'Công ty đã sửa');
 assert.ok((await syncEvent(event.id,null,{read:async()=>{throw Error('offline');}})).warning);
 const other=await req('/api/events',{name:'Clean event',mode:'offline'},'POST',201);assert.equal((await req('/api/events/'+other.id+'/rows')).total,0);assert.equal((await req('/api/events/'+other.id+'/sources')).length,0);assert.equal((await req('/api/events/'+other.id)).settings.target,null);
 // Backfill keeps old snapshots intact and does not touch account credentials.
 const legacy=randomUUID(),snapshot=randomUUID(),hash=(await pool.query('SELECT password FROM users WHERE id=$1',[id])).rows[0].password;
 await pool.query("INSERT INTO events(id,slug,name,settings,mode,active_snapshot_id) VALUES($1,$2,'Legacy',$3,'offline',$4)",[legacy,'legacy-'+legacy,JSON.stringify({...settings,target:1350}),snapshot]);
 await pool.query("INSERT INTO snapshots(id,event_id,label,rows,quality) VALUES($1,$2,'Original',$3,'{}')",[snapshot,legacy,JSON.stringify([{id:'1',name:'Legacy',phone:'0911111111',call_status:'called',attendance_mode:'unknown'}])]);
 await transaction(async c=>{const event=(await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[legacy])).rows[0];await initializeRegistry(c,event);});
 assert.equal((await pool.query('SELECT rows FROM snapshots WHERE id=$1',[snapshot])).rows[0].rows[0].id,'1');assert.equal((await pool.query('SELECT data FROM registrations WHERE event_id=$1',[legacy])).rows[0].data.call_status,'called');assert.equal((await pool.query('SELECT password FROM users WHERE id=$1',[id])).rows[0].password,hash);
});

test('repeat rows remain separate until report dedup is selected; reimport is idempotent',{skip:!process.env.BASE_URL||!process.env.DATABASE_URL},async()=>{
 // A separate client avoids the test-file pool closed by the larger integration test.
 const {default:pg}=await import('pg');const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
 try{const {mergeImport,upsertSource}=await import('../server/registry.js');const id=randomUUID(),event={id,mode:'hybrid',registry_initialized:true,settings:defaultSettings()};await c.query('BEGIN');await c.query("INSERT INTO events(id,slug,name,mode,settings,registry_initialized) VALUES($1::uuid,$1::text,'Repeated QA','hybrid',$2,true)",[id,JSON.stringify(event.settings)]);const source=await upsertSource(c,event,{key:'file:qa',label:'QA',kind:'file'});const row={name:'An',phone:'0912345678',attendance_mode:'online',registration_status:'registered'};
 await mergeImport(c,event,source,[row,row],null);await mergeImport(c,event,source,[row,row],null);const records=(await c.query('SELECT data FROM registrations WHERE event_id=$1',[id])).rows.map(r=>r.data);assert.equal(records.length,2);assert.equal(summarize(records,event.settings).total,2);assert.equal(summarize(records,{...event.settings,dedup:'phone'}).total,1);await c.query('ROLLBACK');}finally{await c.end();}
});
