import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import type { NextFunction, Request, Response } from "express";

type RequestMetrics = {
  databaseDurationMs: number;
  databaseQueries: number;
};

const requestMetrics = new AsyncLocalStorage<RequestMetrics>();

export function recordDatabaseQuery(durationMs: number) {
  const metrics = requestMetrics.getStore();
  if (!metrics) return;
  metrics.databaseQueries += 1;
  metrics.databaseDurationMs += durationMs;
}

export function performanceMetrics(req: Request, res: Response, next: NextFunction) {
  if (process.env.PERFORMANCE_LOGGING !== "true") {
    next();
    return;
  }

  const startedAt = performance.now();
  const metrics: RequestMetrics = { databaseDurationMs: 0, databaseQueries: 0 };

  requestMetrics.run(metrics, () => {
    res.on("finish", () => {
      const totalDurationMs = Number((performance.now() - startedAt).toFixed(1));
      console.log(JSON.stringify({
        type: "http_request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        totalDurationMs,
        databaseDurationMs: Number(metrics.databaseDurationMs.toFixed(1)),
        databaseQueries: metrics.databaseQueries,
      }));
    });
    next();
  });
}
