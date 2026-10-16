import {randomBytes} from 'node:crypto';
export function eventSlugBase(name) {
  return String(name).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/×/g,'x').replace(/[^a-z0-9.]+/g,'-').replace(/^[.-]+|[.-]+$/g,'').slice(0,100).replace(/[.-]+$/g,'') || 'su-kien';
}
export async function allocateEventSlug(client,name) {
  for(let attempt=0;attempt<10;attempt++){
    const slug=`${eventSlugBase(name)}-${randomBytes(3).toString('hex')}`;
    const {rowCount}=await client.query('SELECT 1 FROM events WHERE slug=$1',[slug]);
    if(!rowCount)return slug;
  }
  throw Error('Cannot allocate a unique event slug');
}
