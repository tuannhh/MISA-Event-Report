import {z} from 'zod';
import {norm,localDay,parseDate} from './domain.js';
import {identifiers} from './identifiers.js';
import {fail} from './auth.js';
const keys=['call_status','position','utm_content','company'];
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>parseDate(v)!==null);
export function registrationQuery(input,query){
 const pageSize=z.coerce.number().refine(v=>[20,50,100].includes(v)).parse(query.pageSize||20);
 const requested=z.coerce.number().int().min(1).max(10000).parse(query.page||1),q=z.string().max(150).parse(query.q||'');
 let raw={};try{raw=JSON.parse(z.string().max(20000).parse(query.filters||'{}'));}catch{fail(400,'Bộ lọc đăng ký không hợp lệ.');}
 const filters=z.object(Object.fromEntries(keys.map(k=>[k,z.array(z.string().max(1000)).max(100).optional()]))).strict().parse(raw);
 const from=day.optional().parse(query.from),to=day.optional().parse(query.to);if(from&&to&&from>to)fail(400,'Ngày bắt đầu phải trước ngày kết thúc.');
 const rows=input.map(r=>({...identifiers(r),call_status:r.call_status||'unknown',utm_content:r.utm_content??Object.entries(r.source_details||{}).find(([k])=>norm(k)==='utm_content')?.[1]??''}));
 const options=Object.fromEntries(keys.map(k=>[k,[...new Set(rows.map(r=>r[k]||''))].sort((a,b)=>a.localeCompare(b,'vi'))]));
 const selected=rows.filter(r=>(!q||[r.name,r.company,r.email,r.phone,r.tracking,r.utm_content,r.tax_id].some(v=>norm(v).includes(norm(q))))&&keys.every(k=>!filters[k]?.length||filters[k].includes(r[k]||''))&&(!from&&!to||r.submitted_at&&(!from||localDay(r.submitted_at)>=from)&&(!to||localDay(r.submitted_at)<=to)));
 const page=Math.min(requested,Math.max(1,Math.ceil(selected.length/pageSize)));
 return {rows:selected.slice((page-1)*pageSize,page*pageSize),total:selected.length,page,pageSize,options,hasTaxId:rows.some(r=>r.tax_id)};
}
