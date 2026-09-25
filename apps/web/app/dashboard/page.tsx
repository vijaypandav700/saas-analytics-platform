"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      router.push("/login");
      return;
    }
    apiFetch("/orgs").then(setOrgs).catch(() => router.push("/login"));
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-20">
      <h1 className="text-xl font-bold mb-4">Your Organizations</h1>
      <ul className="space-y-2">
        {orgs.map((org) => (
          <li key={org.id} className="border p-3">
            {org.name} — plan: {org.plan}
          </li>
        ))}
      </ul>
    </div>
  );
}
