"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "◆" },
  { id: "queue", label: "Queue", icon: "◷" },
  { id: "photos", label: "Photos", icon: "▦" },
  { id: "templates", label: "Templates", icon: "◇" },
  { id: "admins", label: "Admins", icon: "◈" },
];

function templateName(templateId, templateNames = []) {
  return (
    templateNames.find((t) => t.id === templateId)?.name ||
    `Template ${templateId}`
  );
}

function formatDuration(createdAt) {
  const totalSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function StatCard({ label, value, dotColor }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {dotColor && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span className="text-xs uppercase tracking-wide text-[#8a8a8a]">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function BreakdownCard({ title, total, completed }) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2a2a2a]">
        <span className="font-semibold text-sm text-white">{title}</span>
        <span className="text-xs text-[#8a8a8a]">{rate}%</span>
      </div>
      <div className="flex items-baseline gap-4 text-sm">
        <span className="text-[#8a8a8a]">
          Total <span className="text-white font-medium">{total}</span>
        </span>
        <span className="text-[#8a8a8a]">
          Done <span className="text-green-500 font-medium">{completed}</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden mt-3">
        <div
          className="h-full bg-red-600 transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addAdminError, setAddAdminError] = useState("");
  const [addAdminSuccess, setAddAdminSuccess] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const pollRef = useRef(null);

  async function fetchAdmins() {
    const res = await fetch("/api/admin/admins");
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins);
    }
  }

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
    fetchAdmins();
    pollRef.current = setInterval(fetchStats, 5000);
    return () => clearInterval(pollRef.current);
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    setAddAdminError("");
    setAddAdminSuccess("");
    setAddingAdmin(true);

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAddAdminError(data.error || "Could not add admin");
        return;
      }

      setAddAdminSuccess(`Added ${data.admin.email}`);
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchAdmins();
    } catch {
      setAddAdminError("Something went wrong. Try again.");
    } finally {
      setAddingAdmin(false);
    }
  }

  function scrollTo(id) {
    setActiveSection(id);
    setSidebarOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#8a8a8a]">
        Loading dashboard...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#8a8a8a]">
        Could not load stats.
      </div>
    );
  }

  const queuedOnly = stats.queuedItems.filter((i) => i.status === "queued");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111111] border-r border-[#2a2a2a] flex flex-col transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 border-b border-[#2a2a2a]">
          <h1 className="text-lg font-bold text-white">🕷️ Spiderman</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Photobooth Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-red-600/10 text-red-500 border border-red-600/30"
                  : "text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <a
            href="/api/export"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            <span className="text-base">⇩</span>
            Export
          </a>
        </nav>

        <div className="px-3 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#a0a0a0] hover:bg-red-600/10 hover:text-red-500 transition-colors"
          >
            <span className="text-base">⏻</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 md:px-8 py-4 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-white text-xl px-2"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h2 className="text-lg font-semibold">
              Spiderman Photobooth Admin
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {currentAdmin && (
              <span className="hidden md:inline text-xs text-[#8a8a8a]">
                Logged in as{" "}
                <span className="text-white">{currentAdmin.email}</span>
              </span>
            )}
            <a
              href="/api/export"
              className="hidden sm:flex items-center gap-2 text-sm font-medium bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] px-4 py-2 rounded-lg transition-colors"
            >
              ⇩ Export Excel
            </a>
            <button
              onClick={handleLogout}
              className="text-sm font-medium bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 space-y-10">
          <section id="overview" className="scroll-mt-20">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Requests" value={stats.total} />
              <StatCard
                label="Completed"
                value={stats.completed}
                dotColor="#22c55e"
              />
              <StatCard
                label="In Queue"
                value={stats.queued}
                dotColor="#eab308"
              />
              <StatCard
                label="Failed"
                value={stats.failed}
                dotColor="#dc2626"
              />
            </div>

            <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
              By Hall
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.byHall.map((h) => (
                <BreakdownCard
                  key={h.hall}
                  title={`Hall ${h.hall}`}
                  total={h.total}
                  completed={h.completed}
                />
              ))}
            </div>

            <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
              By Template
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.byTemplate.map((t) => (
                <BreakdownCard
                  key={t.templateId}
                  title={templateName(t.templateId)}
                  total={t.total}
                  completed={t.completed}
                />
              ))}
            </div>
          </section>

          <section id="queue" className="scroll-mt-20">
            <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
              Live Queue
            </h3>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
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
                        <th className="px-4 py-3 font-medium">
                          Time in Queue
                        </th>
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
                                <span className="inline-flex items-center gap-2 text-red-500 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                  Now
                                </span>
                              ) : (
                                <span className="text-[#a0a0a0]">
                                  #{position}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-white">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-[#a0a0a0]">
                              Hall {item.hall}
                            </td>
                            <td className="px-4 py-3 text-[#a0a0a0]">
                              {templateName(item.templateId)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  isProcessing
                                    ? "bg-red-600/10 text-red-500"
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
          </section>

          <section id="photos" className="scroll-mt-20">
            <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
              Recent Photos
            </h3>
            {stats.recentPhotos.length === 0 ? (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-6 py-10 text-center text-[#6a6a6a] text-sm">
                No completed photos yet
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stats.recentPhotos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-red-600/50 transition-colors"
                  >
                    <div className="aspect-square bg-[#0a0a0a] overflow-hidden">
                      <img
                        src={photo.imageUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {photo.name}
                        </span>
                        <span className="text-[10px] font-mono bg-[#1f1f1f] text-red-500 px-1.5 py-0.5 rounded shrink-0">
                          {photo.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-[#1f1f1f] text-[#8a8a8a] px-1.5 py-0.5 rounded">
                          Hall {photo.hall}
                        </span>
                        <span className="text-[10px] bg-[#1f1f1f] text-[#8a8a8a] px-1.5 py-0.5 rounded">
                          {templateName(photo.templateId)}
                        </span>
                        {photo.usedApi && (
                          <span className="text-[10px] text-[#6a6a6a] ml-auto">
                            {photo.usedApi}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section id="admins" className="scroll-mt-20">
            <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
              Admins
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Current Admins
                </h4>
                {admins.length === 0 ? (
                  <p className="text-sm text-[#6a6a6a]">Loading...</p>
                ) : (
                  <ul className="space-y-2">
                    {admins.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between text-sm border-b border-[#1f1f1f] last:border-0 pb-2 last:pb-0"
                      >
                        <span className="text-white truncate">{a.email}</span>
                        <span className="text-[#6a6a6a] text-xs shrink-0 ml-2">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form
                onSubmit={handleAddAdmin}
                className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4"
              >
                <h4 className="text-sm font-semibold text-white mb-3">
                  Add New Admin
                </h4>
                <div className="space-y-3">
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-colors"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Password (min 8 characters)"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-colors"
                  />
                </div>

                {addAdminError && (
                  <p className="text-red-500 text-xs mt-3">{addAdminError}</p>
                )}
                {addAdminSuccess && (
                  <p className="text-green-500 text-xs mt-3">
                    {addAdminSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={addingAdmin || !newAdminEmail || !newAdminPassword}
                  className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  {addingAdmin ? "Adding..." : "Add Admin"}
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
