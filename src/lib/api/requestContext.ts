import { NextRequest } from "next/server";

export function extractRequestMetadata(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("X-Forwarded-For");
  const rawIp = forwardedFor?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("X-Real-IP")
    ?? (request as unknown as { ip?: string }).ip
    ?? null;

  const userAgent = request.headers.get("user-agent") ?? request.headers.get("User-Agent") ?? null;

  return {
    ipAddress: rawIp,
    userAgent,
  };
}
