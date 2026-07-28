"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { templateName, formatDuration } from "../shared";

export default function QueuePage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return <div className="text-[#8a8a8a]">Loading queue...</div>;
  }

  if (!stats) {
    return <div className="text-[#8a8a8a]">Could not load queue.</div>;
  }

  const queuedOnly = stats.queuedItems.filter((i) => i.status === "queued");

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
        Live Queue
      </h3>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {stats.queuedItems.length === 0 ? (
          <div className="px-6 py-10 text-center text-[#6a6a6a] text-sm">
            No items in queue
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-left text-[#8a8a8a] uppercase text-xs tracking-wide">
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Hall</th>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Time in Queue</th>
                </tr>
              </thead>
              <tbody>
                {stats.queuedItems.map((item) => {
                  const isProcessing = item.status === "processing";
                  const position = isProcessing
                    ? null
                    : queuedOnly.findIndex((q) => q.id === item.id) + 1;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="px-4 py-3">
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-2 text-red-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Now
                          </span>
                        ) : (
                          <span className="text-[#a0a0a0]">#{position}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white">{item.name}</td>
                      <td className="px-4 py-3 text-[#a0a0a0]">Hall {item.hall}</td>
                      <td className="px-4 py-3 text-[#a0a0a0]">
                        {templateName(item.templateId, stats.templateNames)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            isProcessing
                              ? "bg-red-950/40 text-red-400"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#8a8a8a]">
                        {formatDuration(item.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
