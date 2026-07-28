"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const glowRef = useRef(null);

  useEffect(() => {
    function handleMouseMove(e) {
      glowRef.current?.style.setProperty("--glow-x", `${e.clientX}px`);
      glowRef.current?.style.setProperty("--glow-y", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(153,27,27,0.18), transparent 60%)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            🕷️ Spiderman Photobooth
          </h1>
          <p className="text-sm text-[#8a8a8a] mt-1">Admin Access</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-8 shadow-xl"
        >
          <label
            htmlFor="admin-email"
            className="block text-sm font-medium text-[#a0a0a0] mb-2"
          >
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
            placeholder="you@example.com"
          />

          <label
            htmlFor="admin-password"
            className="block text-sm font-medium text-[#a0a0a0] mb-2 mt-4"
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
            placeholder="Enter password"
          />

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full mt-6 bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Checking..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
