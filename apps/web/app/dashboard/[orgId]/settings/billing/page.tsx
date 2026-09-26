"use client";
import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";

type Usage = {
  plan: string;
  eventsIngested: number;
  cap: number | null;
  period: string;
};

export default function BillingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    apiFetch(`/orgs/${orgId}/usage`)
      .then(setUsage)
      .catch((err) => setError(err.message || "failed to load usage"));
  }, [orgId]);

  async function handleUpgrade() {
    setLoadingCheckout(true);
    setError("");
    try {
      const data = await apiFetch(`/orgs/${orgId}/billing/checkout`, {
        method: "POST",
      });
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to start checkout");
      setLoadingCheckout(false);
    }
  }

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!usage) return <p>Loading...</p>;

  const percent = usage.cap
    ? Math.min(100, (usage.eventsIngested / usage.cap) * 100)
    : 0;
  const barColor = percent >= 90 ? "red" : percent >= 70 ? "orange" : "green";

  return (
    <div>
      <h2>Billing</h2>
      <p>
        Plan: <strong>{usage.plan}</strong>
      </p>

      {usage.plan === "free" && usage.cap && (
        <div>
          <p>
            {usage.eventsIngested.toLocaleString()} /{" "}
            {usage.cap.toLocaleString()} events this month ({usage.period})
          </p>
          <div
            style={{
              background: "#eee",
              height: "8px",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                background: barColor,
                height: "100%",
              }}
            />
          </div>
          <button onClick={handleUpgrade} disabled={loadingCheckout}>
            {loadingCheckout ? "Redirecting..." : "Upgrade to Pro"}
          </button>
        </div>
      )}

      {usage.plan !== "free" && (
        <p>Unlimited events — thanks for being a Pro customer.</p>
      )}
    </div>
  );
}
