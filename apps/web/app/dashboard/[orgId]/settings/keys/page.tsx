"use client";
import { use } from "react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api"; // your existing CP15 wrapper

type Key = {
  id: string;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
};

export default function ApiKeysPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  const [keys, setKeys] = useState<Key[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await apiFetch(`/orgs/${orgId}/api-keys`);
      setKeys(data);
    } catch (err: any) {
      setError(err.message || "failed to load keys");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    setError("");
    try {
      const data = await apiFetch(`/orgs/${orgId}/api-keys`, {
        method: "POST",
      });
      setNewKey(data.key); // shown once — never retrievable again after this
      await load();
    } catch (err: any) {
      setError(err.message || "failed to create key");
    }
  }

  async function handleRevoke(keyId: string) {
    if (
      !confirm(
        "Revoke this key? Any service using it will immediately stop working.",
      )
    )
      return;
    setError("");
    try {
      await apiFetch(`/orgs/${orgId}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err: any) {
      setError(err.message || "failed to revoke key");
    }
  }

  return (
    <div>
      <h2>API Keys</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {newKey && (
        <div
          style={{
            border: "1px solid orange",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <strong>Copy this now — you won't see it again:</strong>
          <pre>{newKey}</pre>
          <button onClick={() => setNewKey(null)}>I've copied it</button>
        </div>
      )}

      <button onClick={handleCreate}>Generate new key</button>

      <table>
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Created</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id}>
              <td>sk_live_{k.prefix}...</td>
              <td>{new Date(k.createdAt).toLocaleDateString()}</td>
              <td>{k.revokedAt ? "Revoked" : "Active"}</td>
              <td>
                {!k.revokedAt && (
                  <button onClick={() => handleRevoke(k.id)}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
