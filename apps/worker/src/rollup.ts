import { db, events, rollupsHourly, rollupsDaily, sql } from "@app/database";

async function runHourlyRollup() {
  const rows = await db.execute(sql`
    SELECT org_id, name AS event_name,
           date_trunc('hour', occurred_at) AS bucket_start,
           COUNT(*) AS count
    FROM events
    WHERE occurred_at >= now() - interval '2 hours'
    GROUP BY org_id, name, bucket_start
  `);

  for (const row of rows as any[]) {
    await db
      .insert(rollupsHourly)
      .values({
        orgId: row.org_id,
        eventName: row.event_name,
        bucketStart: new Date(row.bucket_start),
        count: Number(row.count),
      })
      .onConflictDoUpdate({
        target: [rollupsHourly.orgId, rollupsHourly.bucketStart, rollupsHourly.eventName],
        set: { count: Number(row.count) },
      });
  }
  console.log(`hourly rollup: processed ${rows.length} buckets`);
}

async function runDailyRollup() {
  const rows = await db.execute(sql`
    SELECT org_id, name AS event_name,
           date_trunc('day', occurred_at) AS bucket_start,
           COUNT(*) AS count
    FROM events
    WHERE occurred_at >= now() - interval '2 days'
    GROUP BY org_id, name, bucket_start
  `);

  for (const row of rows as any[]) {
    await db
      .insert(rollupsDaily)
      .values({
        orgId: row.org_id,
        eventName: row.event_name,
        bucketStart: new Date(row.bucket_start),
        count: Number(row.count),
      })
      .onConflictDoUpdate({
        target: [rollupsDaily.orgId, rollupsDaily.bucketStart, rollupsDaily.eventName],
        set: { count: Number(row.count) },
      });
  }
  console.log(`daily rollup: processed ${rows.length} buckets`);
}

async function main() {
  await runHourlyRollup();
  await runDailyRollup();
  process.exit(0);
}

main();
