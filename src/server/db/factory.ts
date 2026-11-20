import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { databaseSettings } from "../config/database";

export function createDatabase() {
  return new PrismaClient({
    adapter: new PrismaPg(databaseSettings()),
    log: [],
  });
}
