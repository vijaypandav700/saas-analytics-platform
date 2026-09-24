import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { db, apiKeys, eq } from "@app/database";

@Injectable()
export class ApiKeysService {
  async create(orgId: string) {
    const secret = randomBytes(24).toString("hex");
    const prefix = secret.slice(0, 8);
    const fullKey = `sk_live_${secret}`;
    const keyHash = this.hash(fullKey);

    await db.insert(apiKeys).values({ orgId, keyHash, prefix });

    // return the full key ONCE — it's never retrievable again after this
    return { key: fullKey, prefix };
  }

  async resolve(fullKey: string) {
    const keyHash = this.hash(fullKey);
    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    if (!row || row.revokedAt) return null;
    return { orgId: row.orgId };
  }

  private hash(key: string) {
    return createHash("sha256").update(key).digest("hex");
  }
}
