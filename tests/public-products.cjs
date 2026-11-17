// Exercise the real subscription implementation with an isolated SDK double.
// No Firebase connection, database writes, or seeded products are used.
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const source=fs.readFileSync('lib/firebase.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(){
 const listeners=[];let stopped=0;
 const sdk={collection:(_,name)=>({name}),where:(field,op,value)=>({field,op,value}),limit:value=>({limit:value}),query:(...parts)=>parts,onSnapshot:(query,options,next,error)=>{listeners.push({query,options,next,error});return()=>stopped++}};
 const exports={};vm.runInNewContext(js,{exports,require:name=>name==='firebase/firestore'?sdk:{}});
 const updates=[];let failures=0;
 const stop=exports.subscribePublicProducts({},rows=>updates.push(rows),()=>failures++);
 const emit=(index,rows,fromCache=false)=>listeners[index].next({metadata:{fromCache},docs:rows.map(row=>({id:row.id,data:()=>row}))});
 return {listeners,updates,emit,stop,get failures(){return failures},get stopped(){return stopped}};
}
let s=setup();assert.equal(s.listeners.length,2);
assert.deepEqual(s.listeners.map(l=>l.query[1].value),['preview','published']);
assert.ok(s.listeners.every(l=>l.query[2].limit===24));
s.emit(0,[],true);s.emit(1,[],true);assert.equal(s.updates.length,0,'do not mistake cached/offline emptiness for server result');
s.emit(0,[]);s.emit(1,[]);assert.equal(s.updates.at(-1).length,0,'empty server catalog');
s.emit(0,[{id:'test-only',status:'preview'}]);assert.equal(s.updates.at(-1).length,1);
s.emit(0,[]);assert.equal(s.updates.at(-1).length,0,'hidden/archived product disappears live');
s.emit(0,[{id:'private',status:'draft'},{id:'old',status:'archived'}]);assert.equal(s.updates.at(-1).length,0);
s.stop();assert.equal(s.stopped,2,'listeners cleaned up');
s=setup();s.emit(0,[]);s.listeners[1].error({code:'permission-denied'});assert.equal(s.updates.at(-1).length,0);assert.equal(s.failures,0);
s=setup();s.emit(0,[]);s.listeners[1].error({code:'unavailable'});assert.equal(s.failures,1,'network failure is visible');s.emit(1,[]);assert.equal(s.updates.length,0);
s=setup();s.listeners[0].error({code:'permission-denied'});assert.equal(s.failures,1,'preview denial is visible');
console.log('PASS: public status constraints, live visibility, empty/cache/error handling, listener cleanup');

