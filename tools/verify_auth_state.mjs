import assert from 'node:assert/strict';
import {mergeBrowserState,syncKeys,switchBrowserAccount,normalizeProfile} from '../apps/prototype/auth-data.mjs';

const local={
  'coal-prog':JSON.stringify({'python0':true,'c:sum':true,'py:easy':10}),
  'dv-practice-code':JSON.stringify({sum:'local draft'}),
  'dv-sql-code.v1':JSON.stringify({query:'local SQL draft'}),
  'dv-st':JSON.stringify({c:3,t:5,hist:{'2026-11-17':2}}),
  'dv-attempts.v1':JSON.stringify([{id:'sum',at:1,source:'practice',passed:true}]),
  'dv-coins-spent.v1':'5',
};
const remote={
  'coal-prog':JSON.stringify({'javascript0':true,'c:sum':false,'py:easy':20}),
  'dv-practice-code':JSON.stringify({reverse:'remote draft'}),
  'dv-sql-code.v1':JSON.stringify({older:'remote SQL draft'}),
  'dv-st':JSON.stringify({c:2,t:4,hist:{'2026-11-17':1,'2026-11-16':3}}),
  'dv-attempts.v1':JSON.stringify([{id:'sum',at:1,source:'practice',passed:true},{id:'reverse',at:2,source:'interview',passed:false}]),
  'dv-coins-spent.v1':'10',
};
const merged=mergeBrowserState(local,remote);
assert.equal(JSON.parse(merged['coal-prog'])['c:sum'],true);
assert.equal(JSON.parse(merged['coal-prog']).javascript0,true);
assert.equal(JSON.parse(merged['coal-prog'])['py:easy'],20);
assert.deepEqual(JSON.parse(merged['dv-practice-code']),{reverse:'remote draft',sum:'local draft'});
assert.deepEqual(JSON.parse(merged['dv-sql-code.v1']),{older:'remote SQL draft',query:'local SQL draft'});
assert.equal(JSON.parse(merged['dv-st']).c,3);
assert.equal(JSON.parse(merged['dv-st']).hist['2026-11-16'],3);
assert.equal(JSON.parse(merged['dv-attempts.v1']).length,2);
assert.equal(merged['dv-coins-spent.v1'],'10');
const switched=mergeBrowserState(local,remote,{differentUser:true});
assert.equal(switched['coal-prog'],remote['coal-prog']);
assert.equal(switched['dv-practice-code'],remote['dv-practice-code']);
assert.equal(syncKeys.length,15);
const values = new Map([
  ['dv-last-uid','account-a'],
  ['dv-practice-code',JSON.stringify({sum:'private draft A'})],
  ['dv-problem-notes.v1',JSON.stringify({'javascript/sum':{text:'private note A',updatedAt:1}})],
  ['dv-profile.v1',JSON.stringify({bio:'Profile A',language:'sql',goal:5,updatedAt:1})],
]);
const storage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
assert.equal(switchBrowserAccount(storage,'account-b'),true);
assert.equal(storage.getItem('dv-practice-code'),null);
assert.equal(storage.getItem('dv-problem-notes.v1'),null);
assert.equal(storage.getItem('dv-profile.v1'),null);
storage.setItem('dv-practice-code',JSON.stringify({sum:'private draft B'}));
switchBrowserAccount(storage,null);
assert.equal(storage.getItem('dv-practice-code'),null);
switchBrowserAccount(storage,'account-a');
assert.equal(JSON.parse(storage.getItem('dv-practice-code')).sum,'private draft A');
assert.equal(JSON.parse(storage.getItem('dv-problem-notes.v1'))['javascript/sum'].text,'private note A');
assert.equal(JSON.parse(storage.getItem('dv-profile.v1')).bio,'Profile A');
const oldProfile={bio:'Old',language:'python',goal:1,updatedAt:1,xUsername:'old',linkedinUsername:'old-name'};
const newProfile={bio:'',language:'sql',goal:5,updatedAt:2,xUsername:'new',linkedinUsername:'new-name'};
for(const [a,b] of [[oldProfile,newProfile],[newProfile,oldProfile]]) {
  const state=mergeBrowserState({'dv-profile.v1':JSON.stringify(a)},{'dv-profile.v1':JSON.stringify(b)});
  assert.deepEqual(JSON.parse(state['dv-profile.v1']),newProfile);
}
assert.equal(normalizeProfile({updatedAt:'bad'}),null);
assert.deepEqual(normalizeProfile({bio:4,language:'bad',goal:-1,updatedAt:0,xUsername:'https://x.com/name',linkedinUsername:'<script>'}),{bio:'',language:'python',goal:2,updatedAt:0,xUsername:'',linkedinUsername:''});
const noteMerge=mergeBrowserState({
  'dv-problem-notes.v1':JSON.stringify({'javascript/sum':{text:'',updatedAt:5}}),
  'dv-code-checkpoints.v1':JSON.stringify({'javascript/sum':[{id:'v2',code:'new',name:'v2',at:2}]})
},{
  'dv-problem-notes.v1':JSON.stringify({'javascript/sum':{text:'deleted note',updatedAt:2}}),
  'dv-code-checkpoints.v1':JSON.stringify({'javascript/sum':[{id:'v1',code:'old',name:'v1',at:1}]})
});
assert.equal(JSON.parse(noteMerge['dv-problem-notes.v1'])['javascript/sum'].text,'');
assert.deepEqual(JSON.parse(noteMerge['dv-code-checkpoints.v1'])['javascript/sum'].map(row=>row.id),['v1','v2']);
console.log('Account state merge and account isolation checked');
