import test from 'node:test';
import assert from 'node:assert/strict';
import {eventSlugBase,allocateEventSlug} from '../server/event-slug.js';
test('event URLs normalize Vietnamese names and keep a six-character unique suffix',async()=>{
  assert.equal(eventSlugBase('28.10 CEO×AI Đà Nẵng'),'28.10-ceoxai-da-nang');
  assert.equal(eventSlugBase('///'),'su-kien');
  let calls=0;const slug=await allocateEventSlug({query:async()=>({rowCount:++calls===1?1:0})},'Sự kiện');
  assert.match(slug,/^su-kien-[a-f0-9]{6}$/);assert.equal(calls,2);
});
