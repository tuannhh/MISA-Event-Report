import test from 'node:test';
import assert from 'node:assert/strict';
import {destination,canEditEvent} from '../frontend/navigation.js';
const user={must_change_password:false};

test('unauthenticated deep links and root resolve to the canonical login page',()=>{
  for(const path of ['/','/su-kien','/sample-123abc/thanh-vien','/change-password']) {
    assert.deepEqual(destination(path,null),{screen:'login',path:'/log-in'});
  }
});
test('successful login always goes through the event list and mandatory password gate',()=>{
  assert.deepEqual(destination('/sample-123abc/thanh-vien',user,true),{screen:'events',path:'/su-kien'});
  assert.deepEqual(destination('/log-in',{must_change_password:true},true),{screen:'password',path:'/change-password'});
  assert.deepEqual(destination('/change-password',user,true),{screen:'events',path:'/su-kien'});
  for(const path of ['/','/log-in','/su-kien','/su-kien/'])assert.equal(destination(path,user).screen,'events');
});
test('authenticated refresh retains valid event routes without selecting the first event',()=>{
  assert.deepEqual(destination('/sample-123abc/thanh-vien',user),{screen:'event',slug:'sample-123abc',feature:'thanh-vien'});
  assert.deepEqual(destination('/unknown',user),{screen:'events',path:'/su-kien',missing:true});
});
test('event edit labels depend on the role returned for that event',()=>{
  assert.equal(canEditEvent({role:'viewer'}),false);
  assert.equal(canEditEvent(null),false);
  for(const role of ['editor','admin','super_admin'])assert.equal(canEditEvent({role}),true);
});
