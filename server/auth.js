import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {pool,transaction} from './db.js';
export const token = () => randomBytes(32).toString('hex');
export const digest = t => createHash('sha256').update(t).digest('hex');
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password,hash){const [salt,key]=hash.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(key,'hex'));}
export function fail(status,message){const e=new Error(message);e.status=status;throw e;}
export function cookieToken(req){return req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('session='))?.slice(8)||'';}
export async function authenticate(req,res,next){
  const {rows}=await pool.query('SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>now()',[digest(cookieToken(req))]);
  if(!rows[0])fail(401,'Vui lòng đăng nhập.');req.user=rows[0];next();
}
export function authorize(...roles){return async(req,res,next)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.eventId))fail(404,'Không tìm thấy sự kiện.');
  const {rows}=await pool.query('SELECT e.*,m.role FROM events e JOIN members m ON m.event_id=e.id WHERE e.id=$1 AND m.user_id=$2',[req.params.eventId,req.user.id]);
  if(!rows[0])fail(404,'Không tìm thấy sự kiện.');
  if(roles.length&&!roles.includes(rows[0].role))fail(403,'Bạn không có quyền thực hiện thao tác này.');
  req.event=rows[0];next();
};}
export async function bootstrap(){
  await transaction(async c=>{
    await c.query('SELECT pg_advisory_xact_lock(847202)');
    const {rows}=await c.query('SELECT 1 FROM users LIMIT 1');if(rows.length)return;
    const password=process.env.BOOTSTRAP_PASSWORD,email=process.env.BOOTSTRAP_EMAIL;
    if(!password||password.length<12||!email)throw Error('Set BOOTSTRAP_EMAIL and a BOOTSTRAP_PASSWORD of at least 12 characters.');
    await c.query('INSERT INTO users(id,email,password,name) VALUES($1,$2,$3,$4)',[randomUUID(),email.toLowerCase(),hashPassword(password),'Quản trị sự kiện']);
  });
}
export async function createSession(res,userId){const t=token();await pool.query('INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[digest(t),userId]);res.cookie('session',t,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE!=='false',maxAge:12*3600000,path:'/'});}
