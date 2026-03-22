/**
 * One-time backfill script for existing iMessage users.
 * Sends a message asking for their timezone so the conversation flow handles the rest.
 *
 * Usage: npx tsx apps/api/src/scripts/backfill-timezones.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../..", ".env") });

import { PrismaClient } from "@aura/db";

const prisma = new PrismaClient();

const DEFAULT_SCHEDULES = [
  { type: "MORNING_TEXT" as const, cronExpr: "0 8 * * *" },
  { type: "CHECK_IN" as const, cronExpr: "0 13 * * *" },
  { type: "EVENING_RECAP" as const, cronExpr: "0 20 * * *" },
];

async function backfill() {
  // Find all iMessage users who don't have their timezone set
  const users = await prisma.user.findMany({
    where: {
      phone: { not: null },
      timezoneSet: false,
    },
    select: { id: true, phone: true, timezone: true },
  });

  console.log(`Found ${users.length} iMessage users without timezone set`);

  let schedulesCreated = 0;
  let messaged = 0;

  for (const user of users) {
    // Check if they have any schedules at all
    const existing = await prisma.schedule.findMany({
      where: { userId: user.id },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((s) => s.type));

    // Create missing default schedules directly in DB
    // (no BullMQ — rehydrateSchedules picks them up on next worker restart)
    for (const def of DEFAULT_SCHEDULES) {
      if (existingTypes.has(def.type)) continue;
      await prisma.schedule.create({
        data: {
          userId: user.id,
          type: def.type,
          channel: "SMS",
          cronExpr: def.cronExpr,
          timezone: user.timezone,
          enabled: true,
        },
      });
      schedulesCreated++;
    }

    if (!existingTypes.size) {
      console.log(`  [${user.id}] Created default schedules (${user.timezone})`);
    }

    // Send a message asking for timezone via Sendblue
    if (user.phone && process.env.SENDBLUE_API_KEY && process.env.SENDBLUE_API_SECRET) {
      try {
        const res = await fetch("https://api.sendblue.co/api/send-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "sb-api-key-id": process.env.SENDBLUE_API_KEY,
            "sb-api-secret-key": process.env.SENDBLUE_API_SECRET,
          },
          body: JSON.stringify({
            number: user.phone,
            content:
              "Hey! Quick question — what timezone are you in? (Eastern, Central, Mountain, or Pacific) I want to make sure I'm texting you at the right times!",
          }),
        });

        if (res.ok) {
          messaged++;
          console.log(`  [${user.id}] Sent timezone question to ***${user.phone.slice(-4)}`);
        } else {
          console.error(`  [${user.id}] Failed to send: ${res.status}`);
        }
      } catch (err) {
        console.error(`  [${user.id}] Send error:`, err);
      }

      // Stagger messages to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Users processed: ${users.length}`);
  console.log(`  Schedules created: ${schedulesCreated}`);
  console.log(`  Timezone questions sent: ${messaged}`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
