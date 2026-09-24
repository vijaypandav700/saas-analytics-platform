import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller.ts";
import { ApiKeysService } from "./api-keys/api-keys.service.ts";
import { ApiKeysController } from "./api-keys/api-keys.controller.ts";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: "../../.env" }),
    TerminusModule,
  ],
  controllers: [AppController, HealthController, ApiKeysController],
  providers: [AppService, ApiKeysService],
})
export class AppModule {}
