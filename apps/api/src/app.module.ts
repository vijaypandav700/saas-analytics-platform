import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller.ts";
import { ApiKeysService } from "./api-keys/api-keys.service.ts";
import { ApiKeysController } from "./api-keys/api-keys.controller.ts";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth/auth.service.ts";
import { AuthController } from "./auth/auth.controller.ts";
import { AuthGuard } from "./auth/auth.guard.ts";
import { OrgsService } from "./orgs/orgs.service.ts";
import { OrgsController } from "./orgs/orgs.controller.ts";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: "../../.env" }),
    TerminusModule,
    JwtModule.register({}),
  ],
  controllers: [
    AppController,
    HealthController,
    ApiKeysController,
    AuthController,
    OrgsController,
  ],
  providers: [AppService, ApiKeysService, AuthService, AuthGuard, OrgsService],
})
export class AppModule {}
