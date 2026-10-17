import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {randomUUID} from 'node:crypto';
import {pool} from '../server/db.js';
import {hashPassword} from '../server/auth.js';
import {syncEvent,readFile} from '../server/ingestion.js';
const book=async(target=10)=>{const wb=new ExcelJS.Workbook();const leads=wb.addWorksheet('Đăng ký');leads.addRow(['Họ và tên','Email','Số điện thoại','Mã số thuế','Chức vụ','Thời gian submit','utm_content','Gọi xác nhận','Tên công ty']);for(let i=0;i<105;i++)leads.addRow(['Khách QA '+i,`qa${i}@example.test`,912345678,'123456789',i%2?'CEO/Giám đốc':'IT','17/10/2026',i%2?'web':'email',i%3?'Đã liên hệ':'Chưa gọi',i%2?'Công ty A':'Công ty B']);const goals=wb.addWorksheet('Mục tiêu');goals.addRow(['','Đơn vị','Mã tracking','Tỷ trọng mục tiêu','Tổng SL Số đăng ký','Kết quả đăng ký','Hoàn thành','C-Level','Tỷ lệ']);goals.addRow(['','TỔNG CỘNG','','100%',target,999]);goals.addRow(['','Marketing','web','50%',target/2,999]);goals.addRow(['','Sales','email','50%',target/2,999]);return Buffer.from(await wb.xlsx.writeBuffer());};
test('Excel import discovers B:I goals without setup',async()=>{const parsed=await readFile(await book(),'qa.xlsx',undefined,1);assert.equal(parsed.targetPlan.target,10);assert.equal(parsed.targetPlan.rows.length,3);assert.equal(parsed.raw.length,105);});
test('target snapshots, plan-only updates, export, filters and failed sync stay atomic',{skip:!process.env.BASE_URL||!process.env.DATABASE_URL},async t=>{
 t.after(()=>pool.end());const id=randomUUID(),email=`goals-${id}@misa.com.vn`,password='Goals-QA-2026!';
 await pool.query("INSERT INTO users(id,email,password,name,global_role,must_change_password) VALUES($1,$2,$3,'Goal QA','super_admin',false)",[id,email,hashPassword(password)]);
 let cookie='';const req=async(path,body,method=body?'POST':'GET')=>{const r=await fetch(process.env.BASE_URL+path,{method,headers:{Cookie:cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});assert.ok(r.ok,await (!r.ok?r.text():Promise.resolve('')));if(path==='/api/login')cookie=r.headers.get('set-cookie').split(';')[0];return r.headers.get('content-type').includes('json')?r.json():r.arrayBuffer();};
 await req('/api/login',{email,password});const event=await req('/api/events',{name:'QA mục tiêu tự động',mode:'offline'}),base='/api/events/'+event.id;
 const file=await book();const form=new FormData();form.append('file',new Blob([file]),'qa.xlsx');form.append('automatic','true');await req(base+'/import/file',form);
 let report=await req(base+'/report');const first=report.snapshot.id;assert.equal(report.current.target,10);assert.equal(report.current.total,105);assert.equal(report.current.clevel,52);assert.equal(report.current.clevel_completion,520);assert.equal(report.current.targetPlan.rows[0].count,105);
 const filtered=await req(base+'/rows?'+new URLSearchParams({pageSize:'20',filters:JSON.stringify({position:['CEO/Giám đốc'],company:['Công ty A']})}));assert.equal(filtered.total,52);assert.equal(filtered.rows.length,20);assert.equal(filtered.hasTaxId,true);assert.equal(filtered.rows[0].tax_id,'0123456789');
 const sheet=await readFile(file,'qa.xlsx',undefined,1);sheet.targetPlan.target=20;sheet.targetPlan.rows[0].target=20;
 await pool.query('UPDATE events SET source=$1 WHERE id=$2',[JSON.stringify({enabled:true,url:'https://docs.google.com/spreadsheets/d/qa/edit',sheetName:'Đăng ký',mapping:sheet.mapping,sourceColumns:[],sourceHeaders:sheet.headers}),event.id]);
 await syncEvent(event.id,null,{read:async()=>sheet});report=await req(base+'/report');const second=report.snapshot.id;assert.notEqual(second,first);assert.equal(report.current.target,20);
 sheet.targetPlan.target=30;sheet.targetPlan.rows[0].target=30;await syncEvent(event.id,null,{read:async()=>sheet});assert.equal((await req(base+'/report')).current.target,30);assert.equal((await req(base+'/report?snapshot='+second)).current.target,20);assert.equal((await req(base+'/report?snapshot='+first)).current.target,10);
 const before=(await req(base+'/report')).snapshot.id;await assert.rejects(()=>syncEvent(event.id,null,{read:async()=>{throw Error('goal sheet unavailable');}}));assert.equal((await req(base+'/report')).snapshot.id,before);
 const xlsx=await req(base+'/export.xlsx?reports=targets');const wb=new ExcelJS.Workbook();await wb.xlsx.load(xlsx);assert.equal(wb.getWorksheet('Chi tiết mục tiêu').getCell('D2').value,30);assert.equal(wb.getWorksheet('Chi tiết mục tiêu').getCell('E2').value,105);
 await pool.query("UPDATE events SET source=jsonb_set(source,'{enabled}','false') WHERE id=$1",[event.id]);
 const update=new FormData();update.append('file',new Blob(['Họ và tên,Chức vụ,Thời gian submit,utm_content\nMới,CEO/Giám đốc,17/10/2026,web']),'update.csv');update.append('automatic','true');await req(base+'/import/file',update);
 report=await req(base+'/report');assert.equal(report.current.total,1);assert.equal(report.current.target,30);assert.equal(report.current.targetPlan.retained,true);assert.equal(report.current.targetPlan.rows[0].count,1);

});

test('AI target discovery validates metadata choice and falls back safely without inventing goals',async()=>{
 const {discoverTargetSheet}=await import('../server/ingestion.js');
 assert.deepEqual(await discoverTargetSheet(['Đăng ký','Kế hoạch triển khai'],{suggest:async names=>{assert.equal(names.length,2);return {name:'Kế hoạch triển khai'};}}),{name:'Kế hoạch triển khai',method:'gemini'});
 const invalid=await discoverTargetSheet(['Đăng ký'],{suggest:async()=>({name:'invented'})});assert.equal(invalid.name,null);assert.ok(invalid.notice);
 const fallback=await discoverTargetSheet(['Mục tiêu'],{suggest:async()=>{throw Error('must not call');}});assert.equal(fallback.name,'Mục tiêu');
});
