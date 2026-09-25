import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service.ts";
import { BillingService } from "../billing/billing.service.ts";
import { AuthGuard } from "../auth/auth.guard.ts";

@Controller()
export class ApiKeysController {
  constructor(
    private svc: ApiKeysService,
    private billing: BillingService,
  ) {}

  @Post("orgs/:orgId/api-keys")
  @UseGuards(AuthGuard)
  create(@Req() req: any) {
    return this.svc.create(req.params.orgId);
  }

  @Post("internal/api-keys/resolve")
  async resolve(@Body("key") key: string) {
    const result = await this.svc.resolve(key);
    if (!result) return { valid: false };
    return { valid: true, orgId: result.orgId };
  }

  @Post("internal/api-keys/check-usage")
  async checkUsage(@Body("orgId") orgId: string) {
    const allowed = await this.billing.checkUsageCap(orgId);
    return { allowed };
  }
}
