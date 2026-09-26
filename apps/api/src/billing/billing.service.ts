import { Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import {
  db,
  organizations,
  webhookEvents,
  eventUsage,
  eq,
  and,
} from '@app/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const FREE_PLAN_MONTHLY_CAP = 10_000;

@Injectable()
export class BillingService {
  async createCheckoutSession(orgId: string) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));
    if (!org) throw new NotFoundException('org not found');

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { orgId } });
      customerId = customer.id;
      await db
        .update(organizations)
        .set({ stripeCustomerId: customerId })
        .where(eq(organizations.id, orgId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: 'http://localhost:3000/billing?status=success',
      cancel_url: 'http://localhost:3000/billing?status=cancelled',
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    try {
      await db.insert(webhookEvents).values({
        stripeEventId: event.id,
        type: event.type,
        payload: event as any,
      });
    } catch {
      return { received: true, duplicate: true }; // already processed, Stripe retry — safe no-op
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      await db
        .update(organizations)
        .set({ plan: 'paid' })
        .where(eq(organizations.stripeCustomerId, customerId));
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await db
        .update(organizations)
        .set({ plan: 'free' })
        .where(eq(organizations.stripeCustomerId, customerId));
    }

    return { received: true };
  }

  async checkUsageCap(orgId: string): Promise<boolean> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));
    if (org?.plan !== 'free') return true; // paid = no cap

    const period = new Date().toISOString().slice(0, 7);
    const [usage] = await db
      .select()
      .from(eventUsage)
      .where(and(eq(eventUsage.orgId, orgId), eq(eventUsage.period, period)));

    return (usage?.eventsIngested ?? 0) < FREE_PLAN_MONTHLY_CAP;
  }

  async getUsage(orgId: string) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));
    if (!org) throw new NotFoundException('org not found');

    const period = new Date().toISOString().slice(0, 7);
    const [usage] = await db
      .select()
      .from(eventUsage)
      .where(and(eq(eventUsage.orgId, orgId), eq(eventUsage.period, period)));

    return {
      plan: org.plan,
      eventsIngested: usage?.eventsIngested ?? 0,
      cap: org.plan === 'free' ? FREE_PLAN_MONTHLY_CAP : null,
      period,
    };
  }
}
