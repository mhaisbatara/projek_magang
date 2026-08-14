// lib/api.ts
// Helper fetch yang otomatis menyisipkan header yang dibutuhkan backend
// (X-Timestamp, wajib untuk lolos middleware validateTimestamp di backend).

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    // backend expects unix epoch dalam DETIK, bukan milidetik
    "X-Timestamp": String(Math.floor(Date.now() / 1000)),
  };

  // Kalau nanti route ini dikunci pakai validateAccessToken (JWT),
  // ambil token dari localStorage/cookie dan kirim di sini:
  // const token = localStorage.getItem("access_token");
  // if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

async function handleResponse(res: Response) {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // response bukan JSON
  }

  if (!res.ok) {
    const message = json?.message || `Request gagal (status ${res.status})`;
    throw new Error(message);
  }

  return json;
}

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  patch: async (path: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  post: async (path: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  put: async (path: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  delete: async (path: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};