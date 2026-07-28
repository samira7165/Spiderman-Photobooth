// =============================================================
// SHARED HELPERS + PRESENTATIONAL COMPONENTS
// =============================================================
// Used across the admin dashboard pages (Dashboard, Queue,
// Photos, Templates, Admins).
// =============================================================

export function templateName(templateId, templateNames = []) {
  return (
    templateNames.find((t) => t.id === templateId)?.name ||
    `Template ${templateId}`
  );
}

export function formatDuration(createdAt) {
  const totalSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

// Deterministic pseudo-random squiggle, seeded by label so it
// stays stable across re-renders/polls instead of jumping around.
function sparkPoints(seed, count = 8) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  const points = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    points.push((h % 1000) / 1000);
  }
  return points;
}

function Sparkline({ seed, color = "#991b1b" }) {
  const points = sparkPoints(seed);
  const width = 100;
  const height = 26;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - p * height).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-6 mt-3" preserveAspectRatio="none">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function StatCard({ label, value, dotColor, icon }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 hover:border-[#3a3a3a] transition-colors">
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-red-900/40 flex items-center justify-center text-red-400 text-base mb-3">
          {icon}
        </div>
      )}
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
      <Sparkline seed={label} color={dotColor || "#991b1b"} />
    </div>
  );
}

export function BreakdownCard({ title, total, completed }) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 hover:border-[#3a3a3a] transition-colors">
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
          className="h-full bg-red-800 transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}
