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

interface AssessmentContext {
  teamName: string;
  department: string;
  assessmentDate: string;
  assessorName: string;
  assessmentPurpose: string;
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

const defaultContext: AssessmentContext = {
  teamName: "",
  department: "",
  assessmentDate: new Date().toISOString().split('T')[0],
  assessorName: "",
  assessmentPurpose: "",
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

function encodeState(items: MetricItem[], weights: Weights, context: AssessmentContext) {
  const state = {
    v: 1,
    items: items.map(({ id, value }) => ({ id, value })),
    weights,
    context,
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

  const [context, setContext] = useState<AssessmentContext>(() => {
    const saved = localStorage.getItem("cer_context");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const state = decodeState(hash);
      if (state?.context) return state.context as AssessmentContext;
    }
    return defaultContext;
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

  useEffect(() => {
    localStorage.setItem("cer_context", JSON.stringify(context));
  }, [context]);

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
    const encoded = encodeState(items, weights, context);
    return `${window.location.origin}${window.location.pathname}#${encoded}`;
  }, [items, weights, context]);

  function exportCSV() {
    const headers = [
      "teamName",
      "department", 
      "assessmentDate",
      "assessorName",
      "assessmentPurpose",
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
      `"${context.teamName}"`,
      `"${context.department}"`,
      `"${context.assessmentDate}"`,
      `"${context.assessorName}"`,
      `"${context.assessmentPurpose}"`,
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
    const filename = context.teamName 
      ? `cer_assessment_${context.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${context.assessmentDate}.csv`
      : "creativity_resilience_export.csv";
    download(filename, csv);
  }

  function resetAll() {
    setItems(defaultItems);
    setWeights(defaultWeights);
    setContext(defaultContext);
    window.location.hash = "";
  }

  function copyLink() {
    navigator.clipboard.writeText(shareableLink);
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      {/* Hero Logo */}
      <section className="w-full bg-gradient-to-br from-gray-100 to-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-600 mb-2">ANOTHER LIMITED REBELLION</div>
            <div className="relative inline-block">
              {/* RXD Logo - Stylized with collage effect */}
              <div className="text-8xl md:text-9xl font-black tracking-tight">
                <span className="inline-block relative">
                  <span className="absolute inset-0 bg-gradient-to-r from-red-500 via-blue-500 to-yellow-500 opacity-20 blur-sm"></span>
                  <span className="relative bg-gradient-to-r from-red-600 via-blue-600 to-yellow-600 bg-clip-text text-transparent">
                    R
                  </span>
                </span>
                <span className="inline-block relative mx-2">
                  <span className="absolute inset-0 bg-gradient-to-r from-green-500 via-purple-500 to-orange-500 opacity-20 blur-sm"></span>
                  <span className="relative bg-gradient-to-r from-green-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
                    X
                  </span>
                </span>
                <span className="inline-block relative">
                  <span className="absolute inset-0 bg-gradient-to-r from-pink-500 via-teal-500 to-indigo-500 opacity-20 blur-sm"></span>
                  <span className="relative bg-gradient-to-r from-pink-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                    D
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="bg-black text-white px-8 py-4 rounded-lg inline-block">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              Resilience by Design <span className="text-lg">Index</span>
            </div>
            <div className="text-sm text-gray-300">
              Created by Modern Ancients from Vibes at the ROI of Creativity Summit
            </div>
          </div>
        </div>
      </section>

      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              C→R Assessment Tool
            </h1>
            <p className="text-sm text-neutral-600">
              Measure creative capacity & adaptability for resilience outcomes.
            </p>
            {context.teamName && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Assessing:</span> {context.teamName}
                  {context.department && ` (${context.department})`}
                  {context.assessmentDate && ` • ${context.assessmentDate}`}
                </p>
              </div>
            )}
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

      {/* Assessment Context */}
      <section className="max-w-6xl mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Assessment Context</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Identify the team or unit being assessed to provide context for stakeholders and ensure clear communication of results.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Team/Unit Name *
              </label>
              <input
                type="text"
                value={context.teamName}
                onChange={(e) => setContext(prev => ({ ...prev, teamName: e.target.value }))}
                placeholder="e.g., Product Engineering Team"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Department/Division
              </label>
              <input
                type="text"
                value={context.department}
                onChange={(e) => setContext(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Engineering, Marketing, Operations"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Assessment Date
              </label>
              <input
                type="date"
                value={context.assessmentDate}
                onChange={(e) => setContext(prev => ({ ...prev, assessmentDate: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Assessor Name
              </label>
              <input
                type="text"
                value={context.assessorName}
                onChange={(e) => setContext(prev => ({ ...prev, assessorName: e.target.value }))}
                placeholder="e.g., Sarah Johnson, Team Lead"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Assessment Purpose
              </label>
              <input
                type="text"
                value={context.assessmentPurpose}
                onChange={(e) => setContext(prev => ({ ...prev, assessmentPurpose: e.target.value }))}
                placeholder="e.g., Quarterly resilience review, Pre-reorganization assessment"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <section className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4"
          >
            <h2 className="text-lg font-semibold mb-2">Assessment Inputs</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Use these sliders to assess your team or unit. Scores are 0–100. Hover labels for guidance.
            </p>
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-medium">For Stakeholders:</span> Each metric represents a key capability that enables teams to be creative and resilient. 
                Higher scores indicate stronger capabilities. Consider your team's current state, not aspirational goals.
              </p>
            </div>

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
              {context.teamName && (
                <div className="mt-2 text-xs text-blue-600">
                  Assessment for: <span className="font-medium">{context.teamName}</span>
                </div>
              )}
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
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <span className="font-medium">Stakeholder Tip:</span> Use the "Copy Share Link" button to send this assessment to team members. 
                The link preserves all context and can be used to aggregate multiple perspectives.
              </p>
            </div>
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
