import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadLeagueTable } from "@/lib/league";

const cell = (v: string | number | null) => {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const round = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const data = await loadLeagueTable(id);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const lines = [
    ["rank", "agent", "domain", "mention_rate_pct", "share_of_voice_pct", "avg_position", "mentions", "responses"].join(","),
    ...data.rows.map((r, i) =>
      [i + 1, r.name, r.domain, round(r.mentionRate), round(r.shareOfVoice), round(r.position), r.mentions, r.responses].map(cell).join(","),
    ),
  ];
  const filename = `league-${data.table.town.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  return new NextResponse(lines.join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` },
  });
}
