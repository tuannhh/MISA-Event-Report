import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {pool,transaction,audit} from './db.js';
import {fail,hashPassword} from './auth.js';
import {isMisaEmail,strongPassword} from './account-policy.js';
import {readFile} from './ingestion.js';
import {norm} from './domain.js';
const account=z.object({name:z.string().trim().min(1).max(150),email:z.string().trim().toLowerCase().email().max(200).refine(isMisaEmail,'Chỉ chấp nhận email MISA'),role:z.enum(['editor','admin','viewer']).default('editor')});
function checkGrant(req,role){if(req.user.global_role!=='super_admin'&&role!=='editor')fail(403,'Admin sự kiện chỉ được cấp quyền Editor.');}
async function provision(c,row,eventId){
  const initial=process.env.DEFAULT_MEMBER_PASSWORD;
  if(!strongPassword(initial))fail(503,'Chưa cấu hình mật khẩu ban đầu hợp lệ.');
  const {rows:[old]}=await c.query('SELECT id FROM users WHERE email=$1',[row.email]);
  let id=old?.id;
  if(!id){id=randomUUID();const result=await c.query('INSERT INTO users(id,email,name,password) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id',[id,row.email,row.name,hashPassword(initial)]);if(!result.rowCount)id=(await c.query('SELECT id FROM users WHERE email=$1',[row.email])).rows[0].id;}
  // Importing an existing account never resets its password, name, or higher privilege.
  if(row.role!=='viewer')await c.query("INSERT INTO members(event_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(event_id,user_id) DO UPDATE SET role=CASE WHEN members.role='admin' THEN 'admin' ELSE EXCLUDED.role END",[eventId,id,row.role]);
  return id;
}
export function memberRoutes(app,{read,owner,upload}){
  app.get('/api/events/:eventId/members',read,async(req,res)=>{const {rows}=await pool.query('SELECT u.id,u.name,u.email,m.role,u.active FROM members m JOIN users u ON u.id=m.user_id WHERE event_id=$1 AND u.active=true ORDER BY u.name',[req.event.id]);res.json(rows);});
  app.post('/api/events/:eventId/members',owner,async(req,res)=>{const row=account.parse(req.body);checkGrant(req,row.role);await transaction(async c=>{await provision(c,row,req.event.id);await audit(c,req.event.id,req.user.id,'member.added',{email:row.email,role:row.role});});res.status(201).json({ok:true});});
  app.post('/api/events/:eventId/members/import/preview',owner,upload.single('file'),async(req,res)=>{
    if(!req.file)fail(400,'Chọn file Excel có Họ và tên, Email.');
    const data=await readFile(req.file.buffer,req.file.originalname,undefined,undefined,{goals:false});if(data.raw.length>500)fail(400,'Tối đa 500 thành viên mỗi lần nhập.');
    const name=data.headers.find(h=>['ho va ten','name'].includes(norm(h))),email=data.headers.find(h=>norm(h)==='email');
    if(!name||!email)fail(400,'File cần hai cột Họ và tên, Email.');
    const seen=new Set(),errors=[],rows=[];
    data.raw.forEach((r,i)=>{const parsed=account.safeParse({name:r[name],email:r[email],role:'editor'});if(!parsed.success){errors.push({row:i+2,message:'Họ tên hoặc email MISA không hợp lệ'});return;}if(seen.has(parsed.data.email)){errors.push({row:i+2,message:'Email trùng trong file'});return;}seen.add(parsed.data.email);rows.push(parsed.data);});
    res.json({rows,errors,total:data.raw.length});
  });
  app.post('/api/events/:eventId/members/import',owner,async(req,res)=>{const rows=z.array(account).min(1).max(500).parse(req.body.rows);if(rows.some(r=>r.role!=='editor'))fail(400,'Import chỉ cấp quyền Editor.');if(new Set(rows.map(r=>r.email)).size!==rows.length)fail(400,'Email trùng trong danh sách.');await transaction(async c=>{for(const row of rows)await provision(c,row,req.event.id);await audit(c,req.event.id,req.user.id,'members.imported',{count:rows.length});});res.json({count:rows.length});});
  app.patch('/api/events/:eventId/members/:userId',owner,async(req,res)=>{if(req.user.global_role!=='super_admin')fail(403,'Chỉ Super admin được đổi cấp quyền.');const role=z.enum(['admin','editor']).parse(req.body.role),id=z.string().uuid().parse(req.params.userId);await transaction(async c=>{const result=await c.query('UPDATE members SET role=$1 WHERE event_id=$2 AND user_id=$3 RETURNING user_id',[role,req.event.id,id]);if(!result.rowCount)fail(404,'Không tìm thấy thành viên.');await audit(c,req.event.id,req.user.id,'member.role',{userId:id,role});});res.json({ok:true});});
  app.delete('/api/events/:eventId/members/:userId',owner,async(req,res)=>{const id=z.string().uuid().parse(req.params.userId);await transaction(async c=>{const {rows:[member]}=await c.query('SELECT role FROM members WHERE event_id=$1 AND user_id=$2 FOR UPDATE',[req.event.id,id]);if(!member)fail(404,'Không tìm thấy thành viên.');if(member.role==='admin'&&req.user.global_role!=='super_admin')fail(403,'Admin không được thu hồi quyền Admin.');await c.query('DELETE FROM members WHERE event_id=$1 AND user_id=$2',[req.event.id,id]);await audit(c,req.event.id,req.user.id,'member.removed',{userId:id});});res.json({ok:true});});
}
