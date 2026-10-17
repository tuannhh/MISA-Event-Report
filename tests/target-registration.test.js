import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTargetPlan,summarizeTargetPlan} from '../server/target-plan.js';
import {phoneText,taxText} from '../server/identifiers.js';
import {registrationQuery} from '../server/registration-query.js';
import {defaultSettings,selectRows,summarize,parseDate} from '../server/domain.js';
const matrix=[['BẢNG MỤC TIÊU'],['','','MỤC TIÊU'],['Đơn vị','Mã tracking','','Tổng SL Số đăng ký'],['TỔNG CỘNG','','100%','1.350',999],['MARKETING','web','15%',200,999],['KINH DOANH','','30%',400],['A','a','',200],['B','b','',200],['BÁN LẺ','','',1050],['C','c','',1050]];
test('target plan reads B:I, preserves hierarchy and explicit total, recomputes stale actuals',()=>{
 const plan=parseTargetPlan(matrix,'Mục tiêu');assert.equal(plan.target,1350);assert.equal(plan.leafSum,1650);assert.equal(plan.rows[0].share,100);
 const result=summarizeTargetPlan(plan,[{utm_content:'A',position:'CEO'},{utm_content:'b'},{utm_content:'unknown'}],r=>r.position==='CEO');
 assert.equal(result.rows[0].count,2);assert.equal(result.rows[2].count,2);assert.equal(result.rows[2].clevel,1);assert.equal(result.rows[3].clevel_completion,0.5);assert.equal(result.unmatched,1);
 assert.throws(()=>parseTargetPlan([...matrix,['duplicate','a','',50]],'bad'),/trùng/);
 assert.throws(()=>parseTargetPlan([['wrong']], 'bad'),/cấu trúc/);
 assert.throws(()=>parseTargetPlan([...matrix,['bad','d','','=SUM(A1)']], 'bad'),/không hợp lệ/);
});
test('identifier repair preserves valid zeroes and foreign numbers; normalized phones deduplicate',()=>{
 assert.equal(phoneText(912345678),'0912345678');assert.equal(phoneText('+84 912 345 678'),'0912345678');assert.equal(phoneText('0912345678'),'0912345678');assert.equal(phoneText('+1 202 555 0143'),'+1 202 555 0143');assert.equal(phoneText('123'),'123');
 assert.equal(taxText('123456789'),'0123456789');assert.equal(taxText('123456789-001'),'0123456789-001');assert.equal(taxText('1234567890'),'1234567890');assert.equal(taxText('1234567890123'),'1234567890123');
 const rows=[{phone:'912345678'},{phone:'+84912345678'},{phone:''},{phone:''}];assert.equal(selectRows(rows,{...defaultSettings(),dedup:'phone'}).length,3);assert.equal(selectRows(rows,defaultSettings()).length,4);
 const stats=summarize([{position:'CEO'},{position:'IT'}],{...defaultSettings(),clevel:['CEO'],target:10});assert.equal(stats.clevel_completion,10);assert.equal(stats.completion,20);assert.equal(stats.clevel_share,50);
});
test('registration filters OR within a field, AND across fields, inclusive VN dates and paging after filters',()=>{
 const rows=Array.from({length:105},(_,i)=>({id:String(i),position:i%2?'CEO':'IT',company:'A',call_status:i%3?'called':'not_called',utm_content:i%2?'web':'email',phone:'912345678',submitted_at:parseDate('17/10/2026 23:59:59')}));
 let data=registrationQuery(rows,{page:2,pageSize:50});assert.equal(data.rows.length,50);assert.equal(data.total,105);assert.equal(data.rows[0].id,'50');assert.equal(data.rows[0].phone,'0912345678');
 data=registrationQuery(rows,{page:20,pageSize:100,from:'2026-10-17',to:'2026-10-17',filters:JSON.stringify({position:['CEO','IT'],utm_content:['web'],company:['A']})});assert.equal(data.page,1);assert.equal(data.total,52);assert.equal(data.rows.length,52);
 assert.equal(registrationQuery(rows,{to:'2026-10-16'}).total,0);
 assert.throws(()=>registrationQuery(rows,{pageSize:25}));assert.throws(()=>registrationQuery(rows,{filters:'{"password":["x"]}'}));assert.throws(()=>registrationQuery(rows,{from:'2026-10-18',to:'2026-10-17'}));
});
