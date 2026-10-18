import {isMisaEmail} from './account-policy.js';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {pool,transaction} from './db.js';
export const token = () => randomBytes(32).toString('hex');
export const digest = t => createHash('sha256').update(t).digest('hex');
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password,hash){const [salt,key]=hash.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(key,'hex'));}
export function fail(status,message){const e=new Error(message);e.status=status;throw e;}
export function cookieToken(req){return req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('session='))?.slice(8)||'';}
export async function authenticate(req,res,next){
  const {rows}=await pool.query('SELECT u.id,u.email,u.name,u.global_role,u.must_change_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>now() AND u.active=true',[digest(cookieToken(req))]);
  if(!rows[0])fail(401,'Vui lòng đăng nhập.');req.user=rows[0];next();
}
export function authorize(...roles){return async(req,res,next)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.eventId))fail(404,'Không tìm thấy sự kiện.');
  const {rows}=await pool.query("SELECT e.*,COALESCE(m.role,'viewer') AS role FROM events e LEFT JOIN members m ON m.event_id=e.id AND m.user_id=$2 WHERE e.id=$1",[req.params.eventId,req.user.id]);
  if(!rows[0])fail(404,'Không tìm thấy sự kiện.');
  if(['super_admin','admin'].includes(req.user.global_role))rows[0].role=req.user.global_role;
  if(roles.length&&req.user.global_role!=='super_admin'&&!roles.includes(rows[0].role))fail(403,'Bạn không có quyền thực hiện thao tác này.');
  req.event=rows[0];next();
};}
export async function bootstrap(){
  await transaction(async c=>{
    await c.query('SELECT pg_advisory_xact_lock(847202)');
    const {rows:users}=await c.query('SELECT id,email FROM users');
    for(const u of users)if(!isMisaEmail(u.email)){await c.query('UPDATE users SET active=false WHERE id=$1',[u.id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[u.id]);}
    const email=(process.env.SUPER_ADMIN_EMAIL||'bmtuan@misa.com.vn').toLowerCase();
    if(!isMisaEmail(email))throw Error('SUPER_ADMIN_EMAIL must use MISA domain');
    const {rows:[existing]}=await c.query('SELECT id FROM users WHERE email=$1',[email]);
    if(existing){await c.query("UPDATE users SET global_role='super_admin',active=true WHERE id=$1",[existing.id]);return;}
    const password=process.env.SUPER_ADMIN_PASSWORD;
    if(!password||password.length<10)throw Error('Set SUPER_ADMIN_PASSWORD securely');
    await c.query("INSERT INTO users(id,email,password,name,global_role) VALUES($1,$2,$3,$4,'super_admin')",[randomUUID(),email,hashPassword(password),'Quản trị ứng dụng']);
  });
}
export async function createSession(res,userId){const t=token();await pool.query('INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[digest(t),userId]);res.cookie('session',t,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE!=='false',maxAge:12*3600000,path:'/'});}
