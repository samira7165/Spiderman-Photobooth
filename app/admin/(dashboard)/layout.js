"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "◆" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/queue", label: "Queue", icon: "◷" },
      { href: "/admin/photos", label: "Photos", icon: "▦" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/admin/templates", label: "Templates", icon: "◇" },
      { href: "/admin/admins", label: "Admins", icon: "◈" },
      { href: "/admin/settings", label: "Settings", icon: "⚙" },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function AdminDashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const glowRef = useRef(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/admin/me");
        if (res.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setCurrentAdmin(data.admin);
        }
      } finally {
        setAuthChecked(true);
      }
    }
    fetchMe();
  }, [router]);

  useEffect(() => {
    function handleMouseMove(e) {
      glowRef.current?.style.setProperty("--glow-x", `${e.clientX}px`);
      glowRef.current?.style.setProperty("--glow-y", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#8a8a8a]">
        Loading...
      </div>
    );
  }

  if (!currentAdmin) {
    return null;
  }

  const activeLabel = NAV_ITEMS.find((item) => item.href === pathname)?.label
    || "Spiderman Photobooth Admin";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Cursor glow */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(153,27,27,0.16), transparent 60%)",
        }}
      />

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

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5a]">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-red-950/40 text-red-400 border border-red-900/40"
                          : "text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <a
            href="/api/export"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            <span className="text-base">⇩</span>
            Export
          </a>
        </nav>

        <div className="px-3 py-4 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
            <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {currentAdmin.email[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {currentAdmin.email}
              </p>
              <button
                onClick={handleLogout}
                className="text-xs text-[#8a8a8a] hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64 flex flex-col min-h-screen relative z-10">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 md:px-8 py-4 bg-[#0a0a0a]/80 backdrop-blur border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-white text-xl px-2"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h2 className="text-lg font-semibold">{activeLabel}</h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/export"
              className="hidden sm:flex items-center gap-2 text-sm font-medium bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] px-4 py-2 rounded-xl transition-colors"
            >
              ⇩ Export Excel
            </a>
            <button
              onClick={handleLogout}
              className="text-sm font-medium bg-red-900 hover:bg-red-800 px-4 py-2 rounded-xl transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
