import { pgPool, runDbInit } from "../src/db.js";

async function main() {
  try {
    await runDbInit();
    console.log("[Script] Database initialization script finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("[Script] Database initialization failed:", err);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

main();
