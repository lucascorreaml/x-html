import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldFinishJob,shouldResumeJob } from '../extension/core/jobs.js';

test('job de downloads só conclui depois do sinal de fila fechada e de todos os IDs completos',()=>{
  const job={enqueueComplete:false,downloadIds:[1]};
  assert.equal(shouldFinishJob(job,[{state:'complete'}]),false);
  job.enqueueComplete=true;
  assert.equal(shouldFinishJob(job,[{state:'complete'}]),true);
  assert.equal(shouldFinishJob({...job,downloadIds:[1,2]},[{state:'complete'}]),false);
  assert.equal(shouldFinishJob({...job,downloadIds:[1,2]},[{state:'complete'},{state:'in_progress'}]),false);
  assert.equal(shouldFinishJob({...job,status:'failed'},[{state:'complete'}]),false);
});

test('alarme só retoma fila nova ou trabalho com heartbeat vencido',()=>{
  const now=2_000_000;
  assert.equal(shouldResumeJob({status:'queued'},now),true);
  assert.equal(shouldResumeJob({status:'interrupted'},now),true);
  assert.equal(shouldResumeJob({status:'capturing',heartbeatAt:new Date(now-30_000).toISOString()},now),false);
  assert.equal(shouldResumeJob({status:'capturing',heartbeatAt:new Date(now-130_000).toISOString()},now),true);
  assert.equal(shouldResumeJob({status:'downloading'},now),false);
  assert.equal(shouldResumeJob({status:'failed'},now),false);
});
