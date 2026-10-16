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
import {readFile,readSheet,suggestMapping,saveSnapshot,syncEvent,syncAll,gemini,discoverSourceColumns} from './ingestion.js';
import {validateSourceColumns,sourceBreakdowns} from './source-dimensions.js';
import {buildReportWorkbook,reportTypes} from './report-export.js';
import {allocateEventSlug} from './event-slug.js';
const app=express();
if(process.env.K_SERVICE)app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{'script-src':["'self'"],'style-src':["'self'","'unsafe-inline'"],'img-src':["'self'",'data:','blob:'],'upgrade-insecure-requests':process.env.COOKIE_SECURE==='false'?null:[]}}}));
app.use(express.json({limit:'1mb'}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&req.headers.origin!==process.env.APP_ORIGIN)fail(403,'Nguồn yêu cầu không hợp lệ.');next();});
const limiter=rateLimit({windowMs:15*60000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.'}});
const expensive=rateLimit({windowMs:60000,limit:12,keyGenerator:req=>req.user.id,standardHeaders:true,legacyHeaders:false,message:{error:'Vui lòng đợi một phút trước khi tiếp tục.'}});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:5}});
const email=z.string().email().max(200).transform(s=>s.toLowerCase());
const password=z.string().max(128).refine(strongPassword,'Mật khẩu tối thiểu 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');
const name=z.string().trim().min(1).max(150);
const eventSchema=z.object({name,mode:z.enum(['online','offline','hybrid']).default('hybrid'),event_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()});
const settingsSchema=z.object({target:z.number().int().min(0).max(10000000),clevel:z.array(z.string().trim().min(1).max(150)).max(40),dedup:z.enum(['none','email','phone']),targets:z.array(z.object({group:z.string().max(120),name,code:z.string().trim().min(1).max(120),target:z.number().int().min(0).max(10000000)})).max(500),reports:z.array(z.enum(['targets','positions','sizes','trend','sources'])).max(5)}).refine(s=>new Set(s.targets.map(t=>norm(t.code))).size===s.targets.length,'Mã tracking không được trùng.');
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
app.post('/api/events',async(req,res)=>{if(req.user.global_role!=='super_admin')fail(403,'Chỉ Super admin được tạo sự kiện.');const b=eventSchema.parse(req.body);const id=randomUUID();const slug=await transaction(async c=>{const slug=await allocateEventSlug(c,b.name);await c.query('INSERT INTO events(id,slug,name,event_date,settings,mode) VALUES($1,$2,$3,$4,$5,$6)',[id,slug,b.name,b.event_date||null,JSON.stringify(defaultSettings()),b.mode]);await audit(c,id,req.user.id,'event.created');return slug;});res.status(201).json({id,slug});});
const read=authorize(),edit=authorize('admin','editor'),owner=authorize('admin');
app.get('/api/events/:eventId',read,(req,res)=>res.json(req.event));
app.patch('/api/events/:eventId',edit,async(req,res)=>{const b=eventSchema.parse(req.body);await transaction(async c=>{await c.query('UPDATE events SET name=$1,event_date=$2,mode=$3 WHERE id=$4',[b.name,b.event_date||null,b.mode,req.event.id]);await audit(c,req.event.id,req.user.id,'event.updated',b);});res.json({ok:true});});
app.put('/api/events/:eventId/settings',edit,async(req,res)=>{const settings=settingsSchema.parse(req.body);await transaction(async c=>{await c.query('UPDATE events SET settings=$1 WHERE id=$2',[JSON.stringify(settings),req.event.id]);await audit(c,req.event.id,req.user.id,'settings.updated');});res.json({ok:true});});
memberRoutes(app,{read,owner,upload});
async function stage(req,res,data){const id=randomUUID();data.discovery=await discoverSourceColumns(data.headers);data.sourceColumns=data.discovery.columns;await pool.query('INSERT INTO imports(id,event_id,user_id,label,payload) VALUES($1,$2,$3,$4,$5)',[id,req.event.id,req.user.id,data.label,JSON.stringify(data)]);res.json({id,headers:data.headers,sample:data.raw.slice(0,5),count:data.raw.length,mapping:data.mapping,tabs:data.tabs,sheetName:data.sheetName,sourceColumns:data.sourceColumns,discovery:data.discovery});}
app.post('/api/events/:eventId/import/file',edit,expensive,upload.single('file'),async(req,res)=>{if(!req.file)fail(400,'Chọn file Excel hoặc CSV.');await stage(req,res,await readFile(req.file.buffer,req.file.originalname,req.body.sheetName,Number(req.body.headerRow||1)));});
app.post('/api/events/:eventId/import/sheet',edit,expensive,async(req,res)=>{const b=z.object({url:z.string().max(1000),sheetName:z.string().max(200).optional(),headerRow:z.number().int().min(1).max(50).default(1)}).parse(req.body);await stage(req,res,await readSheet(b.url,b.sheetName,b.headerRow));});
async function getImport(req,c=pool){const id=z.string().uuid().parse(req.params.importId);const {rows:[i]}=await c.query("SELECT * FROM imports WHERE id=$1 AND event_id=$2 AND user_id=$3 AND created_at>now()-interval '1 day'",[id,req.event.id,req.user.id]);if(!i)fail(404,'Phiên nhập đã hết hạn.');return i;}
const mappingSchema=z.record(z.enum(Object.keys(fields)),z.string().max(200));
function parseImport(payload,mapping,sourceColumns=payload.sourceColumns||[]){const m=mappingSchema.parse(mapping);for(const v of Object.values(m))if(v&&!payload.headers.includes(v))fail(400,'Tên cột không tồn tại trong nguồn dữ liệu.');const columns=validateSourceColumns(payload.headers,sourceColumns);try{return normalizeRows(payload.raw,m,columns);}catch(e){fail(400,e.message);}}
app.post('/api/events/:eventId/import/:importId/ai',edit,expensive,async(req,res)=>{const i=await getImport(req);const m=await suggestMapping(i.payload.headers);parseImport(i.payload,m);res.json(m);});
app.post('/api/events/:eventId/import/:importId/preview',edit,async(req,res)=>{const i=await getImport(req);const parsed=parseImport(i.payload,req.body.mapping,req.body.sourceColumns);res.json({quality:parsed.quality,sample:parsed.rows.slice(0,5),summary:summarize(parsed.rows,req.event.settings)});});
app.post('/api/events/:eventId/import/:importId/commit',edit,async(req,res)=>{
  const b=z.object({mapping:mappingSchema,autoSync:z.boolean().default(false),sourceColumns:z.array(z.string().max(200)).max(12).optional()}).parse(req.body);
  const id=await transaction(async c=>{
    await c.query('SELECT id FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const i=await getImport(req,c);const columns=validateSourceColumns(i.payload.headers,b.sourceColumns??i.payload.sourceColumns??[]);const parsed=parseImport(i.payload,b.mapping,columns);
    const snapshot=await saveSnapshot(c,req.event.id,req.user.id,i.label,parsed.rows,parsed.quality);
    const source=i.payload.source?{...i.payload.source,mapping:b.mapping,sourceColumns:columns,sourceHeaders:i.payload.headers,discovery:i.payload.discovery,enabled:b.autoSync,fingerprint:createHash('sha256').update(JSON.stringify(parsed.rows)).digest('hex')}:null;
    await c.query('UPDATE events SET source=$1,sync_error=null,synced_at=now() WHERE id=$2',[source?JSON.stringify(source):null,req.event.id]);
    await c.query('DELETE FROM imports WHERE id=$1',[i.id]);return snapshot;
  });res.json({id});
});
app.post('/api/events/:eventId/sync',edit,expensive,async(req,res)=>res.json(await syncEvent(req.event.id,req.user.id)));
app.patch('/api/events/:eventId/source',edit,async(req,res)=>{const b=z.object({enabled:z.boolean()}).parse(req.body);const r=await pool.query("UPDATE events SET source=jsonb_set(source,'{enabled}',$1::jsonb) WHERE id=$2 AND source IS NOT NULL RETURNING id",[JSON.stringify(b.enabled),req.event.id]);if(!r.rowCount)fail(400,'Chưa có nguồn Google Sheet.');await audit(pool,req.event.id,req.user.id,'source.toggled',b);res.json({ok:true});});
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
  return {snapshot:{id:s.id,label:s.label,created_at:s.created_at},quality:s.quality,sourceDimensions:sourceBreakdowns(selectRows(s.rows,req.event.settings,r.from,r.to)),current:summarize(s.rows,req.event.settings,r.from,r.to,filters,r.mode),comparison:r.compareFrom?summarize(s.rows,req.event.settings,r.compareFrom,r.compareTo,filters,r.mode):null,range:r};
}
app.get('/api/events/:eventId/report',read,async(req,res)=>res.json(await report(req)));
app.get('/api/events/:eventId/export.xlsx',read,expensive,async(req,res)=>{
  const selected=req.query.reports===undefined?reportTypes:z.array(z.enum(reportTypes)).max(5).parse(z.string().max(100).parse(req.query.reports).split(',').filter(Boolean));
  const data=await report(req),wb=await buildReportWorkbook(req.event,data,selected);
  const buffer=await wb.xlsx.writeBuffer();
  res.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition','attachment; filename="MISA-Event-Report.xlsx"');res.send(Buffer.from(buffer));
});
app.get('/api/events/:eventId/rows',read,async(req,res)=>{const s=await snapshot(req);const page=z.coerce.number().int().min(1).max(10000).parse(req.query.page||1);const query=z.string().max(150).parse(req.query.q||'');const rows=query?s.rows.filter(r=>[r.name,r.company,r.email,r.tracking].some(v=>norm(v).includes(norm(query)))):s.rows;res.json({rows:rows.slice((page-1)*50,page*50),total:rows.length,page});});
app.patch('/api/events/:eventId/rows/:rowId',edit,async(req,res)=>{
  const b=z.object({snapshot:z.string().uuid(),row:z.object(Object.fromEntries(Object.keys(fields).map(k=>[k,z.string().max(1000)])))}).parse(req.body);
  const id=await transaction(async c=>{const {rows:[e]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);if(e.active_snapshot_id!==b.snapshot)fail(409,'Dữ liệu đã thay đổi. Tải lại trước khi chỉnh sửa.');const {rows:[s]}=await c.query('SELECT * FROM snapshots WHERE id=$1 AND event_id=$2',[e.active_snapshot_id,e.id]);const row=s.rows.find(r=>r.id===req.params.rowId);if(!row)fail(404,'Không tìm thấy dòng.');const dt=parseDate(b.row.submitted_at);if(b.row.submitted_at&&!dt)fail(400,'Thời gian không hợp lệ.');Object.assign(row,b.row,{submitted_at:dt,attendance_mode:attendanceMode(b.row.attendance_mode)});const quality={...s.quality,invalidDates:s.rows.filter(r=>!r.submitted_at).length,missingPosition:s.rows.filter(r=>!r.position).length};const id=await saveSnapshot(c,e.id,req.user.id,'Chỉnh sửa dữ liệu',s.rows,quality);await c.query("UPDATE events SET source=CASE WHEN source IS NULL THEN NULL ELSE jsonb_set(source,'{enabled}','false') END WHERE id=$1",[e.id]);return id;});res.json({id});
});
app.post('/api/events/:eventId/insights',read,expensive,async(req,res)=>{
  const data=await report(req);
  // Only precomputed group aggregates go to the model; row-level contacts and staff names stay in the app.
  delete data.current.targets;if(data.comparison)delete data.comparison.targets;
  const insight=await gemini('Dựa CHỈ trên số liệu tổng hợp, trả tối đa 5 nhận xét ngắn về tiến độ, C-Level, nguồn đăng ký và chênh lệch kỳ. Nêu mẫu số. Không đoán nguyên nhân hoặc thông tin cá nhân. Nêu hạn chế nếu không có kỳ so sánh.',data,{type:'OBJECT',properties:{summary:{type:'STRING'},observations:{type:'ARRAY',items:{type:'STRING'}}},required:['summary','observations']});
  const parsed=z.object({summary:z.string().max(5000),observations:z.array(z.string().max(3000)).max(8)}).parse(insight);await audit(pool,req.event.id,req.user.id,'ai.report',{snapshot:data.snapshot.id,model:process.env.GEMINI_MODEL||'gemini-4-argon'});res.json({...parsed,model:process.env.GEMINI_MODEL||'gemini-4-argon',snapshot:data.snapshot.id});
});
app.get('/api/events/:eventId/audit',owner,async(req,res)=>{const {rows}=await pool.query('SELECT a.action,a.detail,a.created_at,u.name FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE a.event_id=$1 ORDER BY a.id DESC LIMIT 100',[req.event.id]);res.json(rows);});
app.use('/vendor/chart',express.static(path.resolve('node_modules/chart.js/dist')));
app.use('/vendor/html2canvas',express.static(path.resolve('node_modules/html2canvas/dist')));
app.use(express.static(path.resolve('dist')));
app.get(/^\/[^/]+\/(?:tong-quan|du-lieu|nguon-du-lieu|muc-tieu|thanh-vien|nhat-ky)\/?$/,(req,res)=>res.sendFile(path.resolve('dist/index.html')));
app.use((err,req,res,next)=>{if(res.headersSent)return next(err);let status=err.status||500,message=err.status?err.message:'Đã xảy ra lỗi. Vui lòng thử lại.';if(err instanceof z.ZodError){status=400;message='Dữ liệu không hợp lệ: '+err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ');}if(err.code==='LIMIT_FILE_SIZE'){status=413;message='File tối đa 10 MB.';}if(err.code==='23505'){status=409;message='Dữ liệu đã tồn tại. Vui lòng tải lại.';}console.error(JSON.stringify({type:'request_error',status,code:err.code||err.name}));res.status(status).json({error:message});});
await migrate();await bootstrap();
const server=app.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('MISA Event Insights ready'));
let running=false;
const interval=Number(process.env.SYNC_INTERVAL_SECONDS||0);
const timer=interval>0?setInterval(async()=>{if(running)return;running=true;try{await syncAll();}catch{console.error('sync_batch_failed');}finally{running=false;}},Math.max(interval,60)*1000):null;
async function shutdown(){if(timer)clearInterval(timer);server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
