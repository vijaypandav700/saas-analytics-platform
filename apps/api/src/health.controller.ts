import { Controller, Get } from "@nestjs/common";
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
    // DB + Redis checks get added here in Checkpoint 7/8 once those clients exist
    return { status: "ok" };
  }

  @Get("metrics")
  async metrics() {
    return register.metrics();
  }
}
