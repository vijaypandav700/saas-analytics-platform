import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { HealthCheckService, HealthCheck } from "@nestjs/terminus";
import * as client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

@Controller()
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get("healthz")
  @HealthCheck()
  liveness() {
    return { status: "ok" };
  }

  @Get("readyz")
  @HealthCheck()
  readiness() {
    return { status: "ok" };
  }

  @Get("metrics")
  async metrics(@Res() res: Response) {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  }
}
