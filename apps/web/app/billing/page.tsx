"use client";
import { useSearchParams } from "next/navigation";

export default function BillingRedirectPage() {
  const params = useSearchParams();
  const status = params.get("status");

  if (status === "success") {
    return (
      <p>
        Checkout complete — your plan will update shortly once Stripe confirms
        payment.
      </p>
    );
  }
  if (status === "cancelled") {
    return <p>Checkout cancelled — no changes made to your plan.</p>;
  }
  return <p>Redirecting...</p>;
}
