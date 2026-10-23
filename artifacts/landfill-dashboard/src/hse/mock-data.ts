export type Status = "compliant" | "action" | "critical";

export const kpis = [
  { id: "hazards", label: "Active Hazards", value: "42", trend: -6.1, goodWhenDown: true },
  { id: "audits", label: "Pending Audits", value: "9", trend: 12.5, goodWhenDown: true },
  { id: "score", label: "Compliance Score", value: "87.4%", trend: 4.2, goodWhenDown: false },
  { id: "incidents", label: "Open Incident Reports", value: "5", trend: -28.6, goodWhenDown: true },
] as const;

export const frameworks = [
  { name: "Décret Exécutif 91-05", value: 91 },
  { name: "Loi 88-07", value: 84 },
  { name: "ISO 45001", value: 72 },
  { name: "ISO 14001", value: 65 },
];

export const trend = {
  weekly: [
    { label: "W1", found: 12, resolved: 9 }, { label: "W2", found: 9, resolved: 10 },
    { label: "W3", found: 14, resolved: 11 }, { label: "W4", found: 8, resolved: 12 },
    { label: "W5", found: 10, resolved: 13 }, { label: "W6", found: 7, resolved: 9 },
  ],
  monthly: [
    { label: "May", found: 41, resolved: 33 }, { label: "Jun", found: 38, resolved: 36 },
    { label: "Jul", found: 45, resolved: 40 }, { label: "Aug", found: 33, resolved: 38 },
    { label: "Sep", found: 36, resolved: 41 }, { label: "Oct", found: 28, resolved: 34 },
  ],
  quarterly: [
    { label: "Q1", found: 120, resolved: 98 }, { label: "Q2", found: 124, resolved: 109 },
    { label: "Q3", found: 114, resolved: 115 }, { label: "Q4", found: 62, resolved: 71 },
  ],
};

export const risk = [
  { level: "Critical", count: 4, color: "#EF4444" },
  { level: "Major", count: 11, color: "#F97316" },
  { level: "Moderate", count: 18, color: "#F59E0B" },
  { level: "Minor", count: 9, color: "#10B981" },
];

// 5x5 likelihood x severity heatmap counts
export const matrix = [
  [0, 0, 1, 2, 1],
  [0, 1, 2, 3, 1],
  [1, 2, 4, 2, 0],
  [2, 3, 2, 1, 0],
  [3, 1, 0, 0, 0],
];

export const audits = [
  { id: "AUD-1042", item: "Stockage produits chimiques", ref: "Décret 91-05, Art. 12", site: "CET Jijel", owner: "K. Benali", due: "2026-10-28", status: "critical" as Status },
  { id: "AUD-1041", item: "Équipements de protection individuelle", ref: "Loi 88-07, Art. 5", site: "CET Taher", owner: "S. Merabet", due: "2026-11-02", status: "action" as Status },
  { id: "AUD-1039", item: "Plan d'évacuation incendie", ref: "Décret 91-05, Art. 20", site: "CET Jijel", owner: "A. Hamdi", due: "2026-11-09", status: "compliant" as Status },
  { id: "AUD-1037", item: "Formation sécurité des opérateurs", ref: "Loi 88-07, Art. 19", site: "CET El Milia", owner: "N. Khelil", due: "2026-11-14", status: "action" as Status },
  { id: "AUD-1033", item: "Contrôle des engins de manutention", ref: "ISO 45001, 8.1", site: "CET Taher", owner: "K. Benali", due: "2026-11-20", status: "compliant" as Status },
  { id: "AUD-1030", item: "Gestion des lixiviats", ref: "ISO 14001, 8.2", site: "CET Jijel", owner: "R. Zerrouki", due: "2026-11-25", status: "critical" as Status },
];
