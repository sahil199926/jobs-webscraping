const IndeedJobScraper = require("./src/scraper");
const JobAnalytics = require("./src/analytics");

async function testScraper() {
  console.log("🧪 Testing Indeed Job Scraper...");

  // Test basic initialization
  const scraper = new IndeedJobScraper();

  try {
    console.log("🔧 Testing initialization...");
    await scraper.initialize();
    console.log("✅ Initialization successful!");

    // Test database connection
    await scraper.getJobStats();
    console.log("✅ Database connection working!");

    console.log("\n🎯 Ready to start scraping!");
    console.log("Run `npm start` to begin scraping Indeed jobs.");
    console.log("Run `node src/analytics.js` to view job analytics.");
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.message.includes("MongoDB")) {
      console.log("\n💡 MongoDB Connection Issue:");
      console.log(
        "1. Make sure to replace <db_password> in .env with your actual password"
      );
      console.log("2. Ensure your MongoDB cluster is running and accessible");
      console.log("3. Check your network connection");
    }
  } finally {
    await scraper.cleanup();
  }
}

if (require.main === module) {
  testScraper();
}
