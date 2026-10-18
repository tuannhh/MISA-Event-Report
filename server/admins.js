import {z} from 'zod';
import {pool,transaction,audit} from './db.js';
import {fail} from './auth.js';
import {isMisaEmail} from './account-policy.js';
import {provisionAccount} from './members.js';
const account=z.object({name:z.string().trim().min(1).max(150),email:z.string().trim().toLowerCase().email().max(200).refine(isMisaEmail,'Chỉ chấp nhận email MISA')});
function superOnly(req,res,next){if(req.user.global_role!=='super_admin')fail(403,'Chỉ Super admin được thiết lập Admin.');next();}
export function adminRoutes(app){
 app.get('/api/admins',superOnly,async(req,res)=>{const {rows}=await pool.query("SELECT id,name,email,active FROM users WHERE global_role='admin' ORDER BY name,email");res.json(rows);});
 app.post('/api/admins',superOnly,async(req,res)=>{
  const data=account.parse(req.body);
  const id=await transaction(async c=>{
   const id=await provisionAccount(c,data);
   const {rows:[user]}=await c.query('SELECT global_role,active FROM users WHERE id=$1 FOR UPDATE',[id]);
   if(user.global_role==='super_admin')fail(409,'Tài khoản này là Super admin.');
   if(!user.active)fail(409,'Tài khoản đã bị vô hiệu hóa.');
   if(user.global_role==='admin')fail(409,'Tài khoản đã có quyền Admin.');
   await c.query("UPDATE users SET global_role='admin' WHERE id=$1",[id]);
   await audit(c,null,req.user.id,'admin.granted',{userId:id});return id;
  });res.status(201).json({id});
 });
 app.delete('/api/admins/:userId',superOnly,async(req,res)=>{
  const id=z.string().uuid().parse(req.params.userId);
  await transaction(async c=>{const r=await c.query("UPDATE users SET global_role='viewer' WHERE id=$1 AND global_role='admin' RETURNING id",[id]);if(!r.rowCount)fail(404,'Không tìm thấy Admin.');await audit(c,null,req.user.id,'admin.revoked',{userId:id});});
  res.json({ok:true});
 });
}
