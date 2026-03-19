if (process.env.NODE_ENV !== "production") {
  const { config } = await import("dotenv");
  const { resolve, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(__dirname, "../../..", ".env") });
}

import { buildServer } from "./app.js";

export { buildServer };

// --- Start ---
const start = async () => {
  const server = buildServer();
  const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 3001;
  const host = process.env.API_HOST ?? "0.0.0.0";

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      server.log.info(`Received ${signal}, shutting down...`);
      await server.close();
      process.exit(0);
    });
  }

  await server.listen({ port, host });
  server.log.info(`Aura API running on ${host}:${port}`);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
