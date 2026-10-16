import {createHash} from 'node:crypto';
import {matchesSources, sourceBreakdowns} from './source-dimensions.js';
export const fields = {name:'Họ và tên',email:'Email',phone:'Số điện thoại',company:'Tên công ty',position:'Chức vụ',size:'Quy mô nhân sự',industry:'Lĩnh vực kinh doanh',submitted_at:'Thời gian submit',tracking:'Mã tracking / utm_content',source:'Nguồn Marketing'};
export const clean = v => String(v ?? '').trim();
export const norm = v => clean(v).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/đ/g,'d');
export const defaultSettings = () => ({target:1350,clevel:['CEO/Giám đốc','Chủ doanh nghiệp'],dedup:'none',targets:[],reports:['targets','positions','sizes','trend','sources']});
export function guessMapping(headers){
  const aliases={name:['ho va ten','lien he','name'],email:['email'],phone:['so dien thoai','phone'],company:['ten cong ty','company'],position:['chuc vu','position','job title'],size:['quy mo nhan su','size'],industry:['linh vuc kinh doanh','industry'],submitted_at:['thoi gian submit','submitted_at','timestamp','ngay dang ky'],tracking:['utm_content','ma tracking','utm_term'],source:['nguon marketing','utm_source','source']};
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
  if(!mapping.submitted_at||!mapping.position)throw Error('Cần chọn cột Thời gian submit và Chức vụ.');
  let invalidDates=0,missingPosition=0; const seen=new Set();let duplicateRows=0;
  const rows=raw.filter(r=>Object.values(r).some(v=>clean(v))).map((r,index)=>{
    const o=Object.fromEntries(Object.keys(fields).map(k=>[k,clean(r[mapping[k]])]));
    o.submitted_at=parseDate(r[mapping.submitted_at]); if(!o.submitted_at)invalidDates++;
    if(!o.position)missingPosition++;
    if(sourceColumns.length)o.source_details=Object.fromEntries(sourceColumns.map(h=>[h,clean(r[h])]));
    const fingerprint=createHash('sha256').update(JSON.stringify(o)).digest('hex');if(seen.has(fingerprint))duplicateRows++;seen.add(fingerprint);
    return {...o,id:String(index+1)};
  });
  if(!rows.length)throw Error('Không tìm thấy dòng dữ liệu.');
  return {rows,quality:{total:rows.length,invalidDates,missingPosition,duplicateRows}};
}
export function selectRows(rows,settings,from,to,sourceFilters={}){
  const seen=new Set();
  return rows.filter(r=>{
    if(settings.dedup!=='none') {const key=norm(r[settings.dedup]);if(key&&seen.has(key))return false;if(key)seen.add(key);}
    if(!matchesSources(r,sourceFilters))return false;
    if(!from&&!to)return true;
    if(!r.submitted_at)return false;
    const day=localDay(r.submitted_at);return (!from||day>=from)&&(!to||day<=to);
  });
}
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
export function summarize(rows,settings,from,to,sourceFilters={}){
  const selected=selectRows(rows,settings,from,to,sourceFilters), total=selected.length;
  const clevel=r=>settings.clevel.some(v=>norm(v)===norm(r.position));
  const nC=selected.filter(clevel).length;
  const group=key=>Object.entries(selected.reduce((a,r)=>{const k=r[key]||'Chưa xác định';a[k]=(a[k]||0)+1;return a;},Object.create(null))).map(([label,count])=>({label,count,percent:pct(count,total)})).sort((a,b)=>b.count-a.count);
  const targets=settings.targets.map(t=>{const matches=selected.filter(r=>norm(r.tracking)===norm(t.code));const c=matches.filter(clevel).length;return {...t,count:matches.length,clevel:c,completion:pct(matches.length,t.target),clevel_share:pct(c,matches.length),clevel_completion:pct(c,t.target)};});
  const days=Object.create(null);for(const r of selected)if(r.submitted_at){const day=localDay(r.submitted_at);days[day]=(days[day]||0)+1;}
  const known=new Set(settings.targets.map(t=>norm(t.code)));
  const groups=Object.values(targets.reduce((acc,t)=>{const k=t.group||'Chưa phân nhóm';acc[k]??={name:k,target:0,count:0,clevel:0,tracking_codes:0};acc[k].target+=t.target;acc[k].count+=t.count;acc[k].clevel+=t.clevel;acc[k].tracking_codes++;return acc;},Object.create(null)));
  return {total,clevel:nC,clevel_share:pct(nC,total),completion:pct(total,settings.target),target:settings.target,positions:group('position'),sizes:group('size'),sources:group('source'),sourceBreakdowns:sourceBreakdowns(selected),targets,groups,trend:Object.entries(days).sort().map(([label,count])=>({label,count})),unmapped:selected.filter(r=>!known.has(norm(r.tracking))).length,invalidDates:selected.filter(r=>!r.submitted_at).length,targetSum:settings.targets.reduce((s,t)=>s+t.target,0)};
}
