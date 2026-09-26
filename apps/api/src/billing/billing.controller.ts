import { Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard.ts";
import { BillingService } from "./billing.service.ts";

@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post("checkout")
  @UseGuards(AuthGuard)
  checkout(@Req() req: any) {
    return this.billing.createCheckoutSession(req.body.orgId);
  }

  @Post("webhook")
  async webhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    try {
      const result = await this.billing.handleWebhook(
        req.rawBody!,
        req.headers["stripe-signature"] as string,
      );
      res.status(200).json(result);
    } catch {
      res.status(400).json({ error: "webhook signature verification failed" });
    }
  }
}
