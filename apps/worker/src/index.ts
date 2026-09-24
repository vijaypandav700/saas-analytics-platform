import Redis from "ioredis";
import { db, events, eventUsage, sql } from "@app/database";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const STREAM = process.env.EVENTS_QUEUE ?? "events:ingest";
const GROUP = "worker-group";
const CONSUMER = "worker-1";

async function main() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
  } catch {
    // group already exists — fine
  }

  console.log("worker listening on stream:", STREAM);

  while (true) {
    const res = await redis.xreadgroup(
      "GROUP", GROUP, CONSUMER,
      "COUNT", 10,
      "BLOCK", 5000,
      "STREAMS", STREAM, ">"
    );
    if (!res) continue;

    for (const [, entries] of res as any) {
      for (const [id, fields] of entries) {
        await processEvent(fields);
        await redis.xack(STREAM, GROUP, id);
      }
    }
  }
}

async function processEvent(fields: string[]) {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  const { orgId, payload } = data;
  const parsed = JSON.parse(payload || "{}");
  const eventName = parsed.name ?? "unknown";
  const period = new Date().toISOString().slice(0, 7);

  await db.insert(events).values({
    orgId,
    name: eventName,
    properties: parsed,
  });

  await db
    .insert(eventUsage)
    .values({ orgId, period, eventsIngested: 1 })
    .onConflictDoUpdate({
      target: [eventUsage.orgId, eventUsage.period],
      set: { eventsIngested: sql`${eventUsage.eventsIngested} + 1` },
    });

  console.log(`saved event "${eventName}" for org ${orgId}`);
}

main();
