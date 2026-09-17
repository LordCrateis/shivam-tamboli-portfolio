import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { JAKES_RESUME_TEMPLATE } from "./template.ts";

const ADMIN_EMAIL = "shivamrtamboli62@gmail.com";
const SETTINGS_ID = "b0000000-0000-0000-0000-000000000001";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Education = { school?: string; location?: string; degree?: string; dates?: string; details?: string[] };
type Experience = { role?: string; company?: string; location?: string; dates?: string; bullets?: string[] };
type Skill = { label?: string; items?: string };

function escapeLatex(value: unknown): string {
  const replacements: Record<string, string> = {
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
  };
  return String(value ?? "").replace(/[\\&%$#_{}~^]/g, (character) => replacements[character]);
}

function urlLabel(value: string): string {
  return value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function link(value: string | null, label?: string): string {
  if (!value) return "";
  return `\\href{${escapeLatex(value)}}{\\underline{${escapeLatex(label || urlLabel(value))}}}`;
}

function makeHeader(settings: Record<string, unknown>): string {
  const contacts = [
    settings.phone ? escapeLatex(settings.phone) : "",
    settings.email ? link(`mailto:${settings.email}`, String(settings.email)) : "",
    settings.linkedin_url ? link(String(settings.linkedin_url)) : "",
    settings.github_url ? link(String(settings.github_url)) : "",
    settings.location ? escapeLatex(settings.location) : "",
  ].filter(Boolean);
  return `\\begin{center}\n  \\textbf{\\Huge \\scshape ${escapeLatex(settings.full_name)}} \\\\ \\vspace{1pt}\n  \\small ${contacts.join(" $|$ ")}\n\\end{center}`;
}

function makeEducation(items: Education[]): string {
  if (!items.length) return "";
  const rows = items.map((item) => {
    const details = (item.details ?? []).filter(Boolean);
    const detailBlock = details.length
      ? `\n    \\resumeItemListStart\n${details.map((detail) => `      \\resumeItem{${escapeLatex(detail)}}`).join("\n")}\n    \\resumeItemListEnd`
      : "";
    return `    \\resumeSubheading\n      {${escapeLatex(item.school)}}{${escapeLatex(item.location)}}\n      {${escapeLatex(item.degree)}}{${escapeLatex(item.dates)}}${detailBlock}`;
  }).join("\n");
  return `\\section{Education}\n  \\resumeSubHeadingListStart\n${rows}\n  \\resumeSubHeadingListEnd`;
}

function makeExperience(items: Experience[]): string {
  if (!items.length) return "";
  const rows = items.map((item) => {
    const bullets = (item.bullets ?? []).filter(Boolean);
    return `    \\resumeSubheading\n      {${escapeLatex(item.role)}}{${escapeLatex(item.dates)}}\n      {${escapeLatex(item.company)}}{${escapeLatex(item.location)}}\n      \\resumeItemListStart\n${bullets.map((bullet) => `        \\resumeItem{${escapeLatex(bullet)}}`).join("\n")}\n      \\resumeItemListEnd`;
  }).join("\n");
  return `\\section{Experience}\n  \\resumeSubHeadingListStart\n${rows}\n  \\resumeSubHeadingListEnd`;
}

function makeProjects(projects: Array<Record<string, unknown>>): string {
  if (!projects.length) return "";
  const rows = projects.map((project) => {
    const title = escapeLatex(project.resume_title || project.title);
    const stack = (project.resume_tech_stack as string[] | null) ?? [];
    const heading = stack.length ? `\\textbf{${title}} $|$ \\emph{${stack.map(escapeLatex).join(", ")}}` : `\\textbf{${title}}`;
    const date = escapeLatex(project.project_date || project.year || "");
    const bullets = ((project.resume_bullets as string[] | null) ?? []).slice(0, 3);
    return `    \\resumeProjectHeading\n      {${heading}}{${date}}\n      \\resumeItemListStart\n${bullets.map((bullet) => `        \\resumeItem{${escapeLatex(bullet)}}`).join("\n")}\n      \\resumeItemListEnd`;
  }).join("\n");
  return `\\section{Projects}\n  \\resumeSubHeadingListStart\n${rows}\n  \\resumeSubHeadingListEnd`;
}

function makeSkills(items: Skill[]): string {
  const rows = items.filter((item) => item.label || item.items).map((item) => `    \\textbf{${escapeLatex(item.label)}}{: ${escapeLatex(item.items)}} \\\\`);
  if (!rows.length) return "";
  return `\\section{Technical Skills}\n \\begin{itemize}[leftmargin=0.15in, label={}]\n  \\small{\\item{\n${rows.join("\n")}\n  }}\n \\end{itemize}`;
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  try {
    await admin.from("resume_settings").update({ generation_status: "generating", generation_error: null }).eq("id", SETTINGS_ID);
    const [settingsResult, projectsResult] = await Promise.all([
      admin.from("resume_settings").select("*").eq("id", SETTINGS_ID).single(),
      admin.from("projects").select("title,year,project_date,resume_title,resume_bullets,resume_tech_stack,resume_order,order_index").eq("include_in_resume", true).order("resume_order").order("order_index"),
    ]);
    if (settingsResult.error) throw settingsResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const settings = settingsResult.data as Record<string, unknown>;
    const tex = JAKES_RESUME_TEMPLATE
      .replace("{{HEADER}}", makeHeader(settings))
      .replace("{{EDUCATION}}", makeEducation((settings.education as Education[]) ?? []))
      .replace("{{EXPERIENCE}}", makeExperience((settings.experience as Experience[]) ?? []))
      .replace("{{PROJECTS}}", makeProjects(projectsResult.data ?? []))
      .replace("{{SKILLS}}", makeSkills((settings.skills as Skill[]) ?? []));

    const githubToken = Deno.env.get("GITHUB_DISPATCH_TOKEN");
    const githubRepository = Deno.env.get("GITHUB_REPOSITORY");
    if (!githubToken || !githubRepository) throw new Error("GitHub resume dispatch is not configured");

    const dispatchResponse = await fetch(`https://api.github.com/repos/${githubRepository}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "shivam-tamboli-portfolio-resume",
      },
      body: JSON.stringify({
        event_type: "generate-resume",
        client_payload: {
          tex_base64: encodeBase64Utf8(tex),
          requested_at: new Date().toISOString(),
        },
      }),
    });
    if (!dispatchResponse.ok) throw new Error(`GitHub dispatch failed: ${await dispatchResponse.text()}`);

    return Response.json(
      { ok: true, queued: true },
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume generation failed";
    await admin.from("resume_settings").update({ generation_status: "failed", generation_error: message.slice(0, 1000) }).eq("id", SETTINGS_ID);
    return Response.json({ error: message }, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
