import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;

  if (!token || token.length < 8) {
    return new NextResponse("Enlace inválido", { status: 404 });
  }

  const service = createServiceRoleClient();

  const { data: proforma, error } = await service
    .schema("crm")
    .from("proforma")
    .select("id, cliente_id, numero, pdf_share_expira_en")
    .eq("pdf_share_token", token)
    .maybeSingle();

  if (error || !proforma) {
    return new NextResponse("Proforma no encontrada", { status: 404 });
  }

  if (proforma.pdf_share_expira_en) {
    const expira = new Date(proforma.pdf_share_expira_en).getTime();
    if (Number.isFinite(expira) && expira < Date.now()) {
      return new NextResponse("Enlace vencido", { status: 410 });
    }
  }

  const storagePath = `${proforma.cliente_id}/${proforma.id}.pdf`;
  const { data: blob, error: downloadError } = await service.storage
    .from("proforma")
    .download(storagePath);

  if (downloadError || !blob) {
    console.error("proforma proxy download error", downloadError);
    return new NextResponse("PDF no disponible", { status: 404 });
  }

  const filename = `${proforma.numero ?? "proforma"}.pdf`.replace(/\s+/g, "_");
  const buffer = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
