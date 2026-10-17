// Call attempts are source data, never instructions. Unknown text is not proof of a call.
const normalized=value=>String(value??'').trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/gi,'d').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
export const isCallColumn=header=>/^(goi xac nhan|trang thai goi|ket qua goi|call status|confirmation call)(\b|$)/.test(normalized(header));
export function callStatus(value){
  const v=normalized(value);
  if(!v||['chua goi','chua lien he','chua thuc hien','not called','pending','no','false','0'].includes(v))return 'not_called';
  if(['da goi','da lien he','da goi xac nhan','da xac nhan','called','contacted','confirmed','yes','true','1','khong nghe may','khong bat may','may ban','thue bao','tu choi','hen goi lai'].includes(v))return 'called';
  return 'unknown';
}
export function normalizeCalls(row,columns){
  if(!columns.length)return {call_status:'unknown',call_attempts:[]};
  const call_attempts=columns.map(column=>({column,value:String(row[column]??'').trim()}));
  const statuses=call_attempts.map(a=>callStatus(a.value));
  return {call_attempts,call_status:statuses.includes('called')?'called':statuses.includes('unknown')?'unknown':'not_called'};
}
