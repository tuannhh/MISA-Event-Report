import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import ExcelJS from 'exceljs';
const origin=process.env.BASE_URL;
test('roles, forced password, membership Excel, tenant grants, snapshots, modes and exports',{skip:!origin},async()=>{
 const suffix=randomBytes(4).toString('hex');let superCookie='';
 async function req(path,{cookie=superCookie,method='GET',body,status=200}={}){const r=await fetch(origin+path,{method,headers:{Cookie:cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const post=(path,body,opts={})=>req(path,{method:'POST',body,...opts});
 await req('/api/events',{cookie:'',status:401});
 for(const path of ['/log-in','/su-kien','/change-password']){const page=await fetch(origin+path);assert.equal(page.status,200);assert.match(await page.text(),/assets\/index/);}
 const initial=process.env.TEST_PASSWORD,changed='QA-Changed-2026!';
 let auth=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.TEST_EMAIL,password:initial})});
 if(!auth.ok)auth=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.TEST_EMAIL,password:changed})});assert.equal(auth.status,200);superCookie=auth.headers.get('set-cookie').split(';')[0];
 if((await req('/api/me')).data.must_change_password){await req('/api/events',{status:403});superCookie=(await post('/api/password',{current:initial,password:changed})).cookie;}
 const a=(await post('/api/events',{name:'QA Event '+suffix,mode:'hybrid'},{status:201})).data,b=(await post('/api/events',{name:'QA Other '+suffix,mode:'online'},{status:201})).data;
 const A='/api/events/'+a.id,B='/api/events/'+b.id;
 assert.match(a.slug,/-[a-f0-9]{6}$/);const deep=await fetch(origin+'/'+a.slug+'/thanh-vien');assert.equal(deep.status,200);assert.match(await deep.text(),/assets\/index/);
 const settings=(await req(A)).data.settings;settings.target=10;await req(A+'/settings',{method:'PUT',body:settings});
 await post(A+'/members',{name:'Viewer',email:`viewer-${suffix}@misa.com.vn`,role:'viewer'},{status:201});
 let viewer=(await post('/api/login',{email:`viewer-${suffix}@misa.com.vn`,password:process.env.TEST_MEMBER_PASSWORD},{cookie:''})).cookie;
 await req(A+'/report',{cookie:viewer,status:403});await post('/api/password',{current:process.env.TEST_MEMBER_PASSWORD,password:'weak-password'},{cookie:viewer,status:400});
 const expired=viewer;viewer=(await post('/api/password',{current:process.env.TEST_MEMBER_PASSWORD,password:'Viewer-New-2026!'},{cookie:viewer})).cookie;await req('/api/me',{cookie:expired,status:401});
 assert.ok((await req('/api/events',{cookie:viewer})).data.some(e=>e.id===b.id));await req(B+'/report',{cookie:viewer});
 await req(A+'/settings',{method:'PUT',body:settings,cookie:viewer,status:403});await post('/api/events',{name:'Forbidden'},{cookie:viewer,status:403});
 await post(A+'/members',{name:'Bad',email:'bad@misa.com.vn.evil.test'},{status:400});
 await post(A+'/members',{name:'Admin',email:`admin-${suffix}@unit.misa.com.vn`,role:'admin'},{status:201});
 let admin=(await post('/api/login',{email:`admin-${suffix}@unit.misa.com.vn`,password:process.env.TEST_MEMBER_PASSWORD},{cookie:''})).cookie;admin=(await post('/api/password',{current:process.env.TEST_MEMBER_PASSWORD,password:'Admin-New-2026!'},{cookie:admin})).cookie;
 await post(A+'/members',{name:'Escalation',email:`bad-${suffix}@misa.com.vn`,role:'admin'},{cookie:admin,status:403});
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Members');ws.addRow(['Họ và tên','Email']);ws.addRow(['Editor',`editor-${suffix}@misa.com.vn`]);ws.addRow(['Existing Viewer',`viewer-${suffix}@misa.com.vn`]);const form=new FormData();form.append('file',new Blob([await wb.xlsx.writeBuffer()]),'members.xlsx');
 const preview=(await post(A+'/members/import/preview',form,{cookie:admin})).data;assert.equal(preview.errors.length,0);assert.equal(preview.rows.length,2);await post(A+'/members/import',{rows:preview.rows},{cookie:admin});await post(B+'/members/import',{rows:preview.rows});
 await post('/api/login',{email:`viewer-${suffix}@misa.com.vn`,password:'Viewer-New-2026!'},{cookie:''});
 let editor=(await post('/api/login',{email:`editor-${suffix}@misa.com.vn`,password:process.env.TEST_MEMBER_PASSWORD},{cookie:''})).cookie;editor=(await post('/api/password',{current:process.env.TEST_MEMBER_PASSWORD,password:'Editor-New-2026!'},{cookie:editor})).cookie;
 await req(A+'/settings',{method:'PUT',body:settings,cookie:editor});await post(A+'/members',{name:'No',email:'no@misa.com.vn'},{cookie:editor,status:403});await req(B,{method:'PATCH',cookie:editor,body:{name:'QA Edited '+suffix,mode:'offline',event_date:'2026-10-28'}});
 const leads=new FormData();leads.append('file',new Blob(['Họ và tên,Chức vụ,Thời gian submit,utm_content,Hình thức tham dự\nAn,CEO/Giám đốc,14/10/2026,a,Online\nBinh,IT,15/10/2026,b,Offline\nChi,Chủ doanh nghiệp,15/10/2026,a,Cả hai\nDung,IT,bad,b,']), 'leads.csv');
 const stage=(await post(A+'/import/file',leads,{cookie:editor})).data;await post(B+'/import/'+stage.id+'/commit',{mapping:stage.mapping},{cookie:editor,status:404});const snapshot=(await post(A+'/import/'+stage.id+'/commit',{mapping:stage.mapping},{cookie:editor})).data.id;
 const report=(await req(A+'/report')).data;assert.equal(report.current.total,4);assert.deepEqual(report.current.modes.map(m=>m.count),[1,1,1,1]);
 const filtered=(await req(A+'/report?sourceFilters='+encodeURIComponent(JSON.stringify({utm_content:'a'})))).data;assert.equal(filtered.current.total,2);assert.equal(filtered.current.clevel,2);
 assert.equal((await req(A+'/report?mode=online')).data.current.total,1);assert.equal((await req(A+'/report?mode=unknown')).data.current.total,1);
 const comparison=(await req(A+'/report?from=2026-10-14&to=2026-10-14&compareFrom=2026-10-15&compareTo=2026-10-15')).data;assert.equal(comparison.current.total,1);assert.equal(comparison.comparison.total,2);
 await req(B+'/report?snapshot='+snapshot,{status:404});await req(A+'/report?sourceFilters=%7Bbad',{status:400});
 const exported=await fetch(origin+A+'/export.xlsx?mode=online',{headers:{Cookie:editor}});assert.equal(exported.status,200);const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await exported.arrayBuffer()));assert.equal(book.getWorksheet('Hình thức').getCell('B2').value,1);
 const member=(await req(A+'/members')).data.find(m=>m.email===`editor-${suffix}@misa.com.vn`);await req(A+'/members/'+member.id,{method:'DELETE',cookie:admin});await req(A+'/settings',{method:'PUT',body:settings,cookie:editor,status:403});await req(B+'/settings',{method:'PUT',body:settings,cookie:editor});const rights=(await req('/api/events',{cookie:editor})).data;assert.equal(rights.find(e=>e.id===a.id).role,'viewer');assert.equal(rights.find(e=>e.id===b.id).role,'editor');
 await post('/api/logout',{}, {cookie:editor});await req('/api/me',{cookie:editor,status:401});
});
