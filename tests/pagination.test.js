import test from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,ref} from 'vue';
import {usePagination} from '../frontend/pagination.js';
test('lists page all records, reset after filtering/resizing, and export all without losing current page',()=>{
 const scope=effectScope();scope.run(()=>{
  const rows=ref(Array.from({length:121},(_,id)=>({id}))),all=ref(false);
  const p=usePagination(rows,all);
  assert.equal(p.visibleRows.value.length,20);p.setPage(7);assert.deepEqual(p.visibleRows.value.map(r=>r.id),[120]);
  p.setPageSize(50);assert.equal(p.page.value,1);assert.equal(p.visibleRows.value.length,50);
  p.setPage(3);assert.equal(p.visibleRows.value.length,21);
  rows.value=rows.value.map(r=>({...r}));assert.equal(p.page.value,3);
  all.value=true;assert.equal(p.visibleRows.value.length,121);all.value=false;assert.equal(p.page.value,3);assert.equal(p.visibleRows.value[0].id,100);
  p.setPageSize(100);assert.equal(p.visibleRows.value.length,100);p.setPage(2);assert.equal(p.visibleRows.value.length,21);
  rows.value=rows.value.slice(0,3);assert.equal(p.page.value,1);assert.equal(p.visibleRows.value.length,3);
  p.setPageSize(30);assert.equal(p.pageSize.value,100);rows.value=[];p.setPage(99);assert.equal(p.page.value,1);assert.equal(p.total.value,0);assert.deepEqual(p.visibleRows.value,[]);
 });scope.stop();
});
