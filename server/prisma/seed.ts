import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const fullName = (process.env.ADMIN_NAME ?? "System Administrator Account").replace(/\s+/g, " ").trim();

  const parts = fullName.split(" ");
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : undefined;

  const passwordHash = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 12 });
  
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName,
      middleName,
      lastName,
      fullName,
      email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      authProvider: "LOCAL",
      addresses: {
        create: { entityType: "ADMIN", type: "WORK", fullAddress: "Head Office", isPrimary: true },
      },
    },
  });

  console.log(`Seeded admin: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());