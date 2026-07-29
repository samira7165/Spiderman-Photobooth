"use client";

import { useEffect, useState } from "react";

const PROVIDER_LABELS = {
  gemini: "Gemini",
  openai: "OpenAI",
};

function SlotForm({ title, slot, onChange, onSave, saving, saved, error }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            slot.apiKeySet
              ? "bg-green-500/10 text-green-500"
              : "bg-yellow-500/10 text-yellow-500"
          }`}
        >
          {slot.apiKeySet ? "Configured" : "Not set"}
        </span>
      </div>

      <label className="block text-xs text-[#8a8a8a] mb-1">Provider</label>
      <select
        value={slot.provider}
        onChange={(e) => onChange("provider", e.target.value)}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors mb-3"
      >
        {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="block text-xs text-[#8a8a8a] mb-1">API Key</label>
      <input
        type="password"
        value={slot.apiKeyInput}
        onChange={(e) => onChange("apiKeyInput", e.target.value)}
        placeholder={slot.apiKeyMasked || `Enter ${PROVIDER_LABELS[slot.provider]} API key`}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors mb-3"
      />

      <label className="block text-xs text-[#8a8a8a] mb-1">Model</label>
      <input
        type="text"
        value={slot.model}
        onChange={(e) => onChange("model", e.target.value)}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors mb-3"
      />

      <label className="block text-xs text-[#8a8a8a] mb-1">
        Fallback Model <span className="text-[#5a5a5a]">(optional)</span>
      </label>
      <input
        type="text"
        value={slot.modelFallback}
        onChange={(e) => onChange("modelFallback", e.target.value)}
        placeholder="e.g. an older/alternate model to retry with the same key"
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
      />
      <p className="text-[10px] text-[#5a5a5a] mt-1 mb-3">
        Tried automatically, with this same key, if the model above fails.
      </p>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      {saved && <p className="text-green-500 text-xs mt-3">Saved!</p>}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full mt-4 bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

const EMPTY_SLOT = { provider: "gemini", apiKeyMasked: "", apiKeySet: false, model: "", modelFallback: "", apiKeyInput: "" };

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [slot1, setSlot1] = useState(EMPTY_SLOT);
  const [slot2, setSlot2] = useState({ ...EMPTY_SLOT, provider: "openai" });
  const [saving1, setSaving1] = useState(false);
  const [saving2, setSaving2] = useState(false);
  const [saved1, setSaved1] = useState(false);
  const [saved2, setSaved2] = useState(false);
  const [error1, setError1] = useState("");
  const [error2, setError2] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    fetchSettings();
    setOrigin(window.location.origin);
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSlot1({ ...data.slot1, apiKeyInput: "" });
        setSlot2({ ...data.slot2, apiKeyInput: "" });
      }
    } catch (err) {
      console.error("[Admin] Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(slotKey) {
    const slot = slotKey === "slot1" ? slot1 : slot2;
    const setSaving = slotKey === "slot1" ? setSaving1 : setSaving2;
    const setSaved = slotKey === "slot1" ? setSaved1 : setSaved2;
    const setError = slotKey === "slot1" ? setError1 : setError2;

    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [slotKey]: {
            provider: slot.provider,
            apiKey: slot.apiKeyInput || undefined,
            model: slot.model || undefined,
            modelFallback: slot.modelFallback,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchSettings();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-[#8a8a8a]">Loading settings...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-1">
          Hall Assignment
        </h3>
        <p className="text-xs text-[#6a6a6a] mb-3">
          Each hall is configured via URL parameter. Open the booth with
          ?hall=1 through ?hall=4 on each hall&apos;s device — this lets all
          4 halls run simultaneously against this one shared backend.
        </p>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 max-w-md">
          <ul className="space-y-2 font-mono text-sm">
            {[1, 2, 3, 4].map((h) => (
              <li key={h} className="text-[#a0a0a0]">
                Hall {h}:{" "}
                <span className="text-red-400">
                  {origin || "http://localhost:3000"}?hall={h}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-1">
          AI API Keys
        </h3>
        <p className="text-xs text-[#6a6a6a]">
          API Key 1 is tried first for every photo; API Key 2 is the
          fallback if it fails. Within each key, its Fallback Model is
          retried automatically before moving to the other key. Changes
          apply immediately — no restart needed. Leave the key field
          blank to keep the current one.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <SlotForm
          title="API Key 1 (Primary)"
          slot={slot1}
          onChange={(field, value) => setSlot1((prev) => ({ ...prev, [field]: value }))}
          onSave={() => handleSave("slot1")}
          saving={saving1}
          saved={saved1}
          error={error1}
        />
        <SlotForm
          title="API Key 2 (Fallback)"
          slot={slot2}
          onChange={(field, value) => setSlot2((prev) => ({ ...prev, [field]: value }))}
          onSave={() => handleSave("slot2")}
          saving={saving2}
          saved={saved2}
          error={error2}
        />
      </div>
    </div>
  );
}
