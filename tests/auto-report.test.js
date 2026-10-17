import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {guessSourceColumns,safeSourceHeader} from '../server/source-dimensions.js';
import {pool} from '../server/db.js';
import {hashPassword} from '../server/auth.js';
import {syncEvent} from '../server/ingestion.js';
import {guessMapping} from '../server/domain.js';
import {insightData} from '../server/insight-data.js';

test('staff dimensions are available without allowing contact email and phone fields',()=>{
 const headers=['Họ và tên','Họ và tên nhân viên','Tên tiếp nhận','Nhân viên mời','Người phụ trách','Email nhân viên','Số điện thoại nhân viên','utm_source'];
 assert.deepEqual(guessSourceColumns(headers),['Họ và tên nhân viên','Tên tiếp nhận','Nhân viên mời','Người phụ trách','utm_source']);
 for(const h of ['Email nhân viên','Số điện thoại nhân viên','__proto__'])assert.equal(safeSourceHeader(h),false);
});

test('AI payload preserves source totals but excludes staff names, raw rows and file metadata',()=>{
 const result=insightData({snapshot:{label:'private-file'},current:{total:2,sources:[{label:'Web',count:2}],targets:[{name:'Private staff'}],groups:[{name:'Private staff'}],sourceBreakdowns:[{name:'Tên tiếp nhận',values:[{value:'Private staff'}]}]},comparison:null,range:{sourceFilters:{'Tên tiếp nhận':'Private staff'},from:'2026-01-01'},sourceDimensions:[{name:'Private staff'}],rows:[{email:'private@example.test'}]});
 assert.deepEqual(result.current.sources,[{label:'Web',count:2}]);assert.equal(result.filteredBySource,true);
 assert.equal(JSON.stringify(result).includes('Private'),false);assert.equal(JSON.stringify(result).includes('private'),false);
});

test('automatic import, pending recovery, staff/date filters, historical snapshots and refresh safety',{skip:!process.env.BASE_URL||!process.env.DATABASE_URL},async t=>{
 t.after(()=>pool.end());
 const origin=process.env.BASE_URL,id=randomUUID(),email=`auto-${id}@misa.com.vn`,password='Auto-report-2026!';
 await pool.query("INSERT INTO users(id,email,password,name,global_role,must_change_password) VALUES($1,$2,$3,'Auto QA','super_admin',false)",[id,email,hashPassword(password)]);
 let cookie='';
 const request=async(path,{body,method=body?'POST':'GET',status=200,auth=cookie}={})=>{
  const r=await fetch(origin+path,{method,headers:{Cookie:auth,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});
  const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 cookie=(await request('/api/login',{body:{email,password}})).cookie;
 const event=(await request('/api/events',{body:{name:'Auto QA '+id},status:201})).data,base='/api/events/'+event.id;
 const csv='Họ và tên,Chức vụ,Thời gian submit,utm_source,Tên tiếp nhận\nA,CEO/Giám đốc,01/09/2026,Web,Nhân viên A\nB,IT,17/10/2026,Email,Nhân viên B\nC,IT,bad,Web,Nhân viên A';
 const upload=async(text,automatic=true)=>{const body=new FormData();body.append('file',new Blob([text]),'qa.csv');if(automatic)body.append('automatic','true');return (await request(base+'/import/file',{body})).data;};
 const first=await upload(csv);assert.equal(first.committed,true);
 let report=(await request(base+'/report')).data;
 assert.equal(report.current.total,3);assert.equal(report.current.clevel,1);assert.equal(report.quality.invalidDates,1);assert.equal(report.snapshot.id,first.snapshotId);
 assert.equal((await request(base+'/imports/pending')).data,null);
 assert.ok(report.generatedAt);assert.ok(report.sourceDimensions.some(d=>d.name==='Tên tiếp nhận'));
 const filters=encodeURIComponent(JSON.stringify({'Tên tiếp nhận':'Nhân viên A',utm_source:'Web'}));
 assert.equal((await request(base+'/report?sourceFilters='+filters)).data.current.total,2);
 const empty=(await request(base+'/report?from=2025-01-01&to=2025-01-02')).data;assert.equal(empty.current.total,0);assert.ok(empty.sourceDimensions.some(d=>d.name==='Tên tiếp nhận'));
 assert.equal((await request(base+'/report?from=2026-10-01&to=2026-10-17')).data.current.total,1);
 const second=await upload(csv+'\nD,IT,17/10/2026,Web,Nhân viên B');
 assert.equal((await request(base+'/report')).data.current.total,4);
 assert.equal((await request(base+'/report?snapshot='+first.snapshotId)).data.current.total,3);
 const broken=await upload('Name,Unknown\nA,B');assert.equal(broken.needsMapping,true);
 assert.equal((await request(base+'/report')).data.snapshot.id,second.snapshotId);
 assert.equal((await request(base+'/imports/pending')).data.id,broken.id);
 const staged=await upload(csv,false);
 const commits=await Promise.all([0,1].map(()=>fetch(origin+base+'/import/'+staged.id+'/commit',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({mapping:staged.mapping,sourceColumns:staged.sourceColumns})})));
 assert.deepEqual(commits.map(r=>r.status).sort(),[200,404]);
 const vid=randomUUID(),vemail=`viewer-${vid}@misa.com.vn`;
 await pool.query("INSERT INTO users(id,email,password,name,global_role,must_change_password) VALUES($1,$2,$3,'Viewer QA','viewer',false)",[vid,vemail,hashPassword(password)]);
 const viewer=(await request('/api/login',{body:{email:vemail,password}})).cookie;
 await request(base+'/imports/pending',{auth:viewer,status:403});
 await request(base+'/import/'+broken.id+'/commit',{auth:viewer,body:{mapping:{}},status:403});
 assert.equal((await request(base+'/refresh',{auth:viewer,body:{}})).data.skipped,true);
 // A different editor may not see somebody else's staging payload.
 await pool.query("INSERT INTO members(event_id,user_id,role) VALUES($1,$2,'editor')",[event.id,vid]);
 assert.equal((await request(base+'/imports/pending',{auth:viewer})).data,null);
 const headers=['Chức vụ','Thời gian submit','Tên tiếp nhận'],mapping=guessMapping(headers);
 const source={enabled:true,url:'https://docs.google.com/spreadsheets/d/qa/edit',headerRow:1,mapping,sourceColumns:[],sourceHeaders:headers};
 await pool.query('UPDATE events SET source=$1,synced_at=null WHERE id=$2',[JSON.stringify(source),event.id]);
 let reads=0;const read=async()=>{reads++;await new Promise(r=>setTimeout(r,25));return {headers,raw:[{'Chức vụ':'IT','Thời gian submit':'17/10/2026','Tên tiếp nhận':'QA'}]};};
 const results=await Promise.all([0,1,2].map(()=>syncEvent(event.id,null,{automatic:true,minIntervalMs:15000,read})));
 assert.equal(reads,1);assert.equal(results.filter(r=>r.changed).length,1);
 const refreshed=(await request(base+'/report')).data;assert.ok(refreshed.sourceDimensions.some(d=>d.name==='Tên tiếp nhận'));const before=refreshed.snapshot.id;
 await assert.rejects(()=>syncEvent(event.id,null,{read:async()=>{throw Error('source offline');}}),/source offline/);
 assert.equal((await request(base+'/report')).data.snapshot.id,before);
 await pool.query("UPDATE events SET source=jsonb_set(source,'{enabled}','false') WHERE id=$1",[event.id]);
 assert.equal((await syncEvent(event.id,null,{automatic:true,read})).skipped,true);assert.equal(reads,1);
});
