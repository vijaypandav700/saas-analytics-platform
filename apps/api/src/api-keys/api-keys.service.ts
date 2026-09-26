import { Injectable, ForbiddenException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { db, apiKeys, eq, and } from '@app/database';

@Injectable()
export class ApiKeysService {
  async create(orgId: string) {
    const secret = randomBytes(24).toString('hex');
    const prefix = secret.slice(0, 8);
    const fullKey = `sk_live_${secret}`;
    const keyHash = this.hash(fullKey);

    await db.insert(apiKeys).values({ orgId, keyHash, prefix });
    return { key: fullKey, prefix };
  }

  async listForOrg(orgId: string) {
    const rows = await db
      .select({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        createdAt: apiKeys.createdAt,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.orgId, orgId));
    return rows; // never selects keyHash — the raw key is never retrievable after creation
  }

  async revoke(orgId: string, keyId: string) {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)));
    if (!row)
      throw new ForbiddenException('key not found in this organization');
    if (row.revokedAt) return { id: keyId, revokedAt: row.revokedAt }; // already revoked, idempotent

    const [updated] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, keyId))
      .returning();
    return { id: updated.id, revokedAt: updated.revokedAt };
  }

  async resolve(fullKey: string) {
    const keyHash = this.hash(fullKey);
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash));
    if (!row || row.revokedAt) return null;
    return { orgId: row.orgId };
  }

  private hash(key: string) {
    return createHash('sha256').update(key).digest('hex');
  }
}
