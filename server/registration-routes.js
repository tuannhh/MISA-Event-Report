import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {pool,transaction,audit} from './db.js';
import {fail} from './auth.js';
import {fields,parseDate,norm} from './domain.js';
import {identifiers} from './identifiers.js';
import {attendanceMode} from './account-policy.js';
import {assignedRows,editableRegistration,projectSnapshot,mergeNonempty} from './registry.js';
const rowSchema=z.object(Object.fromEntries(Object.keys(fields).filter(k=>k!=='call_status').map(k=>[k,z.string().max(1000).optional()]))).extend({utm_content:z.string().max(1000).optional(),registration_status:z.enum(['invited','registered']).optional()});
const contactSchema=z.object({version:z.number().int().positive(),channel:z.enum(['phone','paper','email','other']),called:z.boolean(),response:z.enum(['pending','confirmed','declined','no_answer','call_back']),note:z.string().max(3000).default(''),follow_up_at:z.string().nullable().optional()}).refine(v=>v.channel==='phone'||!v.called,'Chỉ đánh dấu đã gọi khi liên hệ qua điện thoại.');
function parseRow(input){const row=rowSchema.parse(input);const data=Object.fromEntries(Object.entries(identifiers(row)).filter(([key])=>key in row));if(row.submitted_at!==undefined){data.submitted_at=parseDate(row.submitted_at);if(row.submitted_at&&!data.submitted_at)fail(400,'Thời gian không hợp lệ.');}if(row.attendance_mode!==undefined)data.attendance_mode=attendanceMode(row.attendance_mode);return data;}
export function registrationRoutes(app,{read,edit,owner}){
 const base='/api/events/:eventId';
 app.get(base+'/sources',read,async(req,res)=>{const {rows}=await pool.query('SELECT id,label,kind,mode,enabled,synced_at,error FROM event_sources WHERE event_id=$1 ORDER BY label',[req.event.id]);res.json(rows);});
 app.patch(base+'/sources/:sourceId',owner,async(req,res)=>{const {enabled}=z.object({enabled:z.boolean()}).parse(req.body);const r=await pool.query("UPDATE event_sources SET enabled=$1 WHERE id=$2 AND event_id=$3 AND kind='sheet'",[enabled,z.string().uuid().parse(req.params.sourceId),req.event.id]);if(!r.rowCount)fail(404,'Không tìm thấy nguồn Google Sheet.');await audit(pool,req.event.id,req.user.id,'source.toggled',{id:req.params.sourceId,enabled});res.json({ok:true});});
 app.get(base+'/assignments',owner,async(req,res)=>{const {rows}=await pool.query('SELECT code,user_id FROM staff_assignments WHERE event_id=$1 ORDER BY code',[req.event.id]);res.json(rows);});
 app.put(base+'/assignments',owner,async(req,res)=>{
  const {assignments}=z.object({assignments:z.array(z.object({code:z.string().trim().min(1).max(200),user_id:z.string().uuid()})).max(1000)}).parse(req.body);
  if(new Set(assignments.map(a=>norm(a.code))).size!==assignments.length)fail(400,'Mã nhân viên bị trùng.');
  await transaction(async c=>{await c.query('SELECT id FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const {rows:members}=await c.query('SELECT user_id FROM members WHERE event_id=$1',[req.event.id]);if(assignments.some(a=>!members.some(m=>m.user_id===a.user_id)))fail(400,'Người phụ trách phải là thành viên sự kiện.');await c.query('DELETE FROM staff_assignments WHERE event_id=$1',[req.event.id]);for(const a of assignments)await c.query('INSERT INTO staff_assignments(event_id,code,user_id) VALUES($1,$2,$3)',[req.event.id,norm(a.code),a.user_id]);await audit(c,req.event.id,req.user.id,'assignments.updated',{count:assignments.length});});res.json({ok:true});
 });
 app.post(base+'/rows',edit,async(req,res)=>{
  const data=parseRow(req.body);if(![data.name,data.phone,data.email].some(Boolean))fail(400,'Cần họ tên, số điện thoại hoặc email.');
  if(data.attendance_mode==='both')fail(400,'Thêm riêng đăng ký Online và Offline.');
  data.attendance_mode=data.attendance_mode|| (req.event.mode==='hybrid'?'unknown':req.event.mode);data.registration_status??='registered';data.call_status='not_called';
  const result=await transaction(async c=>{const {rows:[event]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const [permission]=await assignedRows(c,event.id,[data],req.user);if(!permission.can_edit)fail(403,'Chọn mã nhân viên đã phân công cho bạn.');const id=randomUUID();await c.query('INSERT INTO registrations(id,event_id,data) VALUES($1,$2,$3)',[id,event.id,JSON.stringify(data)]);await projectSnapshot(c,event,req.user.id,'Thêm khách');await audit(c,event.id,req.user.id,'registration.created',{id});return {id};});res.status(201).json(result);
 });
 app.patch(base+'/rows/:rowId',edit,async(req,res)=>{
  if(req.body.row?.call_status!==undefined)fail(409,'Ứng dụng đã nâng cấp. Hãy tải lại và dùng Cập nhật liên hệ để lưu kết quả gọi.');
  const body=z.object({version:z.number().int().positive().optional(),snapshot:z.string().uuid().optional(),row:rowSchema}).parse(req.body),data=parseRow(body.row);
  const id=await transaction(async c=>{const {rows:[event]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const record=await editableRegistration(c,event,req.params.rowId,req.user);
   if(body.version?body.version!==record.version:body.snapshot!==event.active_snapshot_id)fail(409,'Khách đã được cập nhật. Tải lại trước khi lưu.');
   if(data.attendance_mode==='both')fail(400,'Mỗi đăng ký chỉ thuộc Online hoặc Offline.');
   // Only an administrator can change assignment codes; contact edits never change import ownership.
   const {rows:[member]}=await c.query('SELECT role FROM members WHERE event_id=$1 AND user_id=$2',[event.id,req.user.id]);
   if(req.user.global_role!=='super_admin'&&member?.role!=='admin'&&['staff_code','tracking','utm_content'].some(k=>data[k]!==undefined&&data[k]!==({...record.data,...record.overrides})[k]))fail(403,'Chỉ Admin được đổi người phụ trách.');
   await c.query('UPDATE registrations SET overrides=overrides||$1::jsonb,version=version+1,updated_at=now() WHERE id=$2',[JSON.stringify(data),record.id]);return projectSnapshot(c,event,req.user.id,'Cập nhật khách');});res.json({id});
 });
 app.get(base+'/rows/:rowId/contacts',read,async(req,res)=>{const id=z.string().uuid().parse(req.params.rowId),pageSize=z.coerce.number().refine(v=>[20,50,100].includes(v)).parse(req.query.pageSize||20),requested=z.coerce.number().int().min(1).max(10000).parse(req.query.page||1);const {rows:[{total}]}=await pool.query('SELECT count(*)::int total FROM contact_logs WHERE event_id=$1 AND registration_id=$2',[req.event.id,id]);const page=Math.min(requested,Math.max(1,Math.ceil(total/pageSize)));const {rows}=await pool.query('SELECT l.id,l.channel,l.called,l.response,l.note,l.follow_up_at,l.created_at,u.name AS actor FROM contact_logs l JOIN users u ON u.id=l.user_id WHERE l.event_id=$1 AND l.registration_id=$2 ORDER BY l.created_at DESC,l.id LIMIT $3 OFFSET $4',[req.event.id,id,pageSize,(page-1)*pageSize]);res.json({rows,total,page,pageSize});});
 app.post(base+'/rows/:rowId/contacts',edit,async(req,res)=>{
  const body=contactSchema.parse(req.body);const follow=body.follow_up_at?parseDate(body.follow_up_at):null;if(body.follow_up_at&&!follow)fail(400,'Lịch liên hệ lại không hợp lệ.');
  const result=await transaction(async c=>{const {rows:[event]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const record=await editableRegistration(c,event,req.params.rowId,req.user);if(record.version!==body.version)fail(409,'Khách đã được cập nhật. Tải lại để xem thay đổi.');
   const current={...record.data,...record.overrides},overrides={contact_response:body.response,contact_note:body.note,follow_up_at:follow};
   // Call evidence is monotonic. Paper confirmations do not claim a phone call.
   overrides.call_status=body.called||current.call_status==='called'?'called':current.call_status||'not_called';
   if(body.response==='confirmed')overrides.registration_status='registered';
   await c.query('INSERT INTO contact_logs(id,event_id,registration_id,user_id,channel,called,response,note,follow_up_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),event.id,record.id,req.user.id,body.channel,body.called,body.response,body.note,follow]);
   await c.query('UPDATE registrations SET overrides=overrides||$1::jsonb,version=version+1,updated_at=now() WHERE id=$2',[JSON.stringify(overrides),record.id]);await audit(c,event.id,req.user.id,'contact.logged',{registration:record.id,channel:body.channel,called:body.called,response:body.response});return {id:await projectSnapshot(c,event,req.user.id,'Cập nhật liên hệ')};});res.json(result);
 });
 app.get(base+'/conflicts',owner,async(req,res)=>{const pageSize=z.coerce.number().refine(v=>[20,50,100].includes(v)).parse(req.query.pageSize||20),page=z.coerce.number().int().min(1).max(10000).parse(req.query.page||1);const {rows:[{total}]}=await pool.query('SELECT count(*)::int total FROM import_conflicts WHERE event_id=$1 AND resolved_at IS NULL',[req.event.id]);const {rows}=await pool.query('SELECT * FROM import_conflicts WHERE event_id=$1 AND resolved_at IS NULL ORDER BY id LIMIT $2 OFFSET $3',[req.event.id,pageSize,(page-1)*pageSize]);const ids=rows.flatMap(r=>r.candidates);const {rows:candidates}=await pool.query('SELECT id,data||overrides AS data FROM registrations WHERE event_id=$1 AND id=ANY($2::uuid[])',[req.event.id,ids]);res.json({rows:rows.map(r=>({...r,candidates:candidates.filter(c=>r.candidates.includes(c.id))})),total,page,pageSize});});
 app.post(base+'/conflicts/:conflictId',owner,async(req,res)=>{
  const b=z.object({registration_id:z.string().uuid().nullable()}).parse(req.body);await transaction(async c=>{const {rows:[event]}=await c.query('SELECT * FROM events WHERE id=$1 FOR UPDATE',[req.event.id]);const {rows:[conflict]}=await c.query('SELECT * FROM import_conflicts WHERE id=$1 AND event_id=$2 AND resolved_at IS NULL FOR UPDATE',[z.string().uuid().parse(req.params.conflictId),event.id]);if(!conflict)fail(404,'Vấn đề đã được xử lý.');let id=b.registration_id;
   if(id){const {rows:[record]}=await c.query('SELECT * FROM registrations WHERE id=$1 AND event_id=$2',[id,event.id]);if(!record||!conflict.candidates.includes(id))fail(400,'Khách không thuộc danh sách đối chiếu.');await c.query('UPDATE registrations SET data=$1,version=version+1,updated_at=now() WHERE id=$2',[JSON.stringify(mergeNonempty(record.data,conflict.data)),id]);}
   else{id=randomUUID();await c.query('INSERT INTO registrations(id,event_id,data) VALUES($1,$2,$3)',[id,event.id,JSON.stringify(conflict.data)]);}
   await c.query('INSERT INTO source_records(source_id,record_key,registration_id) VALUES($1,$2,$3) ON CONFLICT(source_id,record_key) DO UPDATE SET registration_id=excluded.registration_id',[conflict.source_id,conflict.record_key,id]);await c.query('UPDATE import_conflicts SET resolved_at=now(),resolved_by=$1 WHERE id=$2',[req.user.id,conflict.id]);await projectSnapshot(c,event,req.user.id,'Đối chiếu khách trùng');await audit(c,event.id,req.user.id,'conflict.resolved',{id:conflict.id,registration:id});});res.json({ok:true});
 });
}
