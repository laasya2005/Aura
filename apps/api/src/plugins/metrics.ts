import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// Simple Prometheus-compatible metrics collector
interface MetricCounter {
  labels: Record<string, string>;
  value: number;
}

interface MetricHistogram {
  labels: Record<string, string>;
  sum: number;
  count: number;
  buckets: Map<number, number>;
}

function labelKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

class MetricsRegistry {
  private counters = new Map<string, Map<string, MetricCounter>>();
  private histograms = new Map<string, Map<string, MetricHistogram>>();
  private readonly defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  incCounter(name: string, labels: Record<string, string>, value = 1) {
    if (!this.counters.has(name)) this.counters.set(name, new Map());
    const entries = this.counters.get(name)!;
    const key = labelKey(labels);
    const existing = entries.get(key);
    if (existing) {
      existing.value += value;
    } else {
      entries.set(key, { labels, value });
    }
  }

  observeHistogram(name: string, labels: Record<string, string>, value: number) {
    if (!this.histograms.has(name)) this.histograms.set(name, new Map());
    const entries = this.histograms.get(name)!;
    const key = labelKey(labels);
    let existing = entries.get(key);
    if (!existing) {
      existing = { labels, sum: 0, count: 0, buckets: new Map() };
      for (const b of this.defaultBuckets) existing.buckets.set(b, 0);
      entries.set(key, existing);
    }
    existing.sum += value;
    existing.count += 1;
    for (const b of this.defaultBuckets) {
      if (value <= b) existing.buckets.set(b, (existing.buckets.get(b) ?? 0) + 1);
    }
  }

  serialize(): string {
    const lines: string[] = [];

    for (const [name, entries] of this.counters) {
      lines.push(`# TYPE ${name} counter`);
      for (const entry of entries.values()) {
        const labelStr = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(",");
        lines.push(`${name}{${labelStr}} ${entry.value}`);
      }
    }

    for (const [name, entries] of this.histograms) {
      lines.push(`# TYPE ${name} histogram`);
      for (const entry of entries.values()) {
        const labelStr = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(",");
        for (const [bucket, count] of entry.buckets) {
          lines.push(`${name}_bucket{${labelStr},le="${bucket}"} ${count}`);
        }
        lines.push(`${name}_bucket{${labelStr},le="+Inf"} ${entry.count}`);
        lines.push(`${name}_sum{${labelStr}} ${entry.sum}`);
        lines.push(`${name}_count{${labelStr}} ${entry.count}`);
      }
    }

    return lines.join("\n") + "\n";
  }
}

declare module "fastify" {
  interface FastifyInstance {
    metrics: MetricsRegistry;
  }
}

export default fp(async (server: FastifyInstance) => {
  const metrics = new MetricsRegistry();
  server.decorate("metrics", metrics);

  // Track request duration and counts
  server.addHook("onResponse", (request: FastifyRequest, reply: FastifyReply, done) => {
    const duration = reply.elapsedTime / 1000; // convert ms to seconds
    const labels = {
      method: request.method,
      route: request.routeOptions?.url ?? request.url,
      status: String(reply.statusCode),
    };

    metrics.incCounter("http_requests_total", labels);
    metrics.observeHistogram("http_request_duration_seconds", labels, duration);

    done();
  });

  // Metrics endpoint
  server.get("/metrics", async (_request, reply) => {
    reply.header("content-type", "text/plain; version=0.0.4");
    return metrics.serialize();
  });
});
