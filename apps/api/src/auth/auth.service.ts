import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  db,
  users,
  refreshTokens,
  eq,
  organizations,
  memberships,
} from '@app/database';
// add these two imports at the top of the file if not already present:

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async register(email: string, password: string, orgName: string) {
    if (!email || !password || !orgName) {
      throw new BadRequestException(
        'email, password, and orgName are required',
      );
    }
    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const baseSlug =
      orgName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 50) || 'org';

    return db.transaction(async (tx) => {
      let user;
      try {
        [user] = await tx
          .insert(users)
          .values({ email, passwordHash })
          .returning();
      } catch (err: any) {
        if (err?.code === '23505')
          throw new ConflictException('email already registered');
        throw err;
      }

      let org;
      let slug = baseSlug;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          [org] = await tx
            .insert(organizations)
            .values({ name: orgName, slug, plan: 'free' })
            .returning();
          break;
        } catch (err: any) {
          if (err?.code === '23505') {
            slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
            continue;
          }
          throw err;
        }
      }
      if (!org)
        throw new ConflictException(
          'could not create org, try a different name',
        );

      await tx
        .insert(memberships)
        .values({ userId: user.id, orgId: org.id, role: 'owner' });

      const tokens = await this.issueTokens(user.id, tx);
      return { ...tokens, orgId: org.id };
    });
  }

  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw new UnauthorizedException('invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');

    return this.issueTokens(user.id);
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    if (!row || row.expiresAt < new Date())
      throw new UnauthorizedException('invalid refresh token');

    // rotate: delete old, issue new pair (prevents replay of stolen refresh token)
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    return this.issueTokens(row.userId);
  }

  private async issueTokens(
    userId: string,
    client:
      typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
  ) {
    const accessToken = this.jwt.sign(
      { sub: userId },
      {
        expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as any,
        secret: process.env.JWT_ACCESS_SECRET,
      },
    );

    const rawRefresh = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

    await client.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

    return { accessToken, refreshToken: rawRefresh };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
