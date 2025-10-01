import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// ---------------------------------------------
// Creativity → Resilience (C→R) Metric Widget
// Single-file React component. Drop into Cursor
// (e.g., src/CERWidget.tsx) and render in your app.
// ---------------------------------------------

// Type definitions
interface MetricItem {
  id: string;
  label: string;
  help: string;
  group: "capacity" | "adaptability";
  value: number; // 0-100
}

interface Weights {
  capacityWeight: number; // 0-1
  adaptabilityWeight: number; // 0-1
}

const defaultItems: MetricItem[] = [
  // Creative Capacity (environmental enablers)
  {
    id: "autonomy",
    label: "Autonomy",
    help: "Teams can make decisions without constant approval gates.",
    group: "capacity",
    value: 60,
  },
  {
    id: "psych_safety",
    label: "Psychological Safety",
    help: "It's safe to speak up, share half-formed ideas, and challenge assumptions.",
    group: "capacity",
    value: 55,
  },
  {
    id: "experimentation",
    label: "Experimentation Resources",
    help: "Time, tools, and budget exist for small bets and prototypes.",
    group: "capacity",
    value: 50,
  },
  {
    id: "idea_flow",
    label: "Idea Flow",
    help: "Ideas travel across functions; there are visible intake/triage paths.",
    group: "capacity",
    value: 52,
  },
  {
    id: "leadership_support",
    label: "Leadership Support",
    help: "Leaders role‑model curiosity and protect time for exploration.",
    group: "capacity",
    value: 58,
  },

  // Creative Adaptability (under stress/change)
  {
    id: "reframing_speed",
    label: "Reframing Speed",
    help: "Ability to reframe a problem quickly when conditions shift.",
    group: "adaptability",
    value: 48,
  },
  {
    id: "pivot_ability",
    label: "Pivot Ability",
    help: "Capacity to reconfigure plans, teams, or roadmaps at short notice.",
    group: "adaptability",
    value: 45,
  },
  {
    id: "novel_options",
    label: "Novel Options",
    help: "Number/quality of nonobvious options generated under pressure.",
    group: "adaptability",
    value: 47,
  },
  {
    id: "xfn_swarm",
    label: "Cross‑Functional Swarm",
    help: "Teams can swarm across boundaries to solve emergent issues.",
    group: "adaptability",
    value: 51,
  },
  {
    id: "learning_loop",
    label: "Learning Loop Speed",
    help: "Time from signal → insight → action → updated playbook.",
    group: "adaptability",
    value: 49,
  },
];

const defaultWeights: Weights = {
  capacityWeight: 0.5,
  adaptabilityWeight: 0.5,
};

// Utility helpers
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function download(filename: string, text: string) {
  const el = document.createElement("a");
  el.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  el.setAttribute("download", filename);
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

function encodeState(items: MetricItem[], weights: Weights) {
  const state = {
    v: 1,
    items: items.map(({ id, value }) => ({ id, value })),
    weights,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function decodeState(s: string) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(s))));
    return obj;
  } catch (e) {
    return null;
  }
}

// Core component
export default function CERWidget() {
  const [items, setItems] = useState<MetricItem[]>(() => {
    const saved = localStorage.getItem("cer_items");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // merge with defaults to preserve labels/help
        const map = new Map(parsed.map((p: any) => [p.id, p.value]));
        return defaultItems.map((d) => ({ ...d, value: (map.get(d.id) as number) ?? d.value }));
      } catch (_) {}
    }
    // URL import (hash)
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const state = decodeState(hash);
      if (state?.items) {
        const map = new Map(state.items.map((p: any) => [p.id, p.value]));
        return defaultItems.map((d) => ({ ...d, value: (map.get(d.id) as number) ?? d.value }));
      }
    }
    return defaultItems;
  });

  const [weights, setWeights] = useState<Weights>(() => {
    const saved = localStorage.getItem("cer_weights");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const state = decodeState(hash);
      if (state?.weights) return state.weights as Weights;
    }
    return defaultWeights;
  });

  useEffect(() => {
    localStorage.setItem(
      "cer_items",
      JSON.stringify(items.map(({ id, value }) => ({ id, value })))
    );
  }, [items]);

  useEffect(() => {
    localStorage.setItem("cer_weights", JSON.stringify(weights));
  }, [weights]);

  const capacityItems = useMemo(
    () => items.filter((i) => i.group === "capacity"),
    [items]
  );
  const adaptabilityItems = useMemo(
    () => items.filter((i) => i.group === "adaptability"),
    [items]
  );

  const capacityScore = useMemo(
    () => avg(capacityItems.map((i) => i.value)),
    [capacityItems]
  );
  const adaptabilityScore = useMemo(
    () => avg(adaptabilityItems.map((i) => i.value)),
    [adaptabilityItems]
  );

  const capacityW = clamp01(weights.capacityWeight);
  const adaptabilityW = clamp01(weights.adaptabilityWeight);
  const totalW = capacityW + adaptabilityW || 1;

  const CER = useMemo(() => {
    const cw = capacityW / totalW;
    const aw = adaptabilityW / totalW;
    return cw * capacityScore + aw * adaptabilityScore; // 0-100
  }, [capacityW, adaptabilityW, totalW, capacityScore, adaptabilityScore]);

  // Heuristic outcome proxies (for storytelling & benchmarking only)
  const estimatedRecoveryReduction = useMemo(() => {
    // Map CER 0-100 → 0-40% potential reduction in time-to-recover
    return Math.round((CER / 100) * 40);
  }, [CER]);

  const innovationUnderStressIndex = useMemo(() => {
    // geometric mean skewed by adaptability
    const g = Math.sqrt((capacityScore / 100) * (adaptabilityScore / 100));
    return Math.round(100 * (0.4 * g + 0.6 * (adaptabilityScore / 100)));
  }, [capacityScore, adaptabilityScore]);

  const pivotTier = useMemo(() => {
    if (adaptabilityScore >= 75) return "Tier 1 (high)";
    if (adaptabilityScore >= 55) return "Tier 2 (moderate)";
    return "Tier 3 (developing)";
  }, [adaptabilityScore]);

  const radarData = useMemo(
    () =>
      items.map((i) => ({
        axis: i.label,
        score: i.value,
      })),
    [items]
  );

  const barData = useMemo(
    () => [
      { name: "Capacity", score: Math.round(capacityScore) },
      { name: "Adaptability", score: Math.round(adaptabilityScore) },
      { name: "C→R Index", score: Math.round(CER) },
    ],
    [capacityScore, adaptabilityScore, CER]
  );

  const shareableLink = useMemo(() => {
    const encoded = encodeState(items, weights);
    return `${window.location.origin}${window.location.pathname}#${encoded}`;
  }, [items, weights]);

  function exportCSV() {
    const headers = [
      "group",
      "id",
      "label",
      "value",
      "capacityWeight",
      "adaptabilityWeight",
      "capacityScore",
      "adaptabilityScore",
      "CER",
      "estimatedRecoveryReduction",
      "innovationUnderStressIndex",
      "pivotTier",
    ];
    const rows = items.map((i) => [
      i.group,
      i.id,
      `"${i.label}"`,
      i.value.toFixed(0),
      weights.capacityWeight.toFixed(2),
      weights.adaptabilityWeight.toFixed(2),
      capacityScore.toFixed(1),
      adaptabilityScore.toFixed(1),
      CER.toFixed(1),
      estimatedRecoveryReduction.toString(),
      innovationUnderStressIndex.toString(),
      `"${pivotTier}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    download("creativity_resilience_export.csv", csv);
  }

  function resetAll() {
    setItems(defaultItems);
    setWeights(defaultWeights);
    window.location.hash = "";
  }

  function copyLink() {
    navigator.clipboard.writeText(shareableLink);
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Creativity → Resilience (C→R) Metric
            </h1>
            <p className="text-sm text-neutral-600">
              A lightweight, evidence-informed index connecting creative capacity & adaptability to resilience outcomes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100"
            >
              Export CSV
            </button>
            <button
              onClick={copyLink}
              className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100"
            >
              Copy Share Link
            </button>
            <button
              onClick={resetAll}
              className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <section className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4"
          >
            <h2 className="text-lg font-semibold mb-2">Inputs</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Use these sliders to assess your team or unit. Scores are 0–100. Hover labels for guidance.
            </p>

            {/* Weights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-neutral-200">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">Capacity Weight</span>
                  <span className="text-sm text-neutral-600">{Math.round(weights.capacityWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(weights.capacityWeight * 100)}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, capacityWeight: Number(e.target.value) / 100 }))
                  }
                  className="w-full mt-2"
                />
              </div>
              <div className="p-4 rounded-xl border border-neutral-200">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">Adaptability Weight</span>
                  <span className="text-sm text-neutral-600">{Math.round(weights.adaptabilityWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(weights.adaptabilityWeight * 100)}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, adaptabilityWeight: Number(e.target.value) / 100 }))
                  }
                  className="w-full mt-2"
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((i, idx) => (
                <div key={i.id} className="p-4 rounded-xl border border-neutral-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">
                        {i.label}
                        <span
                          title={i.help}
                          className="ml-2 text-xs text-neutral-500 cursor-help align-middle"
                        >
                          ?
                        </span>
                      </div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500">
                        {i.group === "capacity" ? "Creative Capacity" : "Creative Adaptability"}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums text-neutral-600">{i.value}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={i.value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setItems((prev) =>
                        prev.map((p, j) => (j === idx ? { ...p, value: v } : p))
                      );
                    }}
                    className="w-full mt-3"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Right: Visuals & Outcomes */}
        <section className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4"
          >
            <h2 className="text-lg font-semibold mb-2">C→R Index</h2>
            <div className="text-sm text-neutral-600 mb-4">
              Composite score from weighted Creative Capacity and Creative Adaptability.
            </div>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-semibold tabular-nums">{Math.round(CER)}</div>
              <div className="text-sm text-neutral-600">/ 100</div>
            </div>

            <div className="h-40 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4"
          >
            <h2 className="text-lg font-semibold mb-2">Dimension Map</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius={90}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4"
          >
            <h2 className="text-lg font-semibold mb-2">Outcome Proxies</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-baseline justify-between">
                <span className="text-neutral-600">Estimated reduction in time‑to‑recovery</span>
                <span className="font-medium">{estimatedRecoveryReduction}%</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-neutral-600">Innovation‑under‑stress index</span>
                <span className="font-medium">{innovationUnderStressIndex}</span>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-neutral-600">Pivot capability tier</span>
                <span className="font-medium">{pivotTier}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-neutral-500">
              These are heuristic for exploration and benchmarking — not guarantees. Calibrate with your org's historical disruption data.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4"
          >
            <h2 className="text-lg font-semibold mb-2">How to use (quick)</h2>
            <ol className="list-decimal list-inside text-sm space-y-1 text-neutral-700">
              <li>Have 3–7 leaders score independently; share link to aggregate later.</li>
              <li>Discuss spread on each dimension and what would move it +10 in 90 days.</li>
              <li>Re‑score quarterly; track CER vs. real recovery times and pivot outcomes.</li>
            </ol>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-neutral-500">
        <div className="border-t border-neutral-200 pt-4">
          Built pro bono for ecosystem use. Attribution appreciated. Calibrate with your context.
        </div>
      </footer>
    </div>
  );
}
