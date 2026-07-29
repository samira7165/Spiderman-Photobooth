"use client";

import { useEffect, useState } from "react";

export default function TemplatesPage() {
  const [editingTemplates, setEditingTemplates] = useState([]);
  const [templateSaved, setTemplateSaved] = useState({});
  const [templateSaving, setTemplateSaving] = useState({});
  const [uploadingRefId, setUploadingRefId] = useState(null);
  const [deletingRefId, setDeletingRefId] = useState(null);
  const [uploadError, setUploadError] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setEditingTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("[Admin] Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleTemplateChange(id, field, value) {
    setEditingTemplates((prev) =>
      prev.map((tmpl) => (tmpl.id === id ? { ...tmpl, [field]: value } : tmpl))
    );
  }

  function handleReferenceUpload(id, file) {
    setUploadError((prev) => ({ ...prev, [id]: "" }));
    const reader = new FileReader();

    reader.onload = async () => {
      setUploadingRefId(id);
      try {
        const res = await fetch("/api/admin/templates/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, image: reader.result }),
        });
        const data = await res.json();

        if (!res.ok) {
          setUploadError((prev) => ({ ...prev, [id]: data.error || "Upload failed" }));
          return;
        }

        setEditingTemplates((prev) =>
          prev.map((tmpl) =>
            tmpl.id === id
              ? { ...tmpl, referenceImage: data.template.referenceImage }
              : tmpl
          )
        );
        setTemplateSaved((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setTemplateSaved((prev) => ({ ...prev, [id]: false }));
        }, 2000);
      } catch (err) {
        console.error("[Admin] Failed to upload reference image:", err);
        setUploadError((prev) => ({ ...prev, [id]: "Upload failed. Try again." }));
      } finally {
        setUploadingRefId(null);
      }
    };

    reader.readAsDataURL(file);
  }

  async function handleDeleteReference(id) {
    if (
      !window.confirm(
        "Delete this template's reference image? The template won't generate photos again until you upload a new one."
      )
    ) {
      return;
    }

    setUploadError((prev) => ({ ...prev, [id]: "" }));
    setDeletingRefId(id);

    try {
      const res = await fetch("/api/admin/templates/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError((prev) => ({ ...prev, [id]: data.error || "Delete failed" }));
        return;
      }

      setEditingTemplates((prev) =>
        prev.map((tmpl) =>
          tmpl.id === id ? { ...tmpl, referenceImage: "" } : tmpl
        )
      );
    } catch (err) {
      console.error("[Admin] Failed to delete reference image:", err);
      setUploadError((prev) => ({ ...prev, [id]: "Delete failed. Try again." }));
    } finally {
      setDeletingRefId(null);
    }
  }

  async function handleSaveTemplate(id) {
    const tmpl = editingTemplates.find((t) => t.id === id);
    if (!tmpl) return;

    setTemplateSaving((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tmpl.id,
          name: tmpl.name,
          prompt: tmpl.prompt,
          referenceImage: tmpl.referenceImage,
        }),
      });

      if (res.ok) {
        setTemplateSaved((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setTemplateSaved((prev) => ({ ...prev, [id]: false }));
        }, 2000);
      }
    } catch (err) {
      console.error("[Admin] Failed to save template:", err);
    } finally {
      setTemplateSaving((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (loading) {
    return <div className="text-[#8a8a8a]">Loading templates...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-1">
          Templates
        </h3>
        <p className="text-xs text-[#6a6a6a]">
          Each template has its own prompt. When a guest picks a template, the
          AI receives exactly that template&apos;s prompt + reference image,
          plus the guest&apos;s own photo — nothing else is combined in.
        </p>
      </div>

      <div className="grid gap-6">
        {editingTemplates.length === 0 ? (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-6 py-10 text-center text-[#6a6a6a] text-sm">
            Loading templates...
          </div>
        ) : (
          editingTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 hover:border-[#3a3a3a] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wide text-[#8a8a8a] font-semibold">
                  Template #{tmpl.id}
                </span>
                {templateSaved[tmpl.id] && (
                  <span className="text-xs text-green-500 font-medium animate-pulse">
                    Saved!
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">Name</label>
                  <input
                    type="text"
                    value={tmpl.name}
                    onChange={(e) => handleTemplateChange(tmpl.id, "name", e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8a8a8a] mb-1">Reference Image</label>
                  <div className="flex items-center gap-3 mb-2">
                    {tmpl.referenceImage && (
                      <img
                        src={tmpl.referenceImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-[#2a2a2a]"
                      />
                    )}
                    <label className="cursor-pointer text-xs bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg transition-colors">
                      {uploadingRefId === tmpl.id ? "Uploading..." : "Upload Image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingRefId === tmpl.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReferenceUpload(tmpl.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {tmpl.referenceImage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReference(tmpl.id)}
                        disabled={deletingRefId === tmpl.id}
                        className="text-xs bg-[#1a1a1a] hover:bg-red-950/40 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed border border-[#2a2a2a] text-white px-3 py-2 rounded-lg transition-colors"
                      >
                        {deletingRefId === tmpl.id ? "..." : "🗑 Delete"}
                      </button>
                    )}
                  </div>
                  {uploadError[tmpl.id] && (
                    <p className="text-red-400 text-xs mb-2">{uploadError[tmpl.id]}</p>
                  )}
                  <input
                    type="text"
                    value={tmpl.referenceImage}
                    onChange={(e) => handleTemplateChange(tmpl.id, "referenceImage", e.target.value)}
                    placeholder="Or paste an image path/URL"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#8a8a8a] mb-1">
                    Prompt (sent to the AI exactly as written)
                  </label>
                  <textarea
                    rows={6}
                    value={tmpl.prompt}
                    onChange={(e) => handleTemplateChange(tmpl.id, "prompt", e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors resize-y font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => handleSaveTemplate(tmpl.id)}
                  disabled={templateSaving[tmpl.id]}
                  className="bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  {templateSaving[tmpl.id] ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
