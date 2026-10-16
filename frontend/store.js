import {destination,LOGIN_PATH,EVENTS_PATH,canEditEvent} from './navigation.js';
import {reactive,computed,watch} from 'vue';
export const number=v=>v==null?'—':Number(v).toLocaleString('vi-VN',{maximumFractionDigits:2});
export const percent=v=>v==null?'—':number(v)+'%';
export const dateText=v=>v?new Date(v).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}):'—';
export const isoDate=d=>d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
export const roleNames={viewer:'Viewer',editor:'Editor',admin:'Admin',super_admin:'Super admin'};
export const modeOptions=[{value:'online',label:'Online'},{value:'offline',label:'Offline'},{value:'both',label:'Cả online và offline'},{value:'unknown',label:'Chưa xác định'}];
export const eventModes=[{value:'online',label:'Online'},{value:'offline',label:'Offline'},{value:'hybrid',label:'Online và offline'}];
export const reports=[{value:'targets',label:'Mục tiêu & tracking'},{value:'positions',label:'Chức vụ'},{value:'sizes',label:'Quy mô nhân sự'},{value:'trend',label:'Xu hướng đăng ký'},{value:'sources',label:'Nguồn khách & tracking'}];
export const nav=[{key:'tong-quan',label:'Tổng quan',icon:'home'},{key:'du-lieu',label:'Dữ liệu đăng ký',icon:'list'},{key:'nguon-du-lieu',label:'Nhập & đồng bộ',icon:'upload'},{key:'muc-tieu',label:'Thiết lập sự kiện',icon:'settings'},{key:'thanh-vien',label:'Thành viên chỉnh sửa',icon:'users'},{key:'nhat-ky',label:'Nhật ký',icon:'clock'}];
export const s=reactive({user:null,ready:false,screen:'events',eventSearch:'',eventAccess:'all',events:[],event:null,route:location.pathname.split('/')[2]||'tong-quan',error:'',message:'',busy:false,reportBusy:false,report:null,snapshots:[],filters:{from:null,to:null,compareFrom:null,compareTo:null,snapshot:'',mode:'all'},sources:{},selected:reports.map(r=>r.value),showPercent:false,table:false,dimension:'',members:[],memberPreview:null,rows:[],rowTotal:0,page:1,query:'',audit:[],stage:null,preview:null,mapping:{},sourceColumns:[],autoSync:true,sheetUrl:'',sheetName:'',headerRow:'1',settings:null,eventDraft:null,clevelText:'',insight:null,dialog:'',editRow:null,member:{name:'',email:'',role:'editor'},newEvent:{name:'',event_date:null,mode:'hybrid'},appearance:false});
export const canEdit=computed(()=>['editor','admin','super_admin'].includes(s.event?.role));
export const canAdmin=computed(()=>['admin','super_admin'].includes(s.event?.role));
export const isSuper=computed(()=>s.user?.global_role==='super_admin');
export const title=computed(()=>nav.find(n=>n.key===s.route)?.label||'Sự kiện');
export async function api(url,body,method){const response=await fetch(url,{method:method||(body?'POST':'GET'),headers:body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===401)clearSession();throw Object.assign(Error(data.error||'Không thể xử lý yêu cầu.'),{status:response.status});}return response.json();}
export async function run(fn){if(s.busy)return;s.busy=true;s.error='';try{return await fn();}catch(e){s.error=e.message;}finally{s.busy=false;}}
export function notify(text){s.message=text;setTimeout(()=>s.message='',5000);}
const base=()=>`/api/events/${s.event.id}`;
export function params(){const q=new URLSearchParams();for(const [k,v] of Object.entries(s.filters))if(v)q.set(k,v instanceof Date?isoDate(v):v);if(!s.filters.compareFrom||!s.filters.compareTo){q.delete('compareFrom');q.delete('compareTo');}q.set('sourceFilters',JSON.stringify(s.sources));return q;}
let reportRequest=0;
export async function loadReport(){if(!s.event)return;const seq=++reportRequest;s.reportBusy=true;s.insight=null;s.error='';try{const result=await api(base()+'/report?'+params());if(seq!==reportRequest)return;s.report=result;if(!s.dimension||!result.sourceDimensions.some(d=>d.name===s.dimension))s.dimension=result.sourceDimensions[0]?.name||'';}catch(e){if(seq===reportRequest){s.report=null;s.error=e.message;}}finally{if(seq===reportRequest)s.reportBusy=false;}}
watch([()=>s.filters,()=>s.sources],()=>{if(s.event)loadReport();},{deep:true});
export function sourceValue(name,value){const next={...s.sources};if(value==='__ALL__')delete next[name];else next[name]=value;s.sources=next;}
export function resetFilters(){s.filters={from:null,to:null,compareFrom:null,compareTo:null,snapshot:'',mode:'all'};s.sources={};}
function pathTo(path,push=false){
  const surface=new URLSearchParams(location.search).get('surface');
  const next=path+(surface==='mobile'?'?surface=mobile':'');
  if(location.pathname+location.search!==next)history[push?'pushState':'replaceState']({},'',next);
}
function clearEvent(){
  reportRequest++;s.reportBusy=false;s.event=null;s.report=null;s.rows=[];s.members=[];s.snapshots=[];
  s.stage=null;s.preview=null;s.memberPreview=null;s.audit=[];s.insight=null;s.settings=null;s.eventDraft=null;s.dialog='';
}
function clearSession(){clearEvent();s.user=null;s.events=[];s.screen='login';pathTo(LOGIN_PATH);}
export async function initialize({afterLogin=false}={}){
  try{
    s.user=await api('/api/me');
    const next=destination(location.pathname,s.user,afterLogin);
    if(next.screen==='password'){clearEvent();s.screen=next.screen;pathTo(next.path);}
    else {if(next.screen==='events')s.screen='events';await loadEvents({afterLogin});}
  }catch(e){if(e.status!==401){s.error=e.message;if(!s.user){s.screen='login';pathTo(LOGIN_PATH);}}}finally{s.ready=true;}
}
export async function loadEvents({afterLogin=false}={}){
  s.events=await api('/api/events');
  const next=destination(location.pathname,s.user,afterLogin);
  if(next.screen==='event'){
    const chosen=s.events.find(e=>e.slug===next.slug);
    if(chosen){s.route=next.feature;await selectEvent(chosen.id,false);return;}
  }
  clearEvent();s.screen='events';pathTo(EVENTS_PATH);
  if(next.missing||next.screen==='event')s.error='Không tìm thấy sự kiện trong đường dẫn này. Hãy chọn sự kiện bên dưới.';
}
export async function showEventList(push=true){
  clearEvent();s.screen='events';s.error='';pathTo(EVENTS_PATH,push);
  s.events=await api('/api/events');
}
export async function openEvent(id){s.route='tong-quan';await selectEvent(id);}
export const filteredEvents=computed(()=>s.events.filter(e=>{
  const norm=v=>v.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/g,'d').toLowerCase();
  const matches=norm(e.name).includes(norm(s.eventSearch.trim()));
  return matches&&(s.eventAccess==='all'||(s.eventAccess==='edit'?canEditEvent(e):!canEditEvent(e)));
}));
export async function selectEvent(id,push=true){const event=s.events.find(e=>e.id===id);if(!event)return;reportRequest++;s.event=null;s.report=null;s.stage=null;s.preview=null;s.memberPreview=null;resetFilters();s.event=await api('/api/events/'+id);s.screen='event';s.settings=JSON.parse(JSON.stringify(s.event.settings));s.clevelText=s.settings.clevel.join('\n');s.eventDraft={name:s.event.name,event_date:s.event.event_date?new Date(s.event.event_date):null,mode:s.event.mode};s.selected=[...s.settings.reports];s.snapshots=await api(base()+'/snapshots');await navigate(s.route,push);}
export async function navigate(route,push=true){if(!nav.some(n=>n.key===route))route='tong-quan';s.route=route;s.error='';s.dialog='';if(s.event){const url='/'+s.event.slug+'/'+route;pathTo(url,push);if(route==='tong-quan')await loadReport();if(route==='du-lieu'){s.page=1;await loadRows();}if(route==='thanh-vien')await loadMembers();if(route==='nhat-ky'&&canAdmin.value)s.audit=await api(base()+'/audit');}}
window.addEventListener('popstate',()=>{s.error='';initialize();});
export async function login(email,password){await api('/api/login',{email:email.trim(),password});await initialize({afterLogin:true});}
export async function logout(){await api('/api/logout',{});clearSession();}
export async function changePassword(current,password){const forced=s.user.must_change_password;await api('/api/password',{current,password});s.dialog='';notify('Đã đổi mật khẩu.');await initialize({afterLogin:forced});}
export async function createEvent(){const e=await api('/api/events',{...s.newEvent,event_date:isoDate(s.newEvent.event_date)||null});s.events=await api('/api/events');s.route='tong-quan';await selectEvent(e.id);notify('Đã tạo sự kiện.');}
export async function saveEvent(){await api(base(),{...s.eventDraft,event_date:isoDate(s.eventDraft.event_date)||null},'PATCH');await api(base()+'/settings',{...s.settings,target:Number(s.settings.target),clevel:s.clevelText.split('\n').map(v=>v.trim()).filter(Boolean),targets:s.settings.targets.map(t=>({...t,target:Number(t.target)}))},'PUT');s.event=await api(base());s.events=await api('/api/events');notify('Đã lưu thiết lập sự kiện.');}
export async function loadMembers(){s.members=await api(base()+'/members');}
export async function addMember(){await api(base()+'/members',s.member);s.member={name:'',email:'',role:'editor'};s.dialog='';await loadMembers();notify('Đã cấp quyền. Tài khoản mới phải đổi mật khẩu lần đầu.');}
export async function previewMembers(files){if(!files[0])return;const form=new FormData();form.append('file',files[0]);s.memberPreview=await api(base()+'/members/import/preview',form);}
export async function importMembers(){await api(base()+'/members/import',{rows:s.memberPreview.rows});s.memberPreview=null;await loadMembers();notify('Đã nhập danh sách Editor cho sự kiện này.');}
export async function setRole(member,role){await api(base()+'/members/'+member.id,{role},'PATCH');await loadMembers();}
export async function removeMember(){await api(base()+'/members/'+s.editMember.id,null,'DELETE');s.dialog='';await loadMembers();notify('Đã thu hồi quyền chỉnh sửa. Tài khoản vẫn có quyền Viewer.');}
export async function loadRows(){const data=await api(base()+'/rows?'+new URLSearchParams({page:s.page,q:s.query}));s.rows=data.rows;s.rowTotal=data.total;}
export function editRow(row){s.editRow=Object.fromEntries(Object.keys(s.user.fields).map(k=>[k,row[k]||'']));s.editRow.submitted_at=row.submitted_at?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(row.submitted_at)).replace(',',''):'';s.editRow.attendance_mode=row.attendance_mode||'unknown';s.editRow.id=row.id;s.dialog='row';}
export async function saveRow(){await api(base()+'/rows/'+s.editRow.id,{snapshot:s.event.active_snapshot_id,row:s.editRow},'PATCH');s.event=await api(base());s.dialog='';await loadRows();notify('Đã tạo phiên dữ liệu mới.');}
export async function stageFile(files){if(!files[0])return;const form=new FormData();form.append('file',files[0]);form.append('sheetName',s.sheetName);form.append('headerRow',s.headerRow);await stageImport(await api(base()+'/import/file',form));}
export async function stageSheet(){await stageImport(await api(base()+'/import/sheet',{url:s.sheetUrl,sheetName:s.sheetName,headerRow:Number(s.headerRow)}));}
function stageImport(data){s.stage=data;s.mapping=data.mapping;s.sourceColumns=data.sourceColumns;s.preview=null;}
export async function aiMapping(){s.mapping=await api(base()+'/import/'+s.stage.id+'/ai',{});s.preview=null;}
export async function previewData(){s.preview=await api(base()+'/import/'+s.stage.id+'/preview',{mapping:s.mapping,sourceColumns:s.sourceColumns});}
export async function commitData(){await api(base()+'/import/'+s.stage.id+'/commit',{mapping:s.mapping,sourceColumns:s.sourceColumns,autoSync:s.autoSync});s.stage=null;s.preview=null;s.event=await api(base());s.snapshots=await api(base()+'/snapshots');await navigate('tong-quan');notify('Đã nhập dữ liệu.');}
export async function sync(){await api(base()+'/sync',{});s.event=await api(base());s.snapshots=await api(base()+'/snapshots');if(s.route==='tong-quan')await loadReport();notify('Đã kiểm tra dữ liệu mới nhất.');}
export async function toggleSync(enabled){await api(base()+'/source',{enabled},'PATCH');s.event=await api(base());}
export async function insights(){s.insight=await api(base()+'/insights?'+params(),{});}
export async function exportExcel(){const q=params();if(s.report?.snapshot.id)q.set('snapshot',s.report.snapshot.id);q.set('reports',s.selected.join(','));const res=await fetch(base()+'/export.xlsx?'+q);if(!res.ok)throw Error((await res.json()).error);download(await res.blob(),'MISA-Event-Report.xlsx');}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export async function exportPng(){const {default:html2canvas}=await import('html2canvas');const target=document.querySelector('[data-report]');const canvas=await html2canvas(target,{scale:2,backgroundColor:getComputedStyle(target).backgroundColor});canvas.toBlob(b=>download(b,'MISA-Event-Report.png'));}
setInterval(()=>{if(s.user&&!s.user.must_change_password&&s.event&&s.route==='tong-quan'&&!s.busy&&!document.hidden)loadReport();},300000);
