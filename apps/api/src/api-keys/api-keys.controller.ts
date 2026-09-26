import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.ts';
import { BillingService } from '../billing/billing.service.ts';
import { AuthGuard } from '../auth/auth.guard.ts';
import { OrgMemberGuard } from '../orgs/org-member.guard.ts';

@Controller()
export class ApiKeysController {
  constructor(
    private svc: ApiKeysService,
    private billing: BillingService,
  ) {}

  @Post('orgs/:orgId/api-keys')
  @UseGuards(AuthGuard, OrgMemberGuard)
  create(@Param('orgId') orgId: string) {
    return this.svc.create(orgId);
  }

  @Get('orgs/:orgId/api-keys')
  @UseGuards(AuthGuard, OrgMemberGuard)
  list(@Param('orgId') orgId: string) {
    return this.svc.listForOrg(orgId);
  }

  @Delete('orgs/:orgId/api-keys/:keyId')
  @UseGuards(AuthGuard, OrgMemberGuard)
  revoke(@Param('orgId') orgId: string, @Param('keyId') keyId: string) {
    return this.svc.revoke(orgId, keyId);
  }

  @Post('internal/api-keys/resolve')
  async resolve(@Body('key') key: string) {
    const result = await this.svc.resolve(key);
    if (!result) return { valid: false };
    return { valid: true, orgId: result.orgId };
  }

  @Post('internal/api-keys/check-usage')
  async checkUsage(@Body('orgId') orgId: string) {
    const allowed = await this.billing.checkUsageCap(orgId);
    return { allowed };
  }
}
