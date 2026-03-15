import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // ramp up
    { duration: "1m", target: 10 }, // steady
    { duration: "30s", target: 50 }, // spike
    { duration: "1m", target: 50 }, // sustained spike
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health status 200": (r) => r.status === 200,
    "health response ok": (r) =>
      JSON.parse(r.body).status === "ok" || JSON.parse(r.body).status === "degraded",
    "health under 100ms": (r) => r.timings.duration < 100,
  });

  // Unauthenticated route - should return 401
  const protectedRes = http.get(`${BASE_URL}/users/me`);
  check(protectedRes, {
    "protected returns 401": (r) => r.status === 401,
  });

  // Non-existent route - should return 404
  const notFoundRes = http.get(`${BASE_URL}/nonexistent`);
  check(notFoundRes, {
    "not found returns 404": (r) => r.status === 404,
  });

  // Metrics endpoint
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  check(metricsRes, {
    "metrics status 200": (r) => r.status === 200,
    "metrics has content": (r) => r.body.length > 0,
  });

  sleep(1);
}
