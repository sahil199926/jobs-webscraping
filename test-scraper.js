#!/usr/bin/env node

/**
 * Test Script for Job Scraper with Database Schema
 * This script tests the complete flow: scraping, schema validation, and database storage
 */

const JobScraper = require("./src/scraper");
const DatabaseManager = require("./src/database");
require("dotenv").config();

async function runProductionScraper() {
  console.log("🚀 Starting Production Job Scraper for Wellfound...\n");

  const scraper = new JobScraper();

  try {
    await scraper.initialize();
    await scraper.databaseManager.connect();

    const naukriUrl =
      "https://www.naukri.com/software-engineer-jobs?k=software+engineer&nignbevent_src=jobsearchDeskGNB";

    console.log(`🎯 Strategy: Random Page Selection from Naukri`);
    console.log(`📄 Target: 4 random pages (between pages 2-100)`);
    console.log(`⏱️ Delay between requests: 4-10 seconds (random)`);
    console.log(
      `🖥️ Headless mode: ${
        process.env.HEADLESS === "false" ? "false (visible)" : "true"
      }\n`
    );

    const startTime = Date.now();
    const result = await scraper.scrapeJobs(naukriUrl, 4); // Scrape 4 random pages
    const duration = Date.now() - startTime;

    console.log("\n🏁 Scraping Completed!");
    console.log("=".repeat(50));
    console.log(`⏱️ Total Time: ${Math.round(duration / 1000)}s`);
    console.log(`📊 Total Jobs Processed: ${result?.length || 0}`);
    console.log("=".repeat(50));

    // Show final database statistics
    const stats = await scraper.databaseManager.getJobStats();
    console.log("\n� Final Database Statistics:");
    console.log(`   Total jobs in database: ${stats.totalJobs}`);
    console.log(`   Companies: ${stats.totalCompanies}`);
    console.log(`   Locations: ${stats.totalLocations}`);
  } catch (error) {
    console.error("❌ Production scraper failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  } finally {
    await scraper.cleanup();
    console.log("👋 Scraper finished successfully!");
    process.exit(0);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case "test":
    testJobScraper();
    break;
  case "scrape":
  case "run":
    runProductionScraper();
    break;
  default:
    console.log("📖 Usage:");
    console.log("  node test-scraper.js test    - Run all tests");
    console.log("  node test-scraper.js scrape  - Run production scraper");
    console.log("  node test-scraper.js run     - Run production scraper");
    console.log("");
    console.log("🌟 Environment Variables:");
    console.log("  MONGODB_URI       - MongoDB connection string");
    console.log("  DB_NAME           - Database name (default: jobPortal)");
    console.log("  COLLECTION_NAME   - Collection name (default: jobs)");
    console.log("  MAX_PAGES         - Maximum pages to scrape (default: 5)");
    console.log("  DELAY_BETWEEN_REQUESTS - Delay in ms (default: 2000)");
    console.log("  HEADLESS          - Run in headless mode (default: true)");
    console.log("  SCRAPE_URL        - Indeed URL to scrape");
    process.exit(0);
}
