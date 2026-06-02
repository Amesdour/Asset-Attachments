import { db } from "@workspace/db";
import { adminCredentialsTable } from "@workspace/db/schema";
import { hashPassword } from "./password.js";
import { logger } from "./logger.js";

const DEFAULT_EMAIL = "admin@epwgcet.dz";
const DEFAULT_PASSWORD = "Admin@2024";

export async function seedAdminIfNeeded(): Promise<void> {
  try {
    const existing = await db.select().from(adminCredentialsTable).limit(1);
    if (existing.length > 0) return;

    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    await db.insert(adminCredentialsTable).values({
      email: DEFAULT_EMAIL,
      passwordHash,
    });

    logger.info(
      { email: DEFAULT_EMAIL },
      "Default admin account created. Change the password after first login."
    );
  } catch (err) {
    logger.error({ err }, "Failed to seed admin credentials");
  }
}
