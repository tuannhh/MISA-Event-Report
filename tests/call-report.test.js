import test from 'node:test';
import assert from 'node:assert/strict';
import {guessMapping,normalizeRows,summarize,defaultSettings} from '../server/domain.js';
import {normalizeCalls,callStatus} from '../server/call-status.js';
import {buildReportWorkbook} from '../server/report-export.js';

test('multiple call attempts count each registration once; blanks and unfamiliar text are not successful calls',()=>{
 const columns=['Gọi xác nhận lần 1','Gọi xác nhận lần 2'];
 assert.equal(normalizeCalls({[columns[0]]:'Đã liên hệ',[columns[1]]:'Chưa gọi'},columns).call_status,'called');
 assert.equal(normalizeCalls({[columns[0]]:'Không nghe máy'},columns).call_status,'called');
 assert.equal(normalizeCalls({},columns).call_status,'not_called');
 assert.equal(normalizeCalls({},[]).call_status,'unknown');
 for(const v of ['Khách VIP','chưa xác nhận','unknown'])assert.equal(callStatus(v),'unknown');
 assert.equal(callStatus('not_called'),'not_called');
});
const raw=[
 {'Chức vụ':'IT','Thời gian submit':'14/10/2026','Gọi xác nhận lần 1':'Đã liên hệ','Gọi xác nhận lần 2':'Đã liên hệ','UTM_campaign':'A',utm_content:'content',utm_term:'term','Hình thức':'Online'},
 {'Chức vụ':'IT','Thời gian submit':'16/10/2026','Gọi xác nhận lần 1':'','Gọi xác nhận lần 2':'','UTM_campaign':'B','Hình thức':'Offline'},
 {'Chức vụ':'IT','Thời gian submit':'16/10/2026','Gọi xác nhận lần 1':'Ghi chú lạ','UTM_campaign':'A','Hình thức':'Cả hai'},
];
const rows=normalizeRows(raw,guessMapping(Object.keys(raw[0])),['UTM_campaign']).rows;
test('call KPI obeys date/source filters and historical unknowns, UTM content never falls back to term',()=>{
 const settings=defaultSettings();const all=summarize(rows,settings);
 assert.equal(all.called,1);assert.equal(all.call_rate,33.33);assert.equal(all.call_unknown,1);
 const filtered=summarize(rows,settings,'2026-10-14','2026-10-14',{'UTM_campaign':'A'});
 assert.equal(filtered.call_rate,100);assert.equal(filtered.total,1);
 assert.equal(summarize(rows,settings,'2026-10-16','2026-10-16').call_rate,0);
 assert.equal(summarize([],settings).call_rate,null);
 assert.equal(summarize([{position:'IT'}],settings).call_unknown,1);
 assert.equal(rows[0].utm_content,'content');
 assert.equal(normalizeRows([{'Chức vụ':'IT','Thời gian submit':'14/10/2026',utm_term:'term'}],guessMapping(['Chức vụ','Thời gian submit','utm_term'])).rows[0].utm_content,'');
});
test('hybrid cards contain only online/offline; both contributes to each and gaps have zero daily registrations',()=>{
 const report=summarize(rows,defaultSettings());
 assert.deepEqual(report.attendance.map(r=>[r.value,r.count]),[['online',2],['offline',2]]);
 assert.deepEqual(report.trend.map(r=>r.count),[1,0,2]);
 assert.equal(summarize(rows,defaultSettings(),undefined,undefined,{},'online').total,2);
});
test('Excel exports call numerator/rate and omits attendance for single-mode events and default targets',async()=>{
 const current=summarize(rows,defaultSettings());
 const report={snapshot:{},range:{},current,comparison:current};
 for(const mode of ['online','offline']){
  const wb=await buildReportWorkbook({name:'QA',mode},report);
  assert.equal(wb.getWorksheet('Hình thức'),undefined);assert.equal(wb.getWorksheet('Mục tiêu'),undefined);
  const ws=wb.getWorksheet('Tổng quan');assert.equal(ws.getCell('B18').value,1);assert.equal(ws.getCell('B19').value,.3333);assert.equal(ws.getCell('C19').value,.3333);
 }
});
