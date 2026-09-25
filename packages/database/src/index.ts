import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(import.meta.dirname, "../../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

export * from "./schema.ts";
export { eq, and, sql, desc, asc } from "drizzle-orm";