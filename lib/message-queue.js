/**
 * Warren-XMD — Per-session message queue
 * Serializes ALL outbound sends per session to avoid detection.
 * Prevents "10 replies in the same second" pattern that gets bots banned.
 */

const queues = new Map();
const stats = new Map();

function maybeEvict(phoneNumber) {
  const s = stats.get(phoneNumber);
  if (s && s.queued >= s.completed) {
    stats.delete(phoneNumber);
    queues.delete(phoneNumber);
  }
}

export function enqueue(phoneNumber, taskFn) {
  const prev = queues.get(phoneNumber) || Promise.resolve();

  const next = prev
    .catch(() => {}) // don't break the chain on failure
    .then(() => taskFn());

  queues.set(phoneNumber, next);

  // Track stats
  const s = stats.get(phoneNumber) || { queued: 0, completed: 0 };
  s.queued++;
  stats.set(phoneNumber, s);

  return next.finally(() => {
    const s2 = stats.get(phoneNumber);
    if (s2) s2.completed++;
    maybeEvict(phoneNumber);
  });
}

export function clearQueue(phoneNumber) {
  queues.delete(phoneNumber);
  stats.delete(phoneNumber);
}

export function getQueueStats(phoneNumber) {
  return stats.get(phoneNumber) || { queued: 0, completed: 0 };
}

export function queueDepth(phoneNumber) {
  const s = stats.get(phoneNumber);
  if (!s) return 0;
  return s.queued - s.completed;
}

export function listActiveQueues() {
  return Array.from(queues.keys());
}
