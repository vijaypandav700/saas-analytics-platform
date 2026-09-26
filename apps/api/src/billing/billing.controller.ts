import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.ts';
import { OrgMemberGuard } from '../orgs/org-member.guard.ts';
import { BillingService } from './billing.service.ts';

@Controller()
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post('orgs/:orgId/billing/checkout')
  @UseGuards(AuthGuard, OrgMemberGuard)
  checkout(@Param('orgId') orgId: string) {
    return this.billing.createCheckoutSession(orgId);
  }

  @Get('orgs/:orgId/usage')
  @UseGuards(AuthGuard, OrgMemberGuard)
  usage(@Param('orgId') orgId: string) {
    return this.billing.getUsage(orgId);
  }

  @Post('billing/webhook')
  async webhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    try {
      const result = await this.billing.handleWebhook(
        req.rawBody!,
        req.headers['stripe-signature'] as string,
      );
      res.status(200).json(result);
    } catch {
      res.status(400).json({ error: 'webhook signature verification failed' });
    }
  }
}
