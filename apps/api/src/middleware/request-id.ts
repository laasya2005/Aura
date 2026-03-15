import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = (request.headers["x-request-id"] as string) ?? randomUUID();
  request.requestId = requestId;
  reply.header("X-Request-ID", requestId);
}
