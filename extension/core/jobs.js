export function shouldFinishJob(job, states) {
  if (!job?.enqueueComplete || job.status === 'failed' || job.status === 'interrupted' || !Array.isArray(job.downloadIds) || job.downloadIds.length === 0) return false;
  return states.length === job.downloadIds.length && states.every(s => s.state === 'complete');
}

export function shouldResumeJob(job, now = Date.now(), staleAfterMs = 120_000) {
  if (!job || job.status === 'failed' || job.status === 'complete' || job.status === 'downloading') return false;
  if (job.status === 'queued' || job.status === 'interrupted') return true;
  if (['capturing','saving'].includes(job.status)) {
    const heartbeat = Date.parse(job.heartbeatAt || job.updatedAt || job.createdAt || '');
    return !Number.isFinite(heartbeat) || now - heartbeat >= staleAfterMs;
  }
  return false;
}
