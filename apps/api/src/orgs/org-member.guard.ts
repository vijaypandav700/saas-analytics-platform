import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { db, memberships, eq, and } from '@app/database';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.userId; // set by AuthGuard, CP11
    const orgId = req.params.orgId;

    if (!userId || !orgId)
      throw new ForbiddenException('missing auth or org context');

    const [row] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)));

    if (!row) throw new ForbiddenException('not a member of this organization');

    req.orgRole = row.role; // stash role too — revoke below restricts to owner
    return true;
  }
}
