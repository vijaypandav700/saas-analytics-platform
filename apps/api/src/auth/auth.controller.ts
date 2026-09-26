import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.ts';
import { SignupThrottleGuard } from './signup-throttle.guard.ts';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(SignupThrottleGuard)
  @Post('register')
  async register(
    @Body() body: { email: string; password: string; orgName: string },
  ) {
    return this.auth.register(body.email, body.password, body.orgName);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.auth.refresh(token);
  }
}
