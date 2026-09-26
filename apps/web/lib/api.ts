const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  return data.accessToken;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  let token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  async function doFetch(t: string | null) {
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
      },
    });
  }

  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("session expired, please log in again");
    }
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
