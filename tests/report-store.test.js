import test from 'node:test';
import assert from 'node:assert/strict';
import {nextTick} from 'vue';
globalThis.location={pathname:'/qa-123abc/tong-quan',search:''};
globalThis.history={pushState(_a,_b,p){location.pathname=p;},replaceState(_a,_b,p){location.pathname=p;}};
globalThis.window={addEventListener(){},setInterval(){}};
globalThis.document={addEventListener(){},visibilityState:'visible'};
const store=await import('../frontend/store.js');
const {s,stageFile,sourceValue,resetFilters,refreshLatest,loadReport,insights}=store;
const pause=()=>new Promise(r=>setTimeout(r,10));
const event={id:'qa-event',slug:'qa-123abc',role:'super_admin',active_snapshot_id:'latest',settings:{clevel:[],reports:[],target:10}};
function report(snapshot='latest',total=4){return {snapshot:{id:snapshot},sourceDimensions:[],current:{total},range:{}};}
function response(data){return {ok:true,json:async()=>structuredClone(data)};}

test('import returns directly to latest unfiltered report and requests automatic publication',async()=>{
 s.event=structuredClone(event);s.route='nguon-du-lieu';
 s.filters={from:new Date('2025-01-01'),to:new Date('2025-01-02'),snapshot:'old',mode:'online'};s.sources={Staff:'Old'};
 let uploaded=false;const reportUrls=[];
 globalThis.fetch=async(url,opts)=>{
  if(url.endsWith('/import/file')){assert.equal(opts.body.get('automatic'),'true');uploaded=true;return response({committed:true,snapshotId:'latest'});}
  if(url.includes('/report?')){reportUrls.push(url);return response(report());}
  if(url.endsWith('/refresh'))return response({skipped:true});
  if(url.endsWith('/snapshots'))return response([{id:'latest'}]);
  if(url.includes('/insights?'))return response({summary:'latest',observations:[]});
  return response(event);
 };
 await stageFile([new File(['sample'],'qa.csv')]);await nextTick();await pause();
 assert.equal(uploaded,true);assert.equal(s.route,'tong-quan');assert.equal(s.report.current.total,4);
 const q=new URL(reportUrls.at(-1),'http://localhost').searchParams;
 for(const key of ['from','to','snapshot'])assert.equal(q.has(key),false);
 assert.equal(q.get('mode'),'all');assert.equal(q.get('sourceFilters'),'{}');
 assert.equal(s.stage,null);
});

test('latest refresh preserves filters; historical selection does not sync; late AI cannot replace current report',async()=>{
 await pause();s.event=structuredClone(event);s.route='tong-quan';resetFilters();await nextTick();await pause();
 s.filters.snapshot='historical';await nextTick();await pause();
 let refreshCalls=0;
 globalThis.fetch=async(url)=>{if(url.endsWith('/refresh'))refreshCalls++;return response(report());};
 await refreshLatest();assert.equal(refreshCalls,0);
 s.filters.snapshot='';s.sources={Staff:'A'};
 let resolveOld;
 globalThis.fetch=async(url)=>{
  if(url.includes('/report?'))return response(report('new-snapshot',2));
  if(url.includes('/insights?'))return new Promise(resolve=>{resolveOld=()=>resolve(response({summary:'OLD',observations:[]}));});
  if(url.endsWith('/refresh')){refreshCalls++;return response({changed:true});}
  if(url.endsWith('/snapshots'))return response([{id:'new-snapshot'}]);
  return response({...event,active_snapshot_id:'new-snapshot'});
 };
 await nextTick();await pause();s.report=report('old-snapshot',4);
 const pending=insights();await pause();
 await refreshLatest();assert.equal(s.report.snapshot.id,'new-snapshot');assert.deepEqual({...s.sources},{Staff:'A'});
 resolveOld();await pending;assert.equal(s.insight,null);
 // Do not let delayed automatic insight outlive the test state.
 s.event=null;resetFilters();
});

test('source chart defaults to UTM campaign and keeps a deliberate dimension selection',async()=>{
 s.event=structuredClone(event);s.dimension='';
 globalThis.fetch=async()=>response({...report(null,0),sourceDimensions:[{name:'utm_source'},{name:'UTM_campaign'}]});
 await loadReport();assert.equal(s.dimension,'UTM_campaign');
 s.dimension='utm_source';await loadReport();assert.equal(s.dimension,'utm_source');
 assert.equal(store.reports.some(r=>r.value==='targets'),false);
 s.event=null;
});
