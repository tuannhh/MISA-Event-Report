import ExcelJS from 'exceljs';

export const reportTypes = ['targets','positions','sizes','trend','sources'];
const ratio = value => value == null ? null : value / 100;
const dateText = value => value ? value.split('-').reverse().join('/') : 'Toàn bộ';

// Text is assigned as a string, never as a formula or hyperlink from imported data.
export async function buildReportWorkbook(event, report, selected = reportTypes.filter(t=>t!=='targets')) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MISA Event Report';
  wb.created = new Date();
  function sheet(name, headers, rows, percentColumns = []) {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers); rows.forEach(row => ws.addRow(row));
    ws.views = [{state:'frozen',ySplit:1}];
    ws.autoFilter = {from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:headers.length}};
    ws.getRow(1).height=28;
    ws.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF265DCC'}};});
    ws.columns.forEach((col,i)=>{col.width=i===0?38:24;col.alignment={vertical:'middle',wrapText:true};});
    ws.eachRow((row,n)=>{if(n>1)row.eachCell(cell=>{if(typeof cell.value==='number')cell.numFmt='#,##0';});});
    percentColumns.forEach(index=>{for(let n=2;n<=ws.rowCount;n++)ws.getCell(n,index).numFmt='0.00%';});
    return ws;
  }
  const c=report.current, p=report.comparison;
  const filters=Object.entries(report.range.sourceFilters||{}).map(([k,v])=>`${k}: ${v||'Chưa xác định'}`).join('; ')||'Tất cả nguồn';
  const summary=sheet('Tổng quan',['Chỉ tiêu','Kỳ đang xem','Kỳ so sánh'],[
    ['Sự kiện',event.name,''],['Phiên dữ liệu',report.snapshot.label||'Chưa có dữ liệu',''],
    ['Từ ngày',dateText(report.range.from),p?dateText(report.range.compareFrom):''],
    ['Đến ngày',dateText(report.range.to),p?dateText(report.range.compareTo):''],
    ['Nguồn khách',filters,p?filters:''],['Múi giờ','Việt Nam (UTC+7)',''],
    ['Tổng lượt đăng ký',c.total,p?.total??null],['Tổng mục tiêu sự kiện',c.target,p?.target??null],
    ['Đăng ký C-Level',c.clevel,p?.clevel??null],
    ['Hoàn thành mục tiêu',ratio(c.completion),ratio(p?.completion)],
    ['Tỷ lệ C-Level (C-Level / mục tiêu)',ratio(c.clevel_completion),ratio(p?.clevel_completion)],
    ['C-Level / tổng đăng ký',ratio(c.clevel_share),ratio(p?.clevel_share)],
    ['Mục tiêu chi tiết cộng',c.targetSum,p?.targetSum??null],
    ['Công thức ô Tỷ lệ C-Level','Đăng ký C-Level / tổng mục tiêu sự kiện','Theo yêu cầu nghiệp vụ'],
    ['Quy tắc lịch sử','Dữ liệu và bảng mục tiêu theo phiên đã chọn; quy tắc lọc trùng hiện tại',''],
    ['Báo cáo được chọn',selected.join(', '),''],
    ['Khách đã được gọi',c.called??0,p?.called??null],
    ['Tỷ lệ gọi xác nhận (đã gọi / tổng đăng ký)',ratio(c.call_rate),ratio(p?.call_rate)],
    ['Chưa xác định trạng thái gọi',c.call_unknown??c.total,p?.call_unknown??null],
  ]);
  for(const row of [11,12,13,19])for(const col of [2,3])summary.getCell(row,col).numFmt='0.00%';
  function period(data,suffix){
    if(event.mode==='hybrid'&&data.attendance)sheet('Hình thức'+suffix,['Hình thức','Đăng ký','Tỷ lệ'],data.attendance.map(r=>[r.label,r.count,ratio(r.percent)]),[3]);
    const group=(key,title)=>sheet(title+suffix,['Nhóm','Đăng ký','Tỷ lệ / tổng đăng ký'],data[key].map(r=>[r.label,r.count,ratio(r.percent)]),[3]);
    if(selected.includes('positions'))group('positions','Chức vụ');
    if(selected.includes('sizes'))group('sizes','Quy mô');
    if(selected.includes('trend'))sheet('Theo ngày'+suffix,['Ngày submit','Đăng ký','Tỷ lệ / tổng đăng ký'],data.trend.map(r=>[dateText(r.label),r.count,data.total?r.count/data.total:null]),[3]);
    if(selected.includes('targets')){
      const plan=data.targetPlan;
      if(plan){const ws=sheet('Chi tiết mục tiêu'+suffix,['Đơn vị','Mã tracking','Tỷ trọng mục tiêu','Mục tiêu đăng ký','Kết quả đăng ký','Hoàn thành','Đăng ký C-Level','C-Level / mục tiêu'],plan.rows.map(r=>[r.name,r.code,ratio(r.share),r.target,r.count,ratio(r.completion),r.clevel,ratio(r.clevel_completion)]),[3,6,8]);
        plan.rows.forEach((r,i)=>{if(r.kind==='item')return;ws.getRow(i+2).eachCell(c=>{c.font={bold:true,color:{argb:'FF182230'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:r.kind==='total'?'FFEFF6FF':'FFECEDEF'}};});});
        ws.addRow(['Chưa khớp tracking','',null,null,plan.unmatched]);
        ws.addRow(['Tổng mục tiêu / cộng chi tiết','',null,plan.target,plan.leafSum]);
      }else sheet('Chi tiết mục tiêu'+suffix,['Trạng thái'],[['Chưa tìm thấy Sheet mục tiêu trong phiên dữ liệu này.']]);
    }
    if(selected.includes('sources'))sheet('Nguồn khách'+suffix,['Cột nguồn','Giá trị','Đăng ký','Tỷ lệ / tổng đăng ký'],data.sourceBreakdowns.flatMap(d=>d.values.map(r=>[d.name,r.label,r.count,ratio(r.percent)])),[4]);
  }
  period(c,'');if(p)period(p,' - So sánh');
  return wb;
}
