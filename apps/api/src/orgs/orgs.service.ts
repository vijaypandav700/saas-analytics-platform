import { Injectable } from "@nestjs/common";
import { db, organizations, memberships, eq } from "@app/database";

@Injectable()
export class OrgsService {
  async listForUser(userId: string) {
    return db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(eq(memberships.userId, userId));
  }

  async create(userId: string, name: string, slug: string) {
    const [org] = await db
      .insert(organizations)
      .values({ name, slug })
      .returning();
    await db
      .insert(memberships)
      .values({ userId, orgId: org.id, role: "owner" });
    return org;
  }
}
