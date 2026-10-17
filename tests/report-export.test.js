import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {defaultSettings,normalizeRows,summarize,selectRows} from '../server/domain.js';
import {guessSourceColumns,validateSourceColumns,sourceBreakdowns} from '../server/source-dimensions.js';
import {buildReportWorkbook} from '../server/report-export.js';

const mapping={name:'Tên',email:'Email',position:'Chức vụ',submitted_at:'Ngày',source:'Kênh'};
const raw=[
  {'Tên':'A',Email:'a@example.test','Chức vụ':'CEO/Giám đốc','Ngày':'14/10/2026','Kênh':'Đối tác','Chiến dịch':'Tháng 10'},
  {'Tên':'B',Email:'b@example.test','Chức vụ':'IT','Ngày':'15/10/2026','Kênh':'Đối tác','Chiến dịch':'Tháng 11'},
  {'Tên':'C',Email:'c@example.test','Chức vụ':'IT','Ngày':'15/10/2026','Kênh':'','Chiến dịch':'Tháng 10'},
];
const rows=normalizeRows(raw,mapping,['Kênh','Chiến dịch']).rows;
test('source detection preserves multiple dimensions and rejects invented/PII columns',()=>{
  assert.deepEqual(guessSourceColumns(['Email','utm_source','Kênh','Đối tác giới thiệu','Họ và tên']),['utm_source','Kênh','Đối tác giới thiệu']);
  assert.throws(()=>validateSourceColumns(['Email'],['Email']),/hợp lệ/);
  assert.throws(()=>validateSourceColumns(['Kênh'],['Không tồn tại']),/hợp lệ/);
  assert.throws(()=>validateSourceColumns(['Kênh'],['Kênh','Kênh']),/hợp lệ/);
  assert.equal(rows[0].source_details['Chiến dịch'],'Tháng 10');
  assert.equal(sourceBreakdowns(rows).find(d=>d.name==='Kênh').values.find(v=>v.value==='').count,1);
});
test('combined source filters apply after dedup and with Vietnamese date ranges',()=>{
  const settings={...defaultSettings(),target:10};
  const filtered=summarize(rows,settings,undefined,undefined,{'Kênh':'Đối tác','Chiến dịch':'Tháng 10'});
  assert.equal(filtered.total,1);assert.equal(filtered.clevel,1);assert.equal(filtered.completion,10);
  assert.equal(summarize(rows,settings,'2026-10-15','2026-10-15',{'Kênh':'Đối tác'}).total,1);
  assert.equal(summarize(rows,settings,undefined,undefined,{'Kênh':''}).total,1);
  assert.equal(summarize(rows,settings,undefined,undefined,{'Kênh':'Không có'}).total,0);
  assert.equal(selectRows([rows[0],{...rows[0],source_details:{Kênh:'Online'}}],{...settings,dedup:'email'},undefined,undefined,{Kênh:'Online'}).length,0);
  assert.equal(sourceBreakdowns([{source:'Cũ',tracking:'a'}])[0].values.length,1);
});
test('Excel contains selected reports, real numeric cells, both periods and inert imported text',async()=>{
  const settings={...defaultSettings(),target:1350};
  const current=summarize(rows,settings,undefined,undefined,{'Kênh':'Đối tác'});
  const comparison=summarize(rows,settings,'2026-10-15','2026-10-15',{'Kênh':'Đối tác'});
  current.sourceBreakdowns[0].values[0].label='=HYPERLINK("https://example.test","text")';
  const wb=await buildReportWorkbook({name:'QA',mode:'hybrid'}, {snapshot:{label:'QA input'},range:{sourceFilters:{Kênh:'Đối tác'},compareFrom:'2026-10-15',compareTo:'2026-10-15'},current,comparison},['sources','positions']);
  const read=new ExcelJS.Workbook();await read.xlsx.load(await wb.xlsx.writeBuffer());
  assert.deepEqual(read.worksheets.map(s=>s.name),['Tổng quan','Hình thức','Chức vụ','Nguồn khách','Hình thức - So sánh','Chức vụ - So sánh','Nguồn khách - So sánh']);
  const summary=read.getWorksheet('Tổng quan');assert.equal(summary.getCell('B8').value,2);assert.equal(summary.getCell('C8').value,1);
  assert.equal(read.getWorksheet('Hình thức').rowCount,3);assert.equal(summary.getCell('B19').numFmt,'0.00%');
  assert.equal(summary.getCell('B12').value,current.clevel_completion/100);assert.equal(summary.getCell('B12').numFmt,'0.00%');
  assert.equal(read.getWorksheet('Nguồn khách').getCell('B2').type,ExcelJS.ValueType.String);
  assert.equal(read.getWorksheet('Nguồn khách').getCell('B2').formula,undefined);
});
test('KPI registration completion and zero denominators remain deterministic',async()=>{
  const settings={...defaultSettings(),target:1350};
  assert.equal(summarize(Array.from({length:134},()=>({position:'IT'})),settings).completion,9.93);
  const current=summarize([],{...settings,target:0});
  const wb=await buildReportWorkbook({name:'Empty'},{snapshot:{},range:{},current,comparison:null},[]);
  assert.equal(wb.getWorksheet('Tổng quan').getCell('B12').value,null);
  assert.equal(wb.worksheets.length,1);
});
