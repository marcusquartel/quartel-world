import { timingSafeEqual } from "node:crypto";

// Confere o "código da equipe" no servidor (o código não vai para o navegador).
export async function POST(req: Request) {
  const expected = process.env.TEAM_CODE ?? "";
  let code = "";
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!expected || !code) return Response.json({ ok: false });
  const a = Buffer.from(code);
  const b = Buffer.from(expected.trim().toUpperCase());
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return Response.json({ ok });
}
