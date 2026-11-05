import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { recordDatabaseQuery } from "./observability.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in backend/.env");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
  log: [{ emit: "event", level: "query" }],
});

prisma.$on("query", (event) => {
  recordDatabaseQuery(event.duration);
  if (process.env.PERFORMANCE_LOGGING === "true" && event.duration >= 100) {
    console.log(JSON.stringify({ type: "database_query", durationMs: event.duration, target: event.target }));
  }
});

export default prisma;
