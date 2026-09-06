import bcrypt from "bcryptjs";

import prisma from "../db.js";

const email = (process.env.PLATFORM_ADMIN_EMAIL ?? "admin@queueless.local").trim().toLowerCase();
const password = process.env.PLATFORM_ADMIN_PASSWORD ?? "ChangeMe123!";
const name = process.env.PLATFORM_ADMIN_NAME ?? "QueueLess Platform Admin";

if (password.length < 6) throw new Error("PLATFORM_ADMIN_PASSWORD must be at least 6 characters");

const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email },
  update: { name, passwordHash, role: "PLATFORM_ADMIN" },
  create: { name, email, passwordHash, role: "PLATFORM_ADMIN" },
  select: { id: true, name: true, email: true, role: true },
});

console.log(`Platform admin ready: ${user.email} (${user.role})`);
await prisma.$disconnect();
