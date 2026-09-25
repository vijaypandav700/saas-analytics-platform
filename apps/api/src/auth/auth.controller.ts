import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service.ts";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  register(@Body() body: { email: string; password: string }) {
    return this.auth.register(body.email, body.password);
  }

  @Post("login")
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post("refresh")
  refresh(@Body("refreshToken") token: string) {
    return this.auth.refresh(token);
  }
}