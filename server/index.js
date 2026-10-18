import {registrationRoutes} from './registration-routes.js';
import {initializeRegistry,mergeImport,upsertSource,participationRows,assignedRows} from './registry.js';
import {identifiers} from './identifiers.js';
import {summarizeTargetPlan} from './target-plan.js';
import {registrationQuery} from './registration-query.js';
import {isMisaEmail,strongPassword,attendanceMode} from './account-policy.js';
import {memberRoutes} from './members.js';
import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import multer from 'multer';
import {z} from 'zod';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {pool,transaction,migrate,audit} from './db.js';
import {authenticate,authorize,bootstrap,hashPassword,verifyPassword,createSession,cookieToken,digest,token,fail} from './auth.js';
import {defaultSettings,fields,normalizeRows,summarize,parseDate,norm,selectRows} from './domain.js';
import {readFile,readSheet,normalizeData,suggestMapping,saveSnapshot,syncEvent,syncAll,gemini,discoverSourceColumns} from './ingestion.js';
import {validateSourceColumns,sourceBreakdowns,guessSourceColumns} from './source-dimensions.js';
import {buildReportWorkbook,reportTypes} from './report-export.js';
import {allocateEventSlug} from './event-slug.js';
import {insightData} from './insight-data.js';
const app=express();
if(process.env.K_SERVICE)app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{'script-src':["'self'"],'style-src':["'self'","'unsafe-inline'"],'img-src':["'self'",'data:','blob:'],'upgrade-insecure-requests':process.env.COOKIE_SECURE==='false'?null:[]}}}));
app.use(express.json({limit:'1mb'}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&req.headers.origin!==process.env.APP_ORIGIN)fail(403,'Nguồn yêu cầu không hợp lệ.');next();});
const limiter=rateLimit({windowMs:15*60000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.'}});
const expensive=rateLimit({windowMs:60000,limit:12,keyGenerator:req=>req.user.id,standardHeaders:true,legacyHeaders:false,message:{error:'Vui lòng đợi một phút trước khi tiếp tục.'}});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:10}});
const email=z.string().email().max(200).transform(s=>s.toLowerCase());
const password=z.string().max(128).refine(strongPassword,'Mật khẩu tối thiểu 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');
const name=z.string().trim().min(1).max(150);
const eventSchema=z.object({name,mode:z.enum(['online','offline','hybrid']).default('hybrid'),event_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()});
const settingsSchema=z.object({target:z.number().int().min(0).max(10000000).nullable(),channelTargets:z.object({online:z.number().int().min(0).max(10000000).nullable(),offline:z.number().int().min(0).max(10000000).nullable()}).optional(),clevel:z.array(z.string().trim().min(1).max(150)).max(40),dedup:z.enum(['none','email','phone']),targets:z.array(z.object({group:z.string().max(120),name,code:z.string().trim().min(1).max(120),target:z.number().int().min(0).max(10000000)})).max(500),reports:z.array(z.enum(['targets','positions','sizes','trend','sources'])).max(5)}).refine(s=>new Set(s.targets.map(t=>norm(t.code))).size===s.targets.length,'Mã tracking không được trùng.');
app.get('/api/health',async(req,res)=>{await pool.query('SELECT 1');res.json({ok:true});});
app.post('/api/login',limiter,async(req,res)=>{
  const body=z.object({email,password:z.string().min(1).max(128)}).parse(req.body);
  const {rows:[user]}=await pool.query('SELECT * FROM users WHERE email=$1',[body.email]);
  const dummy='00000000000000000000000000000000:'+ '00'.repeat(64);
  const valid=verifyPassword(body.password,user?.password||dummy);if(!user||!valid||!user.active||!isMisaEmail(user.email))fail(401,'Email hoặc mật khẩu không đúng.');
  await createSession(res,user.id);res.json({ok:true});
});
app.use('/api',authenticate);
app.get('/api/me',(req,res)=>res.json({...req.user,model:process.env.GEMINI_MODEL||'gemini-4-argon',fields}));
app.post('/api/logout',async(req,res)=>{await pool.query('DELETE FROM sessions WHERE token=$1',[digest(cookieToken(req))]);res.clearCookie('session');res.json({ok:true});});
app.post('/api/password',async(req,res)=>{const b=z.object({current:z.string().max(128),password}).parse(req.body);const {rows:[u]}=await pool.query('SELECT password FROM users WHERE id=$1',[req.user.id]);if(b.current===b.password||b.password===process.env.DEFAULT_MEMBER_PASSWORD)fail(400,'Hãy đặt mật khẩu riêng khác mật khẩu ban đầu.');if(!verifyPassword(b.current,u.password))fail(400,'Mật khẩu hiện tại không đúng.');await transaction(async c=>{await c.query('UPDATE users SET password=$1,must_change_password=false WHERE id=$2',[hashPassword(b.password),req.user.id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[req.user.id]);});await createSession(res,req.user.id);res.json({ok:true});});
app.use('/api',(req,res,next)=>{if(req.user.must_change_password)fail(403,'Bạn phải đổi mật khẩu trước khi sử dụng ứng dụng.');next();});
app.get('/api/events',async(req,res)=>{const {rows}=await pool.query("SELECT e.id,e.slug,e.name,e.mode,e.event_date,e.active_snapshot_id,e.synced_at,e.sync_error,COALESCE(m.role,'viewer') AS role FROM events e LEFT JOIN members m ON m.event_id=e.id AND m.user_id=$1 ORDER BY e.created_at DESC",[req.user.id]);res.json(rows.map(e=>({...e,role:req.user.global_role==='super_admin'?'super_admin':e.role})));});
app.post('/api/events',async(req,res)=>{if(req.user.global_role!=='super_admin')fail(403,'Chỉ Super admin được tạo sự kiện.');const b=eventSchema.parse(req.body);const id=randomUUID();const slug=await transaction(async c=>{const slug=await allocateEventSlug(c,b.name);await c.query('INSERT INTO events(id,slug,name,event_date,settings,mode) VALUES($1,$2,$3,$4,$5,$6)',[id,slug,b.name,b.event_date||null,JSON.stringify(defaultSettings()),b.mode]);await c.query('UPDATE events SET registry_initialized=true WHERE id=$1',[id]);await audit(c,id,req.user.id,'event.created');return slug;});res.status(201).json({id,slug});});
const read=authorize(),edit=authorize('admin','editor'),owner=authorize('admin');
app.get('/api/events/:eventId',read,async(req,res)=>{const {rows:[{enabled}]}=await pool.query('SELECT bool_or(enabled) AS enabled FROM event_sources WHERE event_id=$1',[req.event.id]);res.json({...req.event,source:enabled?{enabled:true}:null});});
app.patch('/api/events/:eventId',edit,async(req,res)=>{const b=eventSchema.parse(req.body);await transaction(async c=>{await c.query('UPDATE events SET name=$1,event_date=$2,mode=$3 WHERE id=$4',[b.name,b.event_date||null,b.mode,req.event.id]);await audit(c,req.event.id,req.user.id,'event.updated',b);});res.json({ok:true});});
app.put('/api/events/:eventId/settings',edit,async(req,res)=>{const settings=settingsSchema.parse(req.body);await transaction(async c=>{await c.query('UPDATE events SET settings=$1 WHERE id=$2',[JSON.stringify(settings),req.event.id]);await audit(c,req.event.id,req.user.id,'settings.updated');});res.json({ok:true});});
memberRoutes(app,{read,owner,upload});
registrationRoutes(app,{read,edit,owner});
function stageResult(i){const data=i.payload;return {id:i.id,headers:data.headers,sample:data.raw.slice(0,5),count:data.raw.length,mapping:data.mapping,tabs:data.tabs,sheetName:data.sheetName,sourceColumns:[...new Set([...(data.sourceColumns||[]),...guessSourceColumns(data.headers)])].slice(0,12),discovery:data.discovery};}
async function stage(req,res,data){
  data.importMode=z.enum(['auto','online','offline']).parse(req.body.mode||'auto');data.registrationStatus=z.enum(['invited','registered']).parse(req.body.registrationStatus||'registered');
  const automatic=req.body.automatic===true||req.body.automatic==='true';
  const id=randomUUID();data.discovery=await discoverSourceColumns(data.headers);data.sourceColumns=data.discovery.columns;
  if(automatic&&(!data.mapping.submitted_at||!data.mapping.position)&&process.env.GOOGLE_CLOUD_PROJECT){
    try{const suggested=await suggestMapping(data.headers);const mapping={...suggested,...Object.fromEntries(Object.entries(data.mapping).filter(([,v])=>v))};for(const key of ['position','submitted_at'])if(['name','email','phone','company'].some(k=>mapping[key]&&mapping[key]===mapping[k]))mapping[key]='';parseImport(data,mapping);data.mapping=mapping;}catch{data.mappingNotice='Hãy kiểm tra cột thông tin khách. Trường không có dữ liệu được để trống.';}
  }
  await pool.query('INSERT INTO imports(id,event_id,user_id,label,payload) VALUES($1,$2,$3,$4,$5)',[id,req.event.id,req.user.id,data.label,JSON.stringify(data)]);
  const result=stageResult({id,payload:data});
  if(automatic){
    try{parseImport(data,data.mapping,data.sourceColumns);}catch(e){if(e.status!==400)throw e;return res.json({...result,needsMapping:true,notice:data.mappingNotice||e.message});}
    const snapshotId=await publishImport(req,{mapping:data.mapping,sourceColumns:data.sourceColumns,autoSync:true},id);
    return res.json({...result,committed:true,snapshotId});
  }
  res.json(result);
}
app.get('/api/events/:eventId/imports/pending',edit,async(req,res)=>{
  const {rows:[i]}=await pool.query("SELECT * FROM imports WHERE event_id=$1 AND user_id=$2 AND created_at>now()-interval '1 day' ORDER BY created_at DESC LIMIT 1",[req.event.id,req.user.id]);
  res.json(i?stageResult(i):null);
});
app.post('/api/events/:eventId/import/file',edit,expensive,upload.single('file'),async(req,res)=>{if(!req.file)fail(400,'Chọn file Excel hoặc CSV.');await stage(req,res,await readFile(req.file.buffer,req.file.originalname,req.body.sheetName,Number(req.body.headerRow||0)));});
app.post('/api/events/:eventId/import/sheet',owner,expensive,async(req,res)=>{const b=z.object({url:z.string().max(1000),sheetName:z.string().max(200).optional(),headerRow:z.number().int().min(0).max(50).default(0)}).parse(req.body);await stage(req,res,await readSheet(b.url,b.sheetName,b.headerRow));});
async function getImport(req,c=pool,importId=req.params.importId){const id=z.string().uuid().parse(importId);const {rows:[i]}=await c.query("SELECT * FROM imports WHERE id=$1 AND event_id=$2 AND user_id=$3 AND created_at>now()-interval '1 day'",[id,req.event.id,req.user.id]);if(!i)fail(404,'Phiên nhập đã hết hạn.');return i;}
const mappingSchema=z.partialRecord(z.enum(Object.keys(fields)),z.string().max(200));
function parseImport(payload,mapping,sourceColumns=payload.sourceColumns||[]){const m=mappingSchema.parse(mapping);for(const v of Object.values(m))if(v&&!payload.headers.includes(v))fail(400,'Tên cột không tồn tại trong nguồn dữ liệu.');const columns=validateSourceColumns(payload.headers,sourceColumns);if(!['name','phone','email','company'].some(k=>m[k]))fail(400,'Chưa nhận diện cột thông tin khách. Hãy ghép cột trước khi nhập.');try{const parsed=normalizeData(payload,m,columns);if(payload.targetNotice)parsed.quality.targetNotice=payload.targetNotice;return parsed;}catch(e){fail(400,e.message);}}
app.post('/api/events/:eventId/import/:importId/ai',edit,expensive,async(req,res)=>{const i=await getImport(req);const m=await suggestMapping(i.payload.headers);parseImport(i.payload,m);res.json(m);});
app.post('/api/events/:eventId/import/:importId/preview',edit,async(req,res)=>{const i=await getImport(req);const parsed=parseImport(i.payload,req.body.mapping,req.body.sourceColumns);res.json({quality:parsed.quality,sample:parsed.rows.slice(0,5),summary:summarize(parsed.rows,req.event.settings)});});
async function publishImport(req,b,importId){
  return transaction(async c=>{
    const {rows:[locked]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const i=await getImport(req,c,importId);const columns=validateSourceColumns(i.payload.headers,b.sourceColumns??i.payload.sourceColumns??[]);const parsed=parseImport(i.payload,b.mapping,columns);
    await initializeRegistry(c,locked);
    if(req.event.role==='editor'&&i.payload.targetPlan)fail(403,'Chỉ Admin được nhập mục tiêu.');
    const mode=i.payload.importMode||'auto',registrationStatus=i.payload.registrationStatus||'registered';
    const sourceConfig={...i.payload.source,mapping:b.mapping,sourceColumns:columns,sourceHeaders:i.payload.headers,registrationStatus};
    const key=i.payload.source?'sheet:'+i.payload.source.url+':'+i.payload.source.sheetName+':'+mode:'file:'+(i.payload.filename||i.label)+':'+mode;
    const source=await upsertSource(c,locked,{key,label:i.label,kind:i.payload.source?'sheet':'file',mode,config:sourceConfig,targetPlan:i.payload.targetPlan,enabled:!!i.payload.source&&b.autoSync});
    const result=await mergeImport(c,locked,source,participationRows(parsed.rows,mode,locked.mode,registrationStatus),req.user.id,{quality:parsed.quality,permissionUser:req.event.role==='editor'?req.user:null});
    const snapshot=result.id;
    await c.query('UPDATE events SET sync_error=null,synced_at=now() WHERE id=$1',[req.event.id]);
    await c.query('DELETE FROM imports WHERE id=$1',[i.id]);return snapshot;
  });
}
app.post('/api/events/:eventId/import/:importId/commit',edit,async(req,res)=>{
  const b=z.object({mapping:mappingSchema,autoSync:z.boolean().default(false),sourceColumns:z.array(z.string().max(200)).max(12).optional()}).parse(req.body);
  res.json({id:await publishImport(req,b,req.params.importId)});
});
// Viewers may trigger only the automatic sync already enabled by an editor.
app.post('/api/events/:eventId/refresh',read,expensive,async(req,res)=>{
  try{res.json(await syncEvent(req.event.id,null,{automatic:true,minIntervalMs:15000}));}
  catch(e){res.json({changed:false,warning:e.status?e.message:'Chưa cập nhật được nguồn. Đang giữ dữ liệu đã nhập gần nhất.'});}
});
app.post('/api/events/:eventId/sync',edit,expensive,async(req,res)=>res.json(await syncEvent(req.event.id,req.user.id)));
app.patch('/api/events/:eventId/source',owner,async(req,res)=>{const {enabled}=z.object({enabled:z.boolean()}).parse(req.body);await pool.query("UPDATE event_sources SET enabled=$1 WHERE event_id=$2 AND kind='sheet'",[enabled,req.event.id]);res.json({ok:true});});
app.get('/api/events/:eventId/snapshots',read,async(req,res)=>{const {rows}=await pool.query('SELECT id,label,quality,created_at FROM snapshots WHERE event_id=$1 ORDER BY created_at DESC LIMIT 100',[req.event.id]);res.json(rows);});
async function snapshot(req){const id=req.query.snapshot?z.string().uuid().parse(req.query.snapshot):req.event.active_snapshot_id;if(!id)return {rows:[],quality:{},id:null};const {rows:[s]}=await pool.query('SELECT * FROM snapshots WHERE id=$1 AND event_id=$2',[id,req.event.id]);if(!s)fail(404,'Không tìm thấy phiên dữ liệu.');return s;}
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>parseDate(s)!==null);
function range(req){const b=z.object({from:date.optional(),to:date.optional(),compareFrom:date.optional(),compareTo:date.optional()}).parse(req.query);if((b.from&&b.to&&b.from>b.to)||(b.compareFrom&&b.compareTo&&b.compareFrom>b.compareTo))fail(400,'Ngày bắt đầu phải trước ngày kết thúc.');if(Boolean(b.compareFrom)!==Boolean(b.compareTo))fail(400,'Chọn đủ hai ngày của kỳ so sánh.');return b;}
async function report(req){
  const s=await snapshot(req),r=range(req);let filters={};
  if(req.query.sourceFilters){const raw=z.string().max(10000).parse(req.query.sourceFilters);try{filters=JSON.parse(raw);}catch{fail(400,'Bộ lọc nguồn khách không hợp lệ.');}}
  filters=z.record(z.string().min(1).max(200),z.string().max(1000)).refine(v=>Object.keys(v).length<=12).parse(filters);
  const allDimensions=sourceBreakdowns(s.rows);const allowed=new Set(allDimensions.map(d=>d.name));
  if(Object.keys(filters).some(k=>!allowed.has(k)))fail(400,'Cột nguồn khách không tồn tại trong phiên dữ liệu này.');
  r.sourceFilters=filters;r.mode=z.enum(['all','online','offline','both','unknown']).parse(req.query.mode||'all');
  const channel=['online','offline'].includes(r.mode);
  const plan=channel?s.target_plan?.byMode?.[r.mode]||null:r.mode==='all'&&s.target_plan?.rows?s.target_plan:null;
  const channelGoals={...req.event.settings.channelTargets};
  for(const mode of ['online','offline'])if(s.target_plan?.byMode?.[mode])channelGoals[mode]=s.target_plan.byMode[mode].target;
  const totalGoal=req.event.mode==='hybrid'?(channelGoals.online!=null&&channelGoals.offline!=null?channelGoals.online+channelGoals.offline:req.event.settings.target):(channelGoals[req.event.mode]??req.event.settings.target);
  const settings={...req.event.settings,target:channel?channelGoals[r.mode]??null:r.mode==='all'?plan?.target??totalGoal:null};
  const summary=(from,to)=>{const data=summarize(s.rows,settings,from,to,filters,r.mode);data.targetPlan=summarizeTargetPlan(plan,selectRows(s.rows,settings,from,to,filters,r.mode),row=>settings.clevel.some(v=>norm(v)===norm(row.position)));if(r.mode==='all'&&s.target_plan?.byMode&&!plan){
    const plans=Object.entries(s.target_plan.byMode).map(([mode,p])=>({mode,summary:summarizeTargetPlan(p,selectRows(s.rows,settings,from,to,filters,mode),row=>settings.clevel.some(v=>norm(v)===norm(row.position)))}));
    data.targetPlan={label:'Mục tiêu Online / Offline',target:settings.target,leafSum:plans.reduce((n,p)=>n+p.summary.leafSum,0),unmatched:plans.reduce((n,p)=>n+p.summary.unmatched,0),rows:plans.flatMap(({mode,summary})=>summary.rows.map(row=>({...row,id:mode+':'+row.id,name:(mode==='online'?'Online · ':'Offline · ')+row.name})))};
   }
   if(data.targetPlan)data.targetSum=data.targetPlan.leafSum;data.invited=selectRows(s.rows.filter(row=>row.registration_status==='invited').map(row=>({...row,registration_status:'registered'})),settings,from,to,filters,r.mode).length;data.attendance=data.attendance.map(a=>({...a,target:channelGoals[a.value]??null,completion:channelGoals[a.value]?Math.round(a.count/channelGoals[a.value]*10000)/100:null}));return data;};
  const {rows:[sourceState]}=await pool.query('SELECT bool_or(enabled) enabled FROM event_sources WHERE event_id=$1',[req.event.id]);
  return {generatedAt:new Date().toISOString(),totalRows:s.rows.length,source:{enabled:!!sourceState.enabled,checkedAt:req.event.synced_at,error:req.event.sync_error},snapshot:{id:s.id,label:s.label,created_at:s.created_at},quality:s.quality,sourceDimensions:sourceBreakdowns(selectRows(s.rows,req.event.settings)),current:summary(r.from,r.to),comparison:r.compareFrom?summary(r.compareFrom,r.compareTo):null,range:r};
}
app.get('/api/events/:eventId/report',read,async(req,res)=>res.json(await report(req)));
app.get('/api/events/:eventId/export.xlsx',read,expensive,async(req,res)=>{
  const selected=req.query.reports===undefined?reportTypes.filter(t=>t!=='targets'):z.array(z.enum(reportTypes)).max(5).parse(z.string().max(100).parse(req.query.reports).split(',').filter(Boolean));
  const data=await report(req),wb=await buildReportWorkbook(req.event,data,selected);
  const buffer=await wb.xlsx.writeBuffer();
  res.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition','attachment; filename="MISA-Event-Report.xlsx"');res.send(Buffer.from(buffer));
});
app.get('/api/events/:eventId/rows',read,async(req,res)=>res.json(registrationQuery(await assignedRows(pool,req.event.id,(await snapshot(req)).rows,req.user),req.query)));
app.post('/api/events/:eventId/insights',read,expensive,async(req,res)=>{
  const data=await report(req);
  // Only precomputed group aggregates go to the model; row-level contacts and staff names stay in the app.
  const aiData=insightData(data);
  const insight=await gemini('Dựa CHỈ trên số liệu tổng hợp, trả tối đa 5 nhận xét ngắn về tiến độ, C-Level, nguồn đăng ký và chênh lệch kỳ. Nêu mẫu số. Định dạng số theo Việt Nam (1.350; 9,93%). Không đoán nguyên nhân hoặc thông tin cá nhân. Nêu hạn chế nếu không có kỳ so sánh.',aiData,{type:'OBJECT',properties:{summary:{type:'STRING'},observations:{type:'ARRAY',items:{type:'STRING'}}},required:['summary','observations']});
  const parsed=z.object({summary:z.string().max(5000),observations:z.array(z.string().max(3000)).max(8)}).parse(insight);await audit(pool,req.event.id,req.user.id,'ai.report',{snapshot:data.snapshot.id,model:process.env.GEMINI_MODEL||'gemini-4-argon'});res.json({...parsed,model:process.env.GEMINI_MODEL||'gemini-4-argon',snapshot:data.snapshot.id});
});
app.get('/api/events/:eventId/audit',owner,async(req,res)=>{
 const query=z.object({page:z.coerce.number().int().min(1).max(1000000).default(1),pageSize:z.coerce.number().refine(n=>[20,50,100].includes(n)).default(20)}).parse(req.query);
 // Count and page share one SQL snapshot, including when the requested page is now out of range.
 const {rows:[result]}=await pool.query(`WITH total AS (SELECT count(*)::int AS total FROM audit WHERE event_id=$1), paging AS (
 SELECT total,LEAST($2::int,GREATEST(1,CEIL(total::numeric/$3)::int)) AS page FROM total)
 SELECT total,page,COALESCE((SELECT jsonb_agg(item ORDER BY item.id DESC) FROM (
 SELECT a.id,a.action,a.detail,a.created_at,u.name FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE a.event_id=$1 ORDER BY a.id DESC LIMIT $3 OFFSET (paging.page-1)*$3
 ) item),'[]'::jsonb) AS rows FROM paging`,[req.event.id,query.page,query.pageSize]);
 res.json({...result,pageSize:query.pageSize});
});
app.use('/vendor/chart',express.static(path.resolve('node_modules/chart.js/dist')));
app.use('/vendor/html2canvas',express.static(path.resolve('node_modules/html2canvas/dist')));
app.use(express.static(path.resolve('dist')));
app.get(['/log-in','/su-kien','/change-password'],(req,res)=>res.sendFile(path.resolve('dist/index.html')));
app.get(/^\/[^/]+\/(?:tong-quan|du-lieu|nguon-du-lieu|muc-tieu|thanh-vien|nhat-ky)\/?$/,(req,res)=>res.sendFile(path.resolve('dist/index.html')));
app.use((err,req,res,next)=>{if(res.headersSent)return next(err);let status=err.status||500,message=err.status?err.message:'Đã xảy ra lỗi. Vui lòng thử lại.';if(err instanceof z.ZodError){status=400;message='Dữ liệu không hợp lệ: '+err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ');}if(err.code==='LIMIT_FILE_SIZE'){status=413;message='File tối đa 10 MB.';}if(err.code==='23505'){status=409;message='Dữ liệu đã tồn tại. Vui lòng tải lại.';}console.error(JSON.stringify({type:'request_error',status,code:err.code||err.name}));res.status(status).json({error:message});});
await migrate();await bootstrap();
const {rows:uninitialized}=await pool.query('SELECT id FROM events WHERE NOT registry_initialized');
for(const e of uninitialized)await transaction(async c=>{const {rows:[event]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[e.id]);await initializeRegistry(c,event);});
const server=app.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('MISA Event Insights ready'));
let running=false;
const interval=Number(process.env.SYNC_INTERVAL_SECONDS||0);
const timer=interval>0?setInterval(async()=>{if(running)return;running=true;try{await syncAll();}catch{console.error('sync_batch_failed');}finally{running=false;}},Math.max(interval,60)*1000):null;
async function shutdown(){if(timer)clearInterval(timer);server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
