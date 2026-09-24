import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const STREAM = process.env.EVENTS_QUEUE ?? "events:ingest";
const GROUP = "worker-group";
const CONSUMER = "worker-1";

async function main() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
  } catch {
    // group already exists — fine, ignore
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
        console.log("received event:", id, fields);
        // Checkpoint 8: actually save this to Postgres here
        await redis.xack(STREAM, GROUP, id);
      }
    }
  }
}

main();
