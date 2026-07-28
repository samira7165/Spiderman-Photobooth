import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// =============================================================
// GET /api/admin/settings — current API Key 1 / API Key 2 config
// PUT /api/admin/settings — update it
// =============================================================
// Two generic, swappable provider slots. Slot 1 is tried first,
// slot 2 is the fallback. API keys are masked in GET responses.
// On PUT, leave a key field blank to keep the existing value —
// only a non-empty key overwrites what's stored.
//
// PUT also mirrors the change into the local .env file (best
// effort, local dev only — there's no persistent/writable .env
// on a real deployment) so the two never silently drift apart.
// =============================================================

const SUPPORTED_PROVIDERS = ["gemini", "openai"];
const ENV_FALLBACK = {
  gemini: { apiKeyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-2.0-flash-exp" },
  openai: { apiKeyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", defaultModel: "gpt-image-1" },
};

function updateEnvFile(updates) {
  if (Object.keys(updates).length === 0) return;
  if (process.env.VERCEL) return; // no persistent .env on a real deployment

  const envPath = path.join(process.cwd(), ".env");
  let content;
  try {
    content = fs.readFileSync(envPath, "utf8");
  } catch {
    return; // no local .env file to sync — safe no-op
  }

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    content = pattern.test(content) ? content.replace(pattern, line) : `${content}\n${line}\n`;
  }

  try {
    fs.writeFileSync(envPath, content);
  } catch (err) {
    console.warn("[Settings] Could not write .env:", err.message);
  }
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}

function resolveSlotForDisplay(provider, apiKey, model) {
  const resolvedProvider = provider || "gemini";
  const fallback = ENV_FALLBACK[resolvedProvider];
  const resolvedKey = apiKey || (fallback ? process.env[fallback.apiKeyEnv] : "") || "";
  const resolvedModel =
    model || (fallback ? process.env[fallback.modelEnv] || fallback.defaultModel : "") || "";

  return {
    provider: resolvedProvider,
    apiKeyMasked: maskKey(resolvedKey),
    apiKeySet: !!resolvedKey,
    model: resolvedModel,
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.apiSettings.findUnique({ where: { id: 1 } });

  return NextResponse.json({
    providers: SUPPORTED_PROVIDERS,
    slot1: resolveSlotForDisplay(settings?.slot1Provider, settings?.slot1ApiKey, settings?.slot1Model),
    slot2: resolveSlotForDisplay(settings?.slot2Provider || "openai", settings?.slot2ApiKey, settings?.slot2Model),
  });
}

export async function PUT(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slot1, slot2 } = await request.json();

  for (const slot of [slot1, slot2]) {
    if (slot?.provider && !SUPPORTED_PROVIDERS.includes(slot.provider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${slot.provider}` },
        { status: 400 }
      );
    }
  }

  const data = {};
  if (slot1?.provider) data.slot1Provider = slot1.provider;
  if (slot1?.apiKey) data.slot1ApiKey = slot1.apiKey;
  if (slot1?.model) data.slot1Model = slot1.model;
  if (slot2?.provider) data.slot2Provider = slot2.provider;
  if (slot2?.apiKey) data.slot2ApiKey = slot2.apiKey;
  if (slot2?.model) data.slot2Model = slot2.model;

  await prisma.apiSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  // Keep .env mirrored so it never silently drifts from what's saved here
  const envUpdates = {};
  for (const slot of [slot1, slot2]) {
    const envNames = ENV_FALLBACK[slot?.provider];
    if (!envNames) continue;
    if (slot.apiKey) envUpdates[envNames.apiKeyEnv] = slot.apiKey;
    if (slot.model) envUpdates[envNames.modelEnv] = slot.model;
  }
  updateEnvFile(envUpdates);

  return NextResponse.json({ success: true });
}
