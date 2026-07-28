"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { templateName } from "../shared";

export default function PhotosPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (!res.ok) return;
        setStats(await res.json());
      } catch (err) {
        console.error("[Admin] Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    pollRef.current = setInterval(fetchStats, 5000);
    return () => clearInterval(pollRef.current);
  }, [router]);

  async function handleCopyUrl(photo) {
    try {
      await navigator.clipboard.writeText(photo.viewerUrl);
      setCopiedId(photo.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("[Admin] Failed to copy URL:", err);
    }
  }

  if (loading) {
    return <div className="text-[#8a8a8a]">Loading photos...</div>;
  }

  if (!stats) {
    return <div className="text-[#8a8a8a]">Could not load photos.</div>;
  }

  const columns = [
    "#",
    "Original",
    "Generated",
    "Name",
    "URL",
    "Code",
    "Phone",
    "Hall",
    "Template",
    "API",
    "Created",
    "Download",
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
        Recent Photos
      </h3>

      {stats.recentPhotos.length === 0 ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-6 py-10 text-center text-[#6a6a6a] text-sm">
          No completed photos yet
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#1a1a1a] text-left text-[#8a8a8a] uppercase text-[11px] tracking-wider">
                  {columns.map((col, i) => (
                    <th
                      key={col}
                      className={`px-3 py-2.5 border-b border-[#2a2a2a] font-medium whitespace-nowrap ${
                        i > 0 ? "border-l border-[#2a2a2a]" : ""
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentPhotos.map((photo, i) => (
                  <tr
                    key={photo.id}
                    className={`hover:bg-[#1e1e1e] transition-colors ${
                      i % 2 === 1 ? "bg-[#111111]" : ""
                    }`}
                  >
                    <td className="px-3 py-2 border-b border-[#1f1f1f] text-[#6a6a6a]">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f]">
                      {photo.userPhotoUrl ? (
                        <a href={photo.userPhotoUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={photo.userPhotoUrl}
                            alt={`${photo.name} — original`}
                            className="w-10 h-10 rounded-lg object-cover border border-[#2a2a2a]"
                          />
                        </a>
                      ) : (
                        <span className="text-[#4a4a4a] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f]">
                      <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo.imageUrl}
                          alt={`${photo.name} — generated`}
                          className="w-10 h-10 rounded-lg object-cover border border-[#2a2a2a]"
                        />
                      </a>
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] text-white whitespace-nowrap">
                      {photo.name}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f]">
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <a
                          href={photo.viewerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:text-red-300 text-xs underline underline-offset-2 truncate max-w-[160px]"
                          title={photo.viewerUrl}
                        >
                          {photo.viewerUrl}
                        </a>
                        <button
                          onClick={() => handleCopyUrl(photo)}
                          className="text-[10px] shrink-0 bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white px-1.5 py-0.5 rounded transition-colors"
                        >
                          {copiedId === photo.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] font-mono text-red-400 text-xs whitespace-nowrap">
                      {photo.code}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] text-[#a0a0a0] whitespace-nowrap">
                      {photo.phone}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] text-[#a0a0a0] whitespace-nowrap">
                      Hall {photo.hall}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] text-[#a0a0a0] whitespace-nowrap">
                      {templateName(photo.templateId, stats.templateNames)}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] text-[#6a6a6a] text-xs whitespace-nowrap">
                      {photo.usedApi || "—"}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f] text-[#6a6a6a] text-xs whitespace-nowrap">
                      {new Date(photo.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 border-b border-l border-[#1f1f1f]">
                      <div className="flex gap-1.5">
                        {photo.userPhotoUrl && (
                          <a
                            href={`/api/admin/download?url=${encodeURIComponent(photo.userPhotoUrl)}&filename=${photo.code}-original.jpg`}
                            className="text-xs bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                          >
                            ⇩ Org
                          </a>
                        )}
                        <a
                          href={`/api/admin/download?url=${encodeURIComponent(photo.imageUrl)}&filename=${photo.code}.png`}
                          className="text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        >
                          ⇩ Gen
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
