import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@aura/db";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (server: FastifyInstance) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  await prisma.$connect();
  server.log.info("Database connected");

  server.decorate("prisma", prisma);

  server.addHook("onClose", async () => {
    await prisma.$disconnect();
    server.log.info("Database disconnected");
  });
});
