import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

@Injectable()
export class SignupThrottleGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `signup_throttle:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600); // 1 hour window
    if (count > 5) {
      throw new HttpException(
        'too many signup attempts, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
