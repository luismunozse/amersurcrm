import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userAgent = req.headers.get("user-agent") || "unknown";
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Probar conexión a Supabase
  let supabaseStatus = "unknown";
  let supabaseError = null;
  let supabaseLatency = 0;

  try {
    const start = Date.now();
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
      headers: {
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });
    supabaseLatency = Date.now() - start;
    supabaseStatus = response.ok ? "ok" : `error: ${response.status}`;
  } catch (err) {
    supabaseStatus = "failed";
    supabaseError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    client: {
      userAgent,
      isIOS,
      isSafari,
    },
    server: {
      region: process.env.VERCEL_REGION || "unknown",
      env: process.env.NODE_ENV,
    },
    supabase: {
      url: supabaseUrl?.replace(/https:\/\/([^.]+)\..*/, "https://$1.***"),
      status: supabaseStatus,
      latency: `${supabaseLatency}ms`,
      error: supabaseError,
    },
  });
}
