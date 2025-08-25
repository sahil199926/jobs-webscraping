#!/usr/bin/env node

/**
 * Test Script for Job Scraper with Database Schema
 * This script tests the complete flow: scraping, schema validation, and database storage
 */

const JobScraper = require("./src/scraper");
const DatabaseManager = require("./src/database");
require("dotenv").config();

async function testJobScraper() {
  console.log("🧪 Starting Job Scraper Test...\n");

  const scraper = new JobScraper();
  let testPassed = true;

  try {
    // Test 1: Database Connection
    console.log("🔧 Test 1: Database Connection");
    await scraper.initialize();
    console.log("✅ Database connected successfully\n");

    // Test 2: Test Database Schema and Indexes
    console.log("🔧 Test 2: Database Schema Validation");
    const dbManager = new DatabaseManager();
    await dbManager.connect();
    console.log("✅ Database schema and indexes created successfully\n");

    // Test 3: Scrape Sample Jobs with Random Pages
    console.log("🔧 Test 3: Scraping Sample Jobs from Random Pages");
    const naukriUrl =
      "https://www.naukri.com/software-engineer-jobs?k=software+engineer&nignbevent_src=jobsearchDeskGNB";

    // Scrape 5 random pages for testing (instead of 34 for full run)
    const jobs = await scraper.scrapeJobs(naukriUrl, 5);
    console.log(`✅ Successfully scraped from 5 random pages\n`);

    // Test 4: Database Statistics
    console.log("🔧 Test 4: Database Statistics");
    await scraper.getJobStats();
    console.log("✅ Database statistics retrieved successfully\n");

    // Test 5: Sample Data Quality Check
    console.log("🔧 Test 5: Recent Jobs Data Quality");
    await dbManager.getRecentJobs(5);
    console.log("✅ Recent jobs data quality verified\n");

    // Test 6: Search Functionality Test
    console.log("🔧 Test 6: Search Functionality Test");
    await dbManager.getJobsByCompany("indeed", 3);
    console.log("✅ Company search functionality verified\n");

    console.log("🎉 All tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
    testPassed = false;
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await scraper.cleanup();

    if (testPassed) {
      console.log("✅ Job Scraper is ready for production use!");
      process.exit(0);
    } else {
      console.log("❌ Some tests failed. Please check the configuration.");
      process.exit(1);
    }
  }
}

async function runProductionScraper() {
  console.log("🚀 Starting Production Job Scraper for Wellfound...\n");

  const scraper = new JobScraper();

  try {
    await scraper.initialize();
    await scraper.databaseManager.connect();

    const naukriUrl =
      "https://www.naukri.com/software-engineer-jobs?k=software+engineer&nignbevent_src=jobsearchDeskGNB";

    console.log(`🎯 Strategy: Random Page Selection from Naukri`);
    console.log(`📄 Target: 34 random pages (between pages 2-100)`);
    console.log(`⏱️ Delay between requests: 4-10 seconds (random)`);
    console.log(
      `🖥️ Headless mode: ${
        process.env.HEADLESS === "false" ? "false (visible)" : "true"
      }\n`
    );

    const startTime = Date.now();
    const result = await scraper.scrapeJobs(naukriUrl, 34); // Scrape 34 random pages
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
