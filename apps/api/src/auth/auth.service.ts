import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { db, users, refreshTokens, eq } from "@app/database";

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async register(email: string, password: string) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existing) throw new ConflictException("email already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning();
    return this.issueTokens(user.id);
  }

  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw new UnauthorizedException("invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("invalid credentials");

    return this.issueTokens(user.id);
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    if (!row || row.expiresAt < new Date())
      throw new UnauthorizedException("invalid refresh token");

    // rotate: delete old, issue new pair (prevents replay of stolen refresh token)
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    return this.issueTokens(row.userId);
  }

  private async issueTokens(userId: string) {
    const accessToken = this.jwt.sign(
      { sub: userId },
      {
        expiresIn: (process.env.JWT_ACCESS_TTL ?? "15m") as any,
        secret: process.env.JWT_ACCESS_SECRET,
      },
    );

    const rawRefresh = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

    await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

    return { accessToken, refreshToken: rawRefresh };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
