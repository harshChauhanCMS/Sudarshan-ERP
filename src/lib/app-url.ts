const DEFAULT_PRODUCTION_URL = "https://sudarshan-erp-seven.vercel.app";

export function getAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_URL;
  }

  return DEFAULT_PRODUCTION_URL;
}

export function buildAppUrl(path: string): string {
  const base = getAppBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
