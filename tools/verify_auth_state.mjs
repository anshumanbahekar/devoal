import assert from 'node:assert/strict';
import {mergeBrowserState,syncKeys} from '../apps/prototype/auth-data.mjs';

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
assert.equal(syncKeys.length,12);
console.log('Account state merge and account isolation checked');
