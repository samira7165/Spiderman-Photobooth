"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard, BreakdownCard, templateName } from "./shared";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);
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

    async function fetchMe() {
      const res = await fetch("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentAdmin(data.admin);
      }
    }

    fetchStats();
    fetchMe();
    pollRef.current = setInterval(fetchStats, 5000);
    return () => clearInterval(pollRef.current);
  }, [router]);

  if (loading) {
    return <div className="text-[#8a8a8a]">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="text-[#8a8a8a]">Could not load stats.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{currentAdmin ? `, ${currentAdmin.email}` : ""}
        </h1>
        <p className="text-[#8a8a8a] mt-1">
          Here&apos;s what&apos;s happening with the photobooth right now.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={stats.total} icon="◈" />
        <StatCard label="Completed" value={stats.completed} dotColor="#22c55e" icon="✓" />
        <StatCard label="In Queue" value={stats.queued} dotColor="#eab308" icon="◷" />
        <StatCard label="Failed" value={stats.failed} dotColor="#dc2626" icon="✕" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
          By Hall
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.byHall.map((h) => (
            <BreakdownCard
              key={h.hall}
              title={`Hall ${h.hall}`}
              total={h.total}
              completed={h.completed}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
          By Template
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.byTemplate.map((t) => (
            <BreakdownCard
              key={t.templateId}
              title={templateName(t.templateId, stats.templateNames)}
              total={t.total}
              completed={t.completed}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
