"use client";

import { useEffect, useState } from "react";

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addAdminError, setAddAdminError] = useState("");
  const [addAdminSuccess, setAddAdminSuccess] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function fetchAdmins() {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

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

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Could not change password");
        return;
      }

      setPasswordSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Something went wrong. Try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return <div className="text-[#8a8a8a]">Loading admins...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
          Admins
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Current Admins</h4>
            {admins.length === 0 ? (
              <p className="text-sm text-[#6a6a6a]">No admins found.</p>
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
            className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4"
          >
            <h4 className="text-sm font-semibold text-white mb-3">Add New Admin</h4>
            <div className="space-y-3">
              <input
                type="email"
                required
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
              />
              <input
                type="password"
                required
                minLength={8}
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
              />
            </div>

            {addAdminError && <p className="text-red-500 text-xs mt-3">{addAdminError}</p>}
            {addAdminSuccess && (
              <p className="text-green-500 text-xs mt-3">{addAdminSuccess}</p>
            )}

            <button
              type="submit"
              disabled={addingAdmin || !newAdminEmail || !newAdminPassword}
              className="w-full mt-4 bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {addingAdmin ? "Adding..." : "Add Admin"}
            </button>
          </form>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#8a8a8a] uppercase tracking-wide mb-3">
          Change Your Password
        </h3>
        <form
          onSubmit={handleChangePassword}
          className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 max-w-md"
        >
          <div className="space-y-3">
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
            />
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
            />
          </div>

          {passwordError && <p className="text-red-500 text-xs mt-3">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-green-500 text-xs mt-3">{passwordSuccess}</p>
          )}

          <button
            type="submit"
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="w-full mt-4 bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {changingPassword ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
