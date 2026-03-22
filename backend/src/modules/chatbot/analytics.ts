// ── Chatbot In-Process Analytics ──────────────────────────────────────────────
// Lightweight counters stored in module-level Maps.
// Resets on server restart — intentional for low-overhead design.
// Persistent metrics (lead counts by intent) are derived from the DB at query time.

const sessions    = new Set<string>();   // unique sessionIds seen this uptime
let   messages    = 0;                   // total POST /message calls

const intentHits  = new Map<string, number>();   // intent → hit count
const quickClicks = new Map<string, number>();   // chip label → click count

// ── Increment helpers (called by service) ─────────────────────────────────────

export function trackMessage(sessionId: string, intent: string): void {
  messages++;
  sessions.add(sessionId);
  intentHits.set(intent, (intentHits.get(intent) ?? 0) + 1);
}

export function trackQuickReply(label: string): void {
  quickClicks.set(label, (quickClicks.get(label) ?? 0) + 1);
}

// ── Snapshot read (called by analytics endpoint) ──────────────────────────────

export function getInProcessCounters() {
  const topIntents = [...intentHits.entries()]
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topQuickReplies = [...quickClicks.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalMessages:   messages,
    totalSessions:   sessions.size,
    topIntents,
    topQuickReplies,
  };
}
