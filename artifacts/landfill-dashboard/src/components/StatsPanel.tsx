import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, ScatterChart, Scatter, ZAxis, ComposedChart, Area, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, FlaskConical, GitBranch, Sigma, Brain, Activity } from "lucide-react";
import { useGetDashboardStatsAdvanced } from "@workspace/api-client-react";

function fmt(n: number, d = 2) { return n == null ? "—" : n.toLocaleString("fr-DZ", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function pBadge(p: number) {
  const sig = p < 0.001 ? "p < 0.001 ***" : p < 0.01 ? `p = ${p.toFixed(3)} **` : p < 0.05 ? `p = ${p.toFixed(3)} *` : `p = ${p.toFixed(3)} ns`;
  const color = p < 0.05 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200";
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${color}`}>{sig}</Badge>;
}
function rColor(r: number) {
  const a = Math.abs(r);
  if (a > 0.8) return r > 0 ? "#1d4ed8" : "#dc2626";
  if (a > 0.5) return r > 0 ? "#3b82f6" : "#f87171";
  if (a > 0.2) return r > 0 ? "#93c5fd" : "#fca5a5";
  return "#e5e7eb";
}

const SECTION_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16"];

// ── Descriptive Stats Table ───────────────────────────────────────────────────
function DescriptiveTable({ data }: { data: any[] }) {
  const fields = ["n","mean","median","std","min","max","q1","q3","skewness","kurtosis","cv"];
  const labels: Record<string,string> = { n:"N", mean:"Moyenne", median:"Médiane", std:"Écart-type", min:"Min", max:"Max", q1:"Q1 (25%)", q3:"Q3 (75%)", skewness:"Asymétrie", kurtosis:"Aplatissement", cv:"CV" };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b bg-muted/40">
          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Variable</th>
          {fields.map(f => <th key={f} className="px-3 py-2 text-right font-semibold text-muted-foreground whitespace-nowrap">{labels[f]}</th>)}
        </tr></thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b hover:bg-muted/20">
              <td className="px-3 py-2 font-medium text-xs max-w-[180px]">{row.variable}</td>
              {fields.map(f => (
                <td key={f} className="px-3 py-2 text-right font-mono text-[11px]">
                  {f === "n" ? row[f] : fmt(row[f], f === "n" ? 0 : 4)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Correlation Heatmap ───────────────────────────────────────────────────────
function CorrelationHeatmap({ variables, matrix2D }: { variables: string[]; matrix2D: number[][] }) {
  const [hovered, setHovered] = useState<{ i: number; j: number } | null>(null);
  const cellSize = 60;
  const w = variables.length * cellSize + 120;
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={variables.length * cellSize + 100}>
        {/* Column labels */}
        {variables.map((v, j) => (
          <text key={j} x={120 + j * cellSize + cellSize / 2} y={70} textAnchor="middle" fontSize={9} fill="#6b7280" transform={`rotate(-35, ${120 + j * cellSize + cellSize / 2}, 70)`}>{v.slice(0, 16)}</text>
        ))}
        {variables.map((v1, i) => (
          <g key={i}>
            <text x={115} y={100 + i * cellSize + cellSize / 2 + 4} textAnchor="end" fontSize={9} fill="#6b7280">{v1.slice(0, 18)}</text>
            {variables.map((_, j) => {
              const r = matrix2D[i][j];
              const isHov = hovered?.i === i && hovered?.j === j;
              return (
                <g key={j} onMouseEnter={() => setHovered({ i, j })} onMouseLeave={() => setHovered(null)}>
                  <rect x={120 + j * cellSize} y={100 + i * cellSize} width={cellSize - 2} height={cellSize - 2} fill={rColor(r)} rx={3} opacity={isHov ? 0.9 : 0.75} />
                  <text x={120 + j * cellSize + cellSize / 2 - 1} y={100 + i * cellSize + cellSize / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={Math.abs(r) > 0.5 ? "#fff" : "#374151"}>
                    {i === j ? "1.0" : r.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#dc2626" }} /> Corrél. négative forte</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#e5e7eb" }} /> Faible</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#1d4ed8" }} /> Corrél. positive forte</span>
      </div>
    </div>
  );
}

// ── Correlation Pairs Table ───────────────────────────────────────────────────
function CorrPairsTable({ pairs }: { pairs: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b bg-muted/40">
          {["Variable 1","Variable 2","r de Pearson","t-stat","df","p-valeur","Interprétation"].map(h => (
            <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {pairs.map((p, i) => {
            const strength = Math.abs(p.r) > 0.8 ? "Très forte" : Math.abs(p.r) > 0.6 ? "Forte" : Math.abs(p.r) > 0.4 ? "Modérée" : Math.abs(p.r) > 0.2 ? "Faible" : "Très faible";
            const dir = p.r > 0 ? "positive" : "négative";
            return (
              <tr key={i} className="border-b hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{p.var1}</td>
                <td className="px-3 py-2 font-medium">{p.var2}</td>
                <td className="px-3 py-2 font-mono font-bold" style={{ color: rColor(p.r) }}>{fmt(p.r, 4)}</td>
                <td className="px-3 py-2 font-mono">{fmt(p.tStat, 3)}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{p.df}</td>
                <td className="px-3 py-2">{pBadge(p.pValue)}</td>
                <td className="px-3 py-2 text-muted-foreground">{strength} {dir}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Distributions ─────────────────────────────────────────────────────────────
function DistributionsPanel({ data }: { data: any }) {
  const { normalFitVolume, poissonFitDaily, histogram, poissonHistogram, binomialDist, binomialN, binomialP } = data;
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "Loi Normale — Volume mensuel", mu: normalFitVolume.mu, sigma: normalFitVolume.sigma, ll: normalFitVolume.logLikelihood, desc: "Modélise la distribution du volume mensuel collecté. La normalité suppose des variations symétriques autour de la moyenne." },
          { title: "Loi de Poisson — Décharges/jour", lambda: poissonFitDaily.lambda, ll: poissonFitDaily.logLikelihood, desc: `λ = ${poissonFitDaily.lambda.toFixed(2)} : nombre moyen de décharges par jour. La loi de Poisson modélise des événements rares et indépendants.` },
          { title: "Loi Binomiale — Décharges/semaine", n: binomialN, p: binomialP, desc: `n=${binomialN} essais, p=${binomialP.toFixed(3)}. Probabilité d'observer exactement k décharges dans n créneaux possibles.` },
        ].map((c, i) => (
          <Card key={i} className="border border-border/60">
            <CardContent className="p-3">
              <p className="text-xs font-semibold mb-1">{c.title}</p>
              {'mu' in c && <p className="text-[11px] font-mono text-blue-700">μ = {fmt(c.mu, 2)}, σ = {fmt(c.sigma!, 2)}</p>}
              {'lambda' in c && <p className="text-[11px] font-mono text-emerald-700">λ = {fmt(c.lambda!, 2)}</p>}
              {'n' in c && <p className="text-[11px] font-mono text-violet-700">n = {c.n}, p = {fmt(c.p!, 4)}</p>}
              {'ll' in c && <p className="text-[10px] text-muted-foreground">Log-vraisemblance : {fmt(c.ll!, 2)}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Histogram + Normal fit */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Distribution poids net/décharge — Ajustement Loi Normale</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={histogram} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="binStart" tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(1)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number, name: string) => [name === "count" ? `${v} observations` : v.toFixed(5), name === "count" ? "Fréquence" : "PDF Normale"]} />
                <Bar dataKey="count" fill="#3b82f6" opacity={0.6} name="count" />
                <Line dataKey="normalPdf" dot={false} stroke="#ef4444" strokeWidth={2} name="normalPdf" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Poisson histogram */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Décharges/jour — Ajustement Loi de Poisson (λ={poissonFitDaily.lambda.toFixed(2)})</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={poissonHistogram} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="k" tick={{ fontSize: 10 }} label={{ value: "k (décharges)", position: "insideBottom", fontSize: 9, offset: -2 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="observed" fill="#10b981" opacity={0.6} name="Observé" />
                <Line dataKey="poissonPmf" dot={{ r: 4 }} stroke="#f59e0b" strokeWidth={2} name="P(X=k)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Binomial distribution */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Loi Binomiale — P(X=k) avec n={binomialN}, p={binomialP.toFixed(3)}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={binomialDist} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toFixed(3)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [v.toFixed(4), "Probabilité P(X=k)"]} />
                <Bar dataKey="pmf" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {binomialDist.map((_: any, i: number) => <Cell key={i} fill={SECTION_COLORS[i % SECTION_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Regression Panel ──────────────────────────────────────────────────────────
function RegressionPanel({ data }: { data: any }) {
  const { simple, multiple } = data;
  return (
    <div className="space-y-4">
      {/* Simple regressions */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Régressions linéaires simples</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/40">
                {["Variable X","Variable Y","Pente (β₁)","Intercept (β₀)","R²","r de Pearson","t-stat","p-valeur","Équation"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {simple.map((r: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.xVar}</td>
                    <td className="px-3 py-2 font-medium">{r.yVar}</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.slope, 4)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.intercept, 3)}</td>
                    <td className="px-3 py-2 font-mono font-bold">{fmt(r.rSquared, 4)}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: rColor(r.pearsonR) }}>{fmt(r.pearsonR, 4)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.tStat, 3)}</td>
                    <td className="px-3 py-2">{pBadge(r.pValue)}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{r.equation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Multiple regression */}
      {multiple?.coefficients?.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">Régression multiple — Volume ≈ f(décharges, poids moyen, tendance)</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px]">R² = {fmt(multiple.rSquared, 4)}</Badge>
                <Badge variant="outline" className="text-[10px]">R² adj. = {fmt(multiple.adjRSquared, 4)}</Badge>
                <Badge variant="outline" className="text-[10px]">F = {fmt(multiple.fStatistic, 2)}</Badge>
                {pBadge(multiple.fPValue)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/40">
                  {["Variable","Coefficient (β)","Erreur std.","t-stat","p-valeur","Signif."].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {multiple.coefficients.map((c: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{c.variable}</td>
                      <td className="px-3 py-2 font-mono font-bold">{fmt(c.coef, 4)}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{fmt(c.se, 4)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(c.tStat, 3)}</td>
                      <td className="px-3 py-2">{pBadge(c.pValue)}</td>
                      <td className="px-3 py-2">{c.significant ? <span className="text-emerald-600 font-bold">✓ Oui</span> : <span className="text-muted-foreground">Non</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Hypothesis Tests ──────────────────────────────────────────────────────────
function HypothesisPanel({ data }: { data: any }) {
  const { anova, tTests, chiSquare, chiSquareLabels } = data;
  return (
    <div className="space-y-4">
      {/* ANOVA */}
      {anova && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">ANOVA à un facteur — Volume mensuel par site</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px]">F({anova.dfBetween},{anova.dfWithin}) = {fmt(anova.fStatistic, 3)}</Badge>
                {pBadge(anova.pValue)}
                <Badge variant="outline" className="text-[10px]">η² = {fmt(anova.eta2, 4)}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[11px] text-muted-foreground mb-3">
              H₀ : Les volumes moyens sont identiques pour tous les sites. {anova.pValue < 0.05 ? "✓ H₀ rejetée — différence significative entre sites." : "H₀ non rejetée — pas de différence significative détectée."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {anova.groups.map((g: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded p-2 text-center">
                  <p className="text-[10px] text-muted-foreground truncate">{g.label}</p>
                  <p className="text-sm font-bold">{fmt(g.mean, 2)} t</p>
                  <p className="text-[10px] text-muted-foreground">σ = {fmt(g.std, 2)}, n = {g.n}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* T-tests */}
      {tTests?.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Tests T de Student (Welch) — Comparaison par paires de sites</CardTitle></CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/40">
                  {["Site 1","Moy. 1 (t)","Site 2","Moy. 2 (t)","Différence","t-stat","df","p-valeur","d de Cohen","Signif."].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {tTests.map((t: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium max-w-[100px] truncate">{t.group1}</td>
                      <td className="px-3 py-2 font-mono">{fmt(t.mean1, 2)}</td>
                      <td className="px-3 py-2 font-medium max-w-[100px] truncate">{t.group2}</td>
                      <td className="px-3 py-2 font-mono">{fmt(t.mean2, 2)}</td>
                      <td className={`px-3 py-2 font-mono font-semibold ${t.meanDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>{t.meanDiff >= 0 ? "+" : ""}{fmt(t.meanDiff, 2)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(t.tStat, 3)}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{fmt(t.df, 1)}</td>
                      <td className="px-3 py-2">{pBadge(t.pValue)}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{fmt(t.cohensD, 3)}</td>
                      <td className="px-3 py-2">{t.significant ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chi-square */}
      {chiSquare && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">Test du χ² — Indépendance Type de déchet × Site</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px]">χ²({chiSquare.df}) = {fmt(chiSquare.chiSquare, 3)}</Badge>
                {pBadge(chiSquare.pValue)}
                <Badge variant="outline" className="text-[10px]">V de Cramér = {fmt(chiSquare.cramersV, 4)}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[11px] text-muted-foreground mb-2">
              H₀ : La distribution des types de déchets est indépendante du site. {chiSquare.significant ? "✓ H₀ rejetée — les sites ont des profils de déchets significativement différents." : "H₀ non rejetée — pas d'association significative détectée."}
              {" "}V de Cramér = {fmt(chiSquare.cramersV, 3)} ({chiSquare.cramersV < 0.1 ? "effet négligeable" : chiSquare.cramersV < 0.3 ? "effet faible" : chiSquare.cramersV < 0.5 ? "effet modéré" : "effet fort"}).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Time Series Panel ─────────────────────────────────────────────────────────
function TimeSeriesPanel({ data }: { data: any }) {
  const { movingAverages, decomposition } = data;
  return (
    <div className="space-y-4">
      {/* Moving averages */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold">Moyennes mobiles — Volume mensuel collecté (t)</CardTitle>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-slate-400 inline-block" />Brut</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" />MA(3)</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-500 inline-block" />MA(6)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={movingAverages} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(0, 7)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number, name: string) => [v != null ? `${fmt(v, 1)} t` : "—", name]} />
              <Bar dataKey="raw" name="Brut" fill="#94a3b8" opacity={0.4} />
              <Line dataKey="ma3" name="MA(3)" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              <Line dataKey="ma6" name="MA(6)" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
              {movingAverages.some((m: any) => m.trend != null) && (
                <Line dataKey="trend" name="Tendance (STL)" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* STL Decomposition */}
      {decomposition && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: "trend", label: "Composante tendance", color: "#3b82f6", desc: `Pente : ${decomposition.trendSlope > 0 ? "+" : ""}${decomposition.trendSlope} t/mois` },
            { key: "seasonal", label: "Composante saisonnière", color: "#10b981", desc: `Force saisonnière : ${(decomposition.seasonalStrength * 100).toFixed(1)}%` },
            { key: "residual", label: "Résidu (bruit)", color: "#ef4444", desc: `σ résidu = ${decomposition.residualStd} t` },
          ].map(comp => (
            <Card key={comp.key} className="border border-border/60">
              <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[11px] font-semibold">{comp.label}</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-[10px] text-muted-foreground mb-2">{comp.desc}</p>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={movingAverages.filter((m: any) => m[comp.key] != null)} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 8 }} tickFormatter={v => v.slice(5, 7)} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => [`${fmt(v, 2)} t`]} />
                    <Line dataKey={comp.key} stroke={comp.color} strokeWidth={1.5} dot={false} connectNulls />
                    <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bayesian Panel ────────────────────────────────────────────────────────────
function BayesianPanel({ data }: { data: any }) {
  const { prior, updates } = data;
  const chartData = updates.map((u: any) => ({
    month: u.month.slice(0, 7),
    Postérieure: u.posterior_mean,
    lower: u.lower95,
    upper: u.upper95,
  }));
  return (
    <div className="space-y-4">
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold">Mise à jour bayésienne — Estimation séquentielle du volume mensuel</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]">Prior μ = {fmt(prior.mean, 2)}</Badge>
              <Badge variant="outline" className="text-[10px]">Prior σ² = {fmt(prior.variance, 2)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-[11px] text-muted-foreground mb-3">
            À chaque nouveau mois de données, la distribution a priori est mise à jour (règle de Bayes, modèle Normal-Normal conjugué). La courbe montre la convergence de la moyenne postérieure et le rétrécissement des intervalles de crédibilité 95%.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="credGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}t`} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number, name: string) => [`${fmt(v, 2)} t`, name]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="upper" fill="url(#credGrad)" stroke="none" name="upper" legendType="none" connectNulls />
              <Area dataKey="lower" fill="white" stroke="none" name="lower" legendType="none" connectNulls />
              <Line dataKey="Postérieure" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Moyenne postérieure" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-2">
            Zone bleue = Intervalle de crédibilité bayésien 95% (analogue à l'IC fréquentiste). À mesure que n augmente, l'IC se rétrécit — la croyance postérieure converge vers les données.
          </p>
        </CardContent>
      </Card>

      {/* Sequential updates table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Tableau des mises à jour séquentielles</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/40">
                {["Mois","Moyenne postérieure","Borne inf. 95%","Borne sup. 95%","Largeur IC 95%"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {updates.map((u: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{u.month.slice(0, 7)}</td>
                    <td className="px-3 py-2 font-semibold font-mono">{fmt(u.posterior_mean, 4)} t</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{fmt(u.lower95, 4)}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{fmt(u.upper95, 4)}</td>
                    <td className="px-3 py-2 font-mono text-blue-600">{fmt(u.upper95 - u.lower95, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function StatsPanel() {
  const { data, isLoading } = useGetDashboardStatsAdvanced();

  if (isLoading) return (
    <div className="space-y-3">
      {[0,1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
    </div>
  );

  if (!data) return <p className="text-sm text-muted-foreground">Aucune donnée statistique disponible.</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border border-border/60 bg-gradient-to-r from-violet-50/50 to-blue-50/50 dark:from-violet-950/20 dark:to-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold">Moteur statistique complet</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distributions (Normale · Poisson · Binomiale) · Tests (T, ANOVA, χ²) · Régression (simple & multiple) ·
                Corrélation · Décomposition STL · Moyennes mobiles · Estimation bayésienne séquentielle
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { icon: <Sigma className="w-3 h-3" />, label: `${data.descriptiveStats.length} variables` },
                  { icon: <GitBranch className="w-3 h-3" />, label: `${data.correlations.pairs.length} corrélations` },
                  { icon: <TrendingUp className="w-3 h-3" />, label: `${data.regression.simple.length} régressions` },
                  { icon: <Activity className="w-3 h-3" />, label: `${data.bayesian.updates.length} mises à jour bayésiennes` },
                ].map((b, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] gap-1">{b.icon}{b.label}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inner tabs */}
      <Tabs defaultValue="descriptive">
        <TabsList className="h-8 mb-3 bg-muted/50 flex-wrap">
          <TabsTrigger value="descriptive" className="text-xs h-7">📊 Statistiques descriptives</TabsTrigger>
          <TabsTrigger value="distributions" className="text-xs h-7">🔔 Distributions</TabsTrigger>
          <TabsTrigger value="correlations" className="text-xs h-7">🌡 Corrélations</TabsTrigger>
          <TabsTrigger value="regression" className="text-xs h-7">📈 Régression</TabsTrigger>
          <TabsTrigger value="tests" className="text-xs h-7">🧪 Tests d'hypothèse</TabsTrigger>
          <TabsTrigger value="timeseries" className="text-xs h-7">〰 Séries temporelles</TabsTrigger>
          <TabsTrigger value="bayesian" className="text-xs h-7">🎯 Bayésien</TabsTrigger>
        </TabsList>

        <TabsContent value="descriptive" className="mt-0">
          <Card className="border border-border/60">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Statistiques descriptives complètes</CardTitle></CardHeader>
            <CardContent className="px-0 pb-0">
              <DescriptiveTable data={data.descriptiveStats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="mt-0">
          <DistributionsPanel data={data.distributions} />
        </TabsContent>

        <TabsContent value="correlations" className="mt-0 space-y-4">
          <Card className="border border-border/60">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Matrice de corrélation de Pearson</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              <CorrelationHeatmap variables={data.correlations.variables} matrix2D={data.correlations.matrix2D} />
            </CardContent>
          </Card>
          <Card className="border border-border/60">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold">Tableau des coefficients de corrélation avec tests de significativité</CardTitle></CardHeader>
            <CardContent className="px-0 pb-0">
              <CorrPairsTable pairs={data.correlations.pairs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regression" className="mt-0">
          <RegressionPanel data={data.regression} />
        </TabsContent>

        <TabsContent value="tests" className="mt-0">
          <HypothesisPanel data={data.hypothesisTests} />
        </TabsContent>

        <TabsContent value="timeseries" className="mt-0">
          <TimeSeriesPanel data={data.timeSeries} />
        </TabsContent>

        <TabsContent value="bayesian" className="mt-0">
          <BayesianPanel data={data.bayesian} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
