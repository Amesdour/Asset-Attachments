# HSE Compliance Dashboard — Design System

Route: `/hse` · Code: `artifacts/landfill-dashboard/src/hse/` · Tokens are scoped to `.hse-root`, so the landfill theme is untouched.

## 1. Design tokens

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--hse-bg` | `#F8FAFC` | `#090D16` | App background |
| `--hse-surface` | `#FFFFFF` | `#0F172A` | Cards, header |
| `--hse-surface-alt` | `#F1F5F9` | `#1E293B` | Table header, zebra rows, hover |
| `--hse-border` | `#E2E8F0` | `#1E293B` | Dividers, card borders |
| `--hse-text` | `#0F172A` | `#F1F5F9` | Primary text |
| `--hse-text-muted` | `#64748B` | `#94A3B8` | Secondary text |
| `--hse-sidebar` | `#0F172A` | `#060A12` | Navigation rail |
| `--hse-primary` | `#0284C7` | same | Brand / actions / focus |
| `--hse-success` | `#10B981` | same | Compliant, resolved |
| `--hse-warning` | `#F59E0B` | same | Action required |
| `--hse-danger` | `#EF4444` | same | Critical, alerts |

Risk severity scale: Critical `#EF4444` · Major `#F97316` · Moderate `#F59E0B` · Minor `#10B981`.

### Typography (Inter → Plus Jakarta Sans → system UI)
| Role | Size / weight |
|---|---|
| Page title | 24px / 600, tracking-tight |
| Metric value | 30px / 600, tabular-nums |
| Panel title | 16px / 600 |
| Body, table cells | 14px / 400–500 |
| Label / table head | 12px / 500, uppercase, +0.05em tracking |

### Spacing, radius, shadow
- Spacing: 4px base; card padding 20px; grid gap 16px; page padding 16px (mobile) / 24px (lg).
- Radius: sm 6px · md 10px (buttons, inputs) · lg 14px (cards) · full (badges).
- Shadow: `sm 0 1px 2px rgb(15 23 42 / .06)` · `md 0 4px 12px rgb(15 23 42 / .08)` (stronger in dark).

## 2. Component architecture

```
src/hse/
├── tokens.css            CSS variables (light + dark)
├── mock-data.ts          Replace with API hooks
├── HseDashboard.tsx      Page shell + grid (Panel helper)
└── components/
    ├── Sidebar.tsx         Collapsible nav, mobile drawer
    ├── TopHeader.tsx       Search, site selector, theme, notifications, profile
    ├── MetricCard.tsx      KPI + micro-trend (direction-aware colouring)
    ├── QuickActions.tsx    Primary + secondary action buttons
    ├── ComplianceRings.tsx Radial progress per regulatory framework
    ├── TrendChart.tsx      Recharts area chart, weekly/monthly/quarterly tabs
    ├── RiskMatrix.tsx      Severity bar + 5×5 likelihood×severity heatmap
    ├── DataTable.tsx       Filter, sort, pagination, inline actions
    └── StatusBadge.tsx     Compliant / Action Required / Critical Review
```

Layout: sidebar (256px, 72px collapsed, drawer < lg) + sticky header + max-width 1400px content. KPIs: 1 → 2 → 4 columns. Charts and table: stacked → 2/3 + 1/3 split at `xl`.

Notes:
- `goodWhenDown` on `MetricCard` keeps colour meaning correct (fewer hazards = green, even with a negative trend).
- Colours are never the only signal: badges carry text, icons carry `aria-label`s.
- To wire real data, replace `mock-data.ts` imports with hooks from `lib/api-client-react` and keep component props unchanged.
