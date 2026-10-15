/**
 * Loads the shared ingredient catalog (data/globalIngredients.ts) into MongoDB.
 *
 *   npx tsx src/scripts/seedIngredients.ts              insert missing entries, leave existing alone
 *   npx tsx src/scripts/seedIngredients.ts --dry-run    show what would happen, change nothing
 *   npx tsx src/scripts/seedIngredients.ts --update     overwrite existing catalog entries
 *
 * Safe to re-run. NOTE on --update: recipes and pantry rows keep the baseQuantity they were saved
 * with, so changing a density here does not fix quantities that are already stored.
 */
import mongoose from "mongoose";
import { GLOBAL_INGREDIENTS } from "../data/globalIngredients.js";
import { buildSeedOps } from "../data/seedOps.js";
import { Ingredient } from "../models/ingredient.js";
import dotenv from "dotenv";

dotenv.config()

async function main() {
  const args = new Set(process.argv.slice(2));
  const update = args.has("--update");
  const dryRun = args.has("--dry-run");

  // Load .env if dotenv is installed; otherwise rely on the environment already being set.
  //await import("dotenv").catch(() => undefined);

  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("Set MONGODB_URI (or MONGO_URI / DATABASE_URL) to your connection string.");
  }

  const ops = buildSeedOps(GLOBAL_INGREDIENTS, { update });
  console.log(`${ops.length} catalog ingredients, mode: ${update ? "update" : "insert-only"}${dryRun ? " (dry run)" : ""}`);
  if (dryRun) return;

  await mongoose.connect(uri);
  try {
    // unordered: one clash (e.g. a household already made "Salt") must not stop the rest.
    const result = await Ingredient.bulkWrite(ops as unknown as Parameters<typeof Ingredient.bulkWrite>[0], {
      ordered: false,
    });
    console.log(`added ${result.upsertedCount}, updated ${result.modifiedCount}, already present ${result.matchedCount - result.modifiedCount}`);
  } catch (error) {
    const e = error as { writeErrors?: { errmsg?: string; err?: { errmsg?: string } }[]; result?: { upsertedCount?: number } };
    if (!e.writeErrors) throw error;
    console.error(`${e.writeErrors.length} entries could not be written (added ${e.result?.upsertedCount ?? 0}):`);
    for (const we of e.writeErrors) console.error("  -", we.errmsg ?? we.err?.errmsg ?? "unknown error");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
