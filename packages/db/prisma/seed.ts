import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "test@aura.app" },
    update: {},
    create: {
      email: "test@aura.app",
      passwordHash: "$2a$12$placeholder.hash.for.seed.only",
      firstName: "Test",
      lastName: "User",
      timezone: "America/New_York",
      status: "ACTIVE",
      plan: "PRO",
      onboardedAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  console.log(`Created user: ${user.id}`);

  // Create Aura profile
  const profile = await prisma.auraProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      mode: "GLOW",
      warmth: 0.8,
      humor: 0.6,
      directness: 0.5,
      energy: 0.7,
    },
  });

  console.log(`Created aura profile: ${profile.id}`);

  // Create goals
  const fitnessGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Run 3x per week",
      description: "Build a consistent running habit",
      category: "FITNESS",
      status: "ACTIVE",
      currentStreak: 5,
      longestStreak: 12,
      lastStreakAt: new Date(),
    },
  });

  const mindfulnessGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Daily meditation",
      description: "10 minutes of meditation every morning",
      category: "MINDFULNESS",
      status: "ACTIVE",
      currentStreak: 3,
      longestStreak: 21,
      lastStreakAt: new Date(),
    },
  });

  console.log(`Created goals: ${fitnessGoal.id}, ${mindfulnessGoal.id}`);

  // Create schedules
  await prisma.schedule.create({
    data: {
      userId: user.id,
      type: "MORNING_TEXT",
      channel: "WEB",
      cronExpr: "0 7 * * *",
      timezone: "America/New_York",
      enabled: true,
    },
  });

  await prisma.schedule.create({
    data: {
      userId: user.id,
      type: "CHECK_IN",
      channel: "WEB",
      cronExpr: "0 12 * * *",
      timezone: "America/New_York",
      enabled: true,
    },
  });

  console.log("Created schedules");

  // Create a conversation with messages
  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      channel: "WEB",
      messages: {
        create: [
          {
            role: "ASSISTANT",
            content:
              "Good morning! Ready to crush your run today? The weather looks perfect for it 🏃‍♂️",
            channel: "WEB",
          },
          {
            role: "USER",
            content: "Yes! Just lacing up my shoes now",
            channel: "WEB",
          },
          {
            role: "ASSISTANT",
            content:
              "That's the spirit! Remember, consistency beats intensity. Enjoy every step 💪",
            channel: "WEB",
          },
        ],
      },
    },
  });

  console.log(`Created conversation: ${conversation.id}`);

  // Create subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Created subscription");

  // Create consent records
  await prisma.consentRecord.create({
    data: {
      userId: user.id,
      type: "MARKETING",
      granted: true,
      ipAddress: "127.0.0.1",
    },
  });

  await prisma.consentRecord.create({
    data: {
      userId: user.id,
      type: "DATA_PROCESSING",
      granted: true,
      ipAddress: "127.0.0.1",
    },
  });

  console.log("Created consent records");

  // Create a memory summary
  await prisma.memorySummary.create({
    data: {
      userId: user.id,
      type: "KEY_FACT",
      content:
        "User prefers morning runs around 7am. Responds well to encouraging messages. Currently training for a 10K.",
    },
  });

  console.log("Created memory summary");
  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
