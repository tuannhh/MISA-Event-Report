const norm=v=>String(v??'').trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/gi,'d').replace(/\s+/g,' ').toLowerCase();
const text=v=>String(v??'').trim();
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
function quantity(v){
 if(typeof v==='number')return Number.isInteger(v)&&v>=0&&v<=10000000?v:null;
 const s=text(v);if(!s)return 0;
 if(!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(s))return null;
 const n=Number(s.replace(/[.,]/g,''));return n<=10000000?n:null;
}
export function targetSheetName(name){return /(?:muc tieu|chi tieu|targets?|goals?)/.test(norm(name));}
// Input is strictly B:I, including only eight columns and at most 500 rows.
export function parseTargetPlan(matrix,label){
 if(matrix.length>500)throw Error('Sheet mục tiêu vượt giới hạn 500 dòng.');
 const header=matrix.slice(0,20).findIndex(r=>/don vi|bo phan|nhan vien|unit/.test(norm(r[0]))&&/tracking|utm_content/.test(norm(r[1]))&&/dang ky|muc tieu|target/.test(norm(r[3])));
 if(header<0)throw Error('Chưa nhận diện được cấu trúc B:I của Sheet mục tiêu (Đơn vị, Tracking, tỷ trọng, mục tiêu).');
 const rows=[];let group=null;const codes=new Set();
 for(let i=header+1;i<matrix.length;i++){
  const r=matrix[i],name=text(r[0]),code=text(r[1]);if(!name&&!code)continue;
  const target=quantity(r[3]);if(target===null)throw Error(`Mục tiêu không hợp lệ ở dòng ${i+1}.`);
  const kind=/^(tong cong|tong|total|grand total)$/.test(norm(name))?'total':code?'item':'group';
  if(kind==='item'){const key=norm(code);if(codes.has(key))throw Error('Sheet mục tiêu có mã tracking trùng nhau.');codes.add(key);}
  const id=String(i+1);if(kind!=='item')group=kind==='group'?id:null;
  const share=text(r[2]);const shareValue=typeof r[2]==='number'?r[2]*100:/^\d+(?:[.,]\d+)?%$/.test(share)?Number(share.replace('%','').replace(',','.')):null;
  rows.push({id,name,code,target,kind,parent:kind==='item'?group:null,share:shareValue});
 }
 if(!rows.some(r=>r.kind==='item'))throw Error('Sheet mục tiêu chưa có mã tracking để đối chiếu.');
 if(rows.filter(r=>r.kind==='total').length>1)throw Error('Sheet mục tiêu có nhiều dòng tổng cộng.');
 const leafSum=rows.filter(r=>r.kind==='item').reduce((n,r)=>n+r.target,0);
 const target=rows.find(r=>r.kind==='total')?.target??leafSum;
 return {version:1,label,range:'B:I',target,leafSum,rows};
}
export function summarizeTargetPlan(plan,selected,clevel){
 if(!plan)return null;
 const counts=new Map(),known=new Set(plan.rows.filter(r=>r.kind==='item').map(r=>norm(r.code)));
 for(const r of selected){const key=norm(r.utm_content??r.tracking),v=counts.get(key)||{count:0,clevel:0};v.count++;if(clevel(r))v.clevel++;counts.set(key,v);}
 const rows=plan.rows.map(r=>{
  const codes=r.kind==='item'?[norm(r.code)]:plan.rows.filter(t=>t.kind==='item'&&(r.kind==='total'||t.parent===r.id)).map(t=>norm(t.code));
  const count=codes.reduce((n,k)=>n+(counts.get(k)?.count||0),0),c=codes.reduce((n,k)=>n+(counts.get(k)?.clevel||0),0);
  return {...r,count,clevel:c,completion:pct(count,r.target),clevel_completion:pct(c,r.target)};
 });
 return {...plan,rows,unmatched:selected.filter(r=>!known.has(norm(r.utm_content??r.tracking))).length};
}
