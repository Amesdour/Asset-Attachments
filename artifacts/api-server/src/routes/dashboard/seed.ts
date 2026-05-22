import { db, wasteLogsTable, landfillConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const WASTE_TYPES = ["Household", "Industrial", "Hazardous", "Organic"];
const WASTE_CODES: Record<string, string[]> = {
  Household: ["HW-001", "HW-002", "HW-003", "HW-004"],
  Industrial: ["IW-010", "IW-011", "IW-012"],
  Hazardous: ["HZ-020", "HZ-021", "HZ-022"],
  Organic: ["OW-030", "OW-031"],
};
const TREATMENT_METHODS_BY_TYPE: Record<string, string[]> = {
  Household: ["Landfilled", "Recycled", "Composted"],
  Industrial: ["Landfilled", "Incinerated", "Recycled"],
  Hazardous: ["Incinerated", "Landfilled"],
  Organic: ["Composted", "Landfilled"],
};
const SITES = ["Zone A - North", "Zone B - South", "Zone C - East", "Zone D - Central"];
const TRUCKS = ["TRK-001", "TRK-002", "TRK-003", "TRK-004", "TRK-005", "TRK-006", "TRK-007", "TRK-008"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedDatabaseIfEmpty() {
  const existing = await db.select().from(wasteLogsTable).limit(1);
  if (existing.length > 0) return;

  const logs = [];
  const now = new Date();

  for (let daysAgo = 180; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const logsPerDay = Math.floor(randomBetween(8, 25));
    for (let i = 0; i < logsPerDay; i++) {
      const wasteType = randomChoice(WASTE_TYPES);
      const wasteCode = randomChoice(WASTE_CODES[wasteType]);
      const treatmentMethod = randomChoice(TREATMENT_METHODS_BY_TYPE[wasteType]);
      const treatmentStatus = treatmentMethod === "Landfilled" ? "Landfilled" : "Treated";

      const baseWeight = wasteType === "Household" ? 15 : wasteType === "Industrial" ? 40 : wasteType === "Hazardous" ? 8 : 12;
      const weight = randomBetween(baseWeight * 0.6, baseWeight * 1.6);

      const entryTime = new Date(date);
      entryTime.setHours(Math.floor(randomBetween(5, 20)), Math.floor(randomBetween(0, 60)));

      logs.push({
        timestamp: entryTime,
        weightMt: parseFloat(weight.toFixed(2)),
        wasteType,
        wasteCode,
        truckId: randomChoice(TRUCKS),
        site: randomChoice(SITES),
        treatmentStatus,
        treatmentMethod,
      });
    }
  }

  const batchSize = 200;
  for (let i = 0; i < logs.length; i += batchSize) {
    await db.insert(wasteLogsTable).values(logs.slice(i, i + batchSize));
  }

  await db
    .insert(landfillConfigTable)
    .values([{ key: "capacity_max_mt", value: "500000" }])
    .onConflictDoNothing();
}
