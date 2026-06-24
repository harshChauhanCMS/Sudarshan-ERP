const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

export type DispatchDriverTokenPayload = {
  type: "dispatch-driver";
  trackToken: string;
  dispatchId: string;
  driverId: string;
  email: string;
  name: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min 32 characters) in production");
  }
  return "sudarshan-dev-session-secret-min-32-chars";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createDispatchDriverToken(input: {
  trackToken: string;
  dispatchId: string;
  driverId: string;
  email: string;
  name: string;
}): Promise<string> {
  const payload: DispatchDriverTokenPayload = {
    type: "dispatch-driver",
    trackToken: input.trackToken,
    dispatchId: input.dispatchId,
    driverId: input.driverId,
    email: input.email,
    name: input.name,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}

export async function verifyDispatchDriverToken(
  token: string
): Promise<DispatchDriverTokenPayload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = await sign(body);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body))
    ) as DispatchDriverTokenPayload;
    if (payload.type !== "dispatch-driver") return null;
    if (!payload.trackToken || !payload.driverId || !payload.email || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}
