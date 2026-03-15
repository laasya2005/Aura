import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export default fp(async (server: FastifyInstance) => {
  await server.register(swagger, {
    openapi: {
      info: {
        title: "Aura API",
        version: "0.1.0",
        description: "AI Companion Application API",
      },
      servers: [{ url: "http://localhost:3001", description: "Development" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: "/docs",
  });
});
