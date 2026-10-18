import {destination,LOGIN_PATH,EVENTS_PATH,canEditEvent} from './navigation.js';
import {reactive,computed,watch,nextTick} from 'vue';
export const number=v=>v==null?'—':Number(v).toLocaleString('vi-VN',{maximumFractionDigits:2});
export const percent=v=>v==null?'—':number(v)+'%';
export const dateText=v=>v?new Date(v).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}):'—';
export const isoDate=d=>d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
export const roleNames={viewer:'Viewer',editor:'Editor',admin:'Admin',super_admin:'Super admin'};
export const modeOptions=[{value:'online',label:'Online'},{value:'offline',label:'Offline'},{value:'both',label:'Cả online và offline'},{value:'unknown',label:'Chưa xác định'}];
export const eventModes=[{value:'online',label:'Online'},{value:'offline',label:'Offline'},{value:'hybrid',label:'Online và offline'}];
export const callOptions=[{value:'called',label:'Đã gọi'},{value:'not_called',label:'Chưa gọi'},{value:'unknown',label:'Chưa xác định'}];
export const utmContent=row=>row.utm_content??Object.entries(row.source_details||{}).find(([k])=>k.toLowerCase()==='utm_content')?.[1]??'';
export const responseOptions=[{value:'pending',label:'Chưa có phản hồi'},{value:'confirmed',label:'Xác nhận tham dự'},{value:'declined',label:'Không tham dự'},{value:'no_answer',label:'Không nghe máy'},{value:'call_back',label:'Hẹn liên hệ lại'}];
export const responseLabel=value=>responseOptions.find(o=>o.value===value)?.label||'—';
export const modeLabel=value=>modeOptions.find(o=>o.value===value)?.label||'Chưa xác định';
export const callLabel=value=>callOptions.find(o=>o.value===value)?.label||'Chưa có dữ liệu';
export const reports=[{value:'positions',label:'Chức vụ'},{value:'sizes',label:'Quy mô nhân sự'},{value:'trend',label:'Xu hướng đăng ký'},{value:'sources',label:'Nguồn khách & tracking'}];
export const nav=[{key:'tong-quan',label:'Tổng quan',icon:'home'},{key:'du-lieu',label:'Dữ liệu đăng ký',icon:'list'},{key:'nguon-du-lieu',label:'Nhập & đồng bộ',icon:'upload'},{key:'muc-tieu',label:'Thiết lập sự kiện',icon:'settings'},{key:'thanh-vien',label:'Thành viên',icon:'users'},{key:'nhat-ky',label:'Nhật ký',icon:'clock'}];
export const s=reactive({user:null,ready:false,screen:'events',eventSearch:'',eventAccess:'all',events:[],event:null,route:location.pathname.split('/')[2]||'tong-quan',error:'',message:'',busy:false,reportBusy:false,report:null,snapshots:[],filters:{from:null,to:null,compareFrom:null,compareTo:null,snapshot:'',mode:'all'},sources:{},selected:reports.map(r=>r.value),showPercent:true,exportingImage:false,table:false,reportTab:'chart',dimension:'',members:[],memberPreview:null,rows:[],rowTotal:0,page:1,pageSize:20,rowOptions:{},rowHasTaxId:false,rowFilters:{},rowFrom:null,rowTo:null,rowsBusy:false,query:'',audit:[],stage:null,preview:null,mapping:{},sourceColumns:[],autoSync:true,sheetUrl:'',sheetName:'*',headerRow:'0',importMode:'auto',registrationStatus:'registered',eventSources:[],conflicts:null,contactHistory:[],contactTotal:0,contactPage:1,contactPageSize:20,contactDraft:null,settings:null,eventDraft:null,clevelText:'',insight:null,insightBusy:false,insightError:'',refreshBusy:false,refreshWarning:'',dialog:'',editRow:null,member:{name:'',email:'',role:'editor'},newEvent:{name:'',event_date:null,mode:'hybrid'},appearance:false});
export const canEdit=computed(()=>['editor','admin','super_admin'].includes(s.event?.role));
export const canAdmin=computed(()=>['admin','super_admin'].includes(s.event?.role));
export const isSuper=computed(()=>s.user?.global_role==='super_admin');
export const title=computed(()=>nav.find(n=>n.key===s.route)?.label||'Sự kiện');
export async function api(url,body,method){const response=await fetch(url,{method:method||(body?'POST':'GET'),headers:body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===401)clearSession();throw Object.assign(Error(data.error||'Không thể xử lý yêu cầu.'),{status:response.status});}return response.json();}
export async function run(fn){if(s.busy)return;s.busy=true;s.error='';try{return await fn();}catch(e){s.error=e.message;}finally{s.busy=false;}}
export function notify(text){s.message=text;setTimeout(()=>s.message='',5000);}
const base=()=>`/api/events/${s.event.id}`;
export function params(){const q=new URLSearchParams();for(const [k,v] of Object.entries(s.filters))if(v)q.set(k,v instanceof Date?isoDate(v):v);if(!s.filters.compareFrom||!s.filters.compareTo){q.delete('compareFrom');q.delete('compareTo');}q.set('sourceFilters',JSON.stringify(s.sources));return q;}
let reportRequest=0,insightRequest=0,insightTimer;
const insightCache=new Map(),insightPending=new Map();
export async function loadReport(){if(!s.event)return;const seq=++reportRequest;s.reportBusy=true;s.insight=null;s.insightError='';s.insightBusy=false;insightRequest++;clearTimeout(insightTimer);s.error='';try{const result=await api(base()+'/report?'+params());if(seq!==reportRequest)return;s.report=result;if(!s.dimension||!result.sourceDimensions.some(d=>d.name===s.dimension))s.dimension=result.sourceDimensions.find(d=>d.name.toLowerCase()==='utm_campaign')?.name||result.sourceDimensions[0]?.name||'';}catch(e){if(seq===reportRequest){s.report=null;s.error=e.message;}}finally{if(seq===reportRequest)s.reportBusy=false;}}
watch([()=>s.filters,()=>s.sources],()=>{if(s.event)loadReport();},{deep:true});
export function sourceValue(name,value){const next={...s.sources};if(value==='__ALL__')delete next[name];else next[name]=value;s.sources=next;}
export function resetFilters(){s.filters={from:null,to:null,compareFrom:null,compareTo:null,snapshot:'',mode:'all'};s.sources={};}
function pathTo(path,push=false){
  const surface=new URLSearchParams(location.search).get('surface');
  const next=path+(surface==='mobile'?'?surface=mobile':'');
  if(location.pathname+location.search!==next)history[push?'pushState':'replaceState']({},'',next);
}
function clearEvent(){
  reportRequest++;insightRequest++;clearTimeout(insightTimer);s.reportBusy=false;s.refreshBusy=false;s.insightBusy=false;s.refreshWarning='';s.event=null;s.report=null;s.rows=[];s.members=[];s.snapshots=[];
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
export async function selectEvent(id,push=true){rowsRequest++;clearTimeout(rowFilterTimer);s.rowFilters={};s.rowFrom=null;s.rowTo=null;s.query='';s.page=1;s.sheetUrl='';s.sheetName='*';s.headerRow='0';s.importMode='auto';s.registrationStatus='registered';s.eventSources=[];s.conflicts=null;s.reportTab='chart';s.table=false;const event=s.events.find(e=>e.id===id);if(!event)return;reportRequest++;insightRequest++;clearTimeout(insightTimer);s.insightBusy=false;s.refreshBusy=false;s.refreshWarning='';s.event=null;s.report=null;s.stage=null;s.preview=null;s.memberPreview=null;resetFilters();s.event=await api('/api/events/'+id);s.screen='event';s.settings=JSON.parse(JSON.stringify(s.event.settings));s.settings.channelTargets??={online:null,offline:null};s.clevelText=s.settings.clevel.join('\n');s.eventDraft={name:s.event.name,event_date:s.event.event_date?new Date(s.event.event_date):null,mode:s.event.mode};s.dimension='';s.selected=s.settings.reports.filter(v=>reports.some(r=>r.value===v));s.snapshots=await api(base()+'/snapshots');
if(canEdit.value&&!s.event.active_snapshot_id){
  const pending=await api(base()+'/imports/pending');
  if(pending){await stageImport(pending);if(!s.stage)return;s.route='nguon-du-lieu';}
}
await navigate(s.route,push);}
export async function navigate(route,push=true){if(!nav.some(n=>n.key===route))route='tong-quan';s.route=route;s.error='';s.dialog='';if(s.event){const url='/'+s.event.slug+'/'+route;pathTo(url,push);if(route==='tong-quan'){await loadReport();void refreshLatest();}if(route==='du-lieu'){s.page=1;await loadRows();}if(route==='thanh-vien')await loadMembers();if(route==='nguon-du-lieu')await loadSources();}}
window.addEventListener('popstate',()=>{s.error='';initialize();});
export async function login(email,password){await api('/api/login',{email:email.trim(),password});await initialize({afterLogin:true});}
export async function logout(){await api('/api/logout',{});clearSession();}
export async function changePassword(current,password){const forced=s.user.must_change_password;await api('/api/password',{current,password});s.dialog='';notify('Đã đổi mật khẩu.');await initialize({afterLogin:forced});}
export async function createEvent(){const e=await api('/api/events',{...s.newEvent,event_date:isoDate(s.newEvent.event_date)||null});s.events=await api('/api/events');s.route='tong-quan';await selectEvent(e.id);s.newEvent={name:'',event_date:null,mode:'hybrid'};notify('Đã tạo sự kiện.');}
export async function saveEvent(){await api(base(),{...s.eventDraft,event_date:isoDate(s.eventDraft.event_date)||null},'PATCH');await api(base()+'/settings',{...s.settings,target:s.settings.target==null||s.settings.target===''?null:Number(s.settings.target),channelTargets:Object.fromEntries(Object.entries(s.settings.channelTargets).map(([k,v])=>[k,v==null||v===''?null:Number(v)])),clevel:s.clevelText.split('\n').map(v=>v.trim()).filter(Boolean),targets:s.settings.targets.map(t=>({...t,target:Number(t.target)}))},'PUT');s.event=await api(base());if(s.event.mode!=='hybrid')s.filters.mode='all';s.events=await api('/api/events');notify('Đã lưu thiết lập sự kiện.');}
export async function loadMembers(){s.members=await api(base()+'/members');}
export async function addMember(){await api(base()+'/members',{name:s.member.name,email:s.member.email});s.member={name:'',email:'',role:'editor'};s.dialog='';await loadMembers();notify('Đã cấp quyền. Tài khoản mới phải đổi mật khẩu lần đầu.');}
export async function previewMembers(files){if(!files[0])return;const form=new FormData();form.append('file',files[0]);s.memberPreview=await api(base()+'/members/import/preview',form);}
export async function importMembers(){await api(base()+'/members/import',{rows:s.memberPreview.rows});s.memberPreview=null;await loadMembers();notify('Đã nhập danh sách Editor cho sự kiện này.');}
export async function setRole(member,role){await api(base()+'/members/'+member.id,{role},'PATCH');await loadMembers();}
export async function removeMember(){await api(base()+'/members/'+s.editMember.id,null,'DELETE');s.dialog='';await loadMembers();notify('Đã thu hồi quyền chỉnh sửa. Tài khoản vẫn có quyền Viewer.');}
let rowsRequest=0,rowFilterTimer;
export function resetRowFilters(){s.rowFilters={};s.rowFrom=null;s.rowTo=null;s.query='';s.page=1;}
watch([()=>s.rowFilters,()=>s.rowFrom,()=>s.rowTo],()=>{clearTimeout(rowFilterTimer);rowsRequest++;s.page=1;if(s.event&&s.route==='du-lieu')rowFilterTimer=setTimeout(()=>loadRows().catch(e=>s.error=e.message),180);},{deep:true});
export async function loadRows(){const seq=++rowsRequest,id=s.event?.id;if(!id)return;s.rowsBusy=true;try{const q=new URLSearchParams({page:s.page,pageSize:s.pageSize,q:s.query,filters:JSON.stringify(s.rowFilters)});if(s.rowFrom)q.set('from',isoDate(s.rowFrom));if(s.rowTo)q.set('to',isoDate(s.rowTo));const data=await api(base()+'/rows?'+q);if(seq!==rowsRequest||s.event?.id!==id)return;s.rows=data.rows;s.rowTotal=data.total;s.page=data.page;s.rowOptions=data.options;s.rowHasTaxId=data.hasTaxId;}finally{if(seq===rowsRequest)s.rowsBusy=false;}}

export function editRow(row){s.editRow=Object.fromEntries(Object.keys(s.user.fields).map(k=>[k,row[k]||'']));s.editRow.submitted_at=row.submitted_at?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(row.submitted_at)).replace(',',''):'';s.editRow.attendance_mode=row.attendance_mode||'unknown';s.editRow.call_status=row.call_status||'unknown';s.editRow.id=row.id;s.editRow.version=row.version;s.editRow.utm_content=utmContent(row);s.editRow.registration_status=row.registration_status||'registered';s.dialog='row';}
export function addGuest(){s.editRow=Object.fromEntries(Object.keys(s.user.fields).map(k=>[k,'']));s.editRow.attendance_mode=s.rowFilters.attendance_mode?.[0]|| (s.event.mode==='hybrid'?'unknown':s.event.mode);s.editRow.registration_status='registered';s.dialog='row';}
export async function saveRow(){const {id,version,...row}=s.editRow;delete row.call_status;await api(base()+'/rows'+(id?'/'+id:''),id?{version,snapshot:s.event.active_snapshot_id,row}:row,id?'PATCH':'POST');s.event=await api(base());s.dialog='';await loadRows();notify('Đã lưu thông tin khách.');}
export async function openContact(row){s.editRow={...row};s.contactDraft={version:row.version,channel:'phone',called:true,response:'pending',note:'',follow_up_at:''};s.contactPage=1;await loadContactHistory();s.dialog='contact';}
export async function loadContactHistory(){const data=await api(base()+'/rows/'+s.editRow.id+'/contacts?page='+s.contactPage+'&pageSize='+s.contactPageSize);s.contactHistory=data.rows;s.contactTotal=data.total;s.contactPage=data.page;}
export async function saveContact(){await api(base()+'/rows/'+s.editRow.id+'/contacts',s.contactDraft);s.dialog='';s.event=await api(base());await loadRows();notify('Đã lưu kết quả liên hệ.');}
export async function loadSources(){s.eventSources=await api(base()+'/sources');if(canAdmin.value)s.conflicts=await api(base()+'/conflicts');}
export async function sourceEnabled(source,enabled){await api(base()+'/sources/'+source.id,{enabled},'PATCH');await loadSources();}
export async function resolveConflict(conflict,registration_id){await api(base()+'/conflicts/'+conflict.id,{registration_id});await loadSources();s.event=await api(base());}
export async function stageFile(files){if(!files[0])return;const form=new FormData();form.append('file',files[0]);form.append('sheetName',s.sheetName);form.append('headerRow',s.headerRow);form.append('mode',s.importMode);form.append('registrationStatus',s.registrationStatus);form.append('automatic','true');await stageImport(await api(base()+'/import/file',form));}
export async function stageSheet(){await stageImport(await api(base()+'/import/sheet',{url:s.sheetUrl,sheetName:s.sheetName,headerRow:Number(s.headerRow),mode:s.importMode,registrationStatus:s.registrationStatus,automatic:true}));}
async function imported(){
  s.stage=null;s.preview=null;resetFilters();s.event=await api(base());s.snapshots=await api(base()+'/snapshots');
  await loadSources();await navigate(s.conflicts?.total?'nguon-du-lieu':'tong-quan');notify(s.conflicts?.total?'Đã nhập. Còn khách trùng cần Admin đối chiếu.':'Đã nhập và tổng hợp dữ liệu. Kết quả liên hệ được giữ nguyên.');
}
async function stageImport(data){
  if(data.committed){await imported();return;}
  s.stage=data;s.mapping=data.mapping;s.sourceColumns=data.sourceColumns;s.preview=null;
  if(data.needsMapping){s.error=data.notice;return;}
  await previewData();
}
export async function aiMapping(){s.mapping=await api(base()+'/import/'+s.stage.id+'/ai',{});s.preview=null;}
export async function previewData(){s.preview=await api(base()+'/import/'+s.stage.id+'/preview',{mapping:s.mapping,sourceColumns:s.sourceColumns});}
export async function commitData(){await api(base()+'/import/'+s.stage.id+'/commit',{mapping:s.mapping,sourceColumns:s.sourceColumns,autoSync:s.autoSync});await imported();}
export async function sync(){await api(base()+'/sync',{});s.event=await api(base());s.snapshots=await api(base()+'/snapshots');if(s.route==='tong-quan')await loadReport();await loadSources();notify('Đã kiểm tra dữ liệu mới nhất.');}
export async function toggleSync(enabled){await api(base()+'/source',{enabled},'PATCH');s.event=await api(base());}
export async function insights(){
  if(!s.event||!s.report?.snapshot.id||s.reportBusy||!s.report.current.total)return;
  const seq=++insightRequest,eventId=s.event.id,q=params();q.set('snapshot',s.report.snapshot.id);
  const key=eventId+'|'+q+'|'+JSON.stringify(s.event.settings);
  s.insightBusy=true;s.insightError='';
  try{
    let value=insightCache.get(key);
    if(!value){
      if(!insightPending.has(key))insightPending.set(key,api(base()+'/insights?'+q,{}));
      value=await insightPending.get(key);insightCache.set(key,value);
      if(insightCache.size>30)insightCache.delete(insightCache.keys().next().value);
    }
    if(seq===insightRequest&&s.event?.id===eventId)s.insight=value;
  }catch(e){if(seq===insightRequest)s.insightError=e.message;}
  finally{insightPending.delete(key);if(seq===insightRequest)s.insightBusy=false;}
}
let refreshingEvent=null;
export async function refreshLatest(){
  if(!s.event||s.route!=='tong-quan'||s.filters.snapshot||refreshingEvent)return;
  const id=s.event.id,url=base();refreshingEvent=id;s.refreshBusy=true;s.refreshWarning='';
  try{
    const result=await api(url+'/refresh',{});
    if(s.event?.id!==id)return;
    s.refreshWarning=result.warning||'';
    const event=await api(url);
    if(s.event?.id!==id)return;
    const changed=event.active_snapshot_id!==s.report?.snapshot.id||JSON.stringify(event.settings)!==JSON.stringify(s.event.settings);
    s.event=event;
    if(s.report)s.report.source={enabled:!!event.source?.enabled,checkedAt:event.synced_at,error:event.sync_error};
    const snapshots=await api(url+'/snapshots');if(s.event?.id!==id)return;s.snapshots=snapshots;
    if(changed&&s.event?.id===id&&!s.filters.snapshot)await loadReport();
  }catch(e){if(s.event?.id===id)s.refreshWarning=e.message;}
  finally{refreshingEvent=null;if(s.event?.id===id)s.refreshBusy=false;else if(s.event)void refreshLatest();}
}
function refreshVisible(){if(document.visibilityState==='visible'&&!s.busy)void refreshLatest();}
window.addEventListener('focus',refreshVisible);
document.addEventListener('visibilitychange',refreshVisible);
window.setInterval(refreshVisible,60000);

export async function exportExcel(){const q=params();if(s.report?.snapshot.id)q.set('snapshot',s.report.snapshot.id);q.set('reports',(s.reportTab==='targets'?['targets']:s.selected).join(','));const res=await fetch(base()+'/export.xlsx?'+q);if(!res.ok)throw Error((await res.json()).error);download(await res.blob(),'Event-Report.xlsx');}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export async function exportPng(){
 const {default:html2canvas}=await import('html2canvas');s.exportingImage=true;
 try{await nextTick();const target=document.querySelector('[data-report]');
 const goalTable=target.querySelector('.target-table table'),width=goalTable?Math.max(target.offsetWidth,goalTable.scrollWidth+64):target.offsetWidth;
 const canvas=await html2canvas(target,{scale:2,backgroundColor:getComputedStyle(document.body).backgroundColor,onclone:doc=>{if(goalTable)doc.querySelector('[data-report]').style.width=width+'px';}});
 await new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob){reject(Error('Không thể tạo ảnh báo cáo.'));return;}download(blob,'Event-Report.png');resolve();}));notify('Đã tạo ảnh báo cáo.');
 }finally{s.exportingImage=false;}
}
