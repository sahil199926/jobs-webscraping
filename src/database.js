const { MongoClient } = require("mongodb");
const JobSchema = require("./jobSchema");
require("dotenv").config();

class DatabaseManager {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.dbName = process.env.DB_NAME || "jobPortal";
    this.collectionName = process.env.COLLECTION_NAME || "jobs";
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  async connect() {
    try {
      console.log("🔗 Connecting to MongoDB...");
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      console.log(`✅ Connected to database: ${this.dbName}`);
      console.log(`✅ Using collection: ${this.collectionName}`);

      // Create indexes for optimal performance
      await JobSchema.createIndexes(this.collection);

      return true;
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.connect();

      // Test basic operations
      const stats = await this.db.stats();
      console.log("\n📊 Database Stats:");
      console.log(`Database Name: ${stats.db}`);
      console.log(`Collections: ${stats.collections}`);
      console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);

      // Test collection operations
      const count = await this.collection.countDocuments();
      console.log(
        `\n📋 Collection "${this.collectionName}" has ${count} documents`
      );

      return true;
    } catch (error) {
      console.error("❌ Database test failed:", error.message);
      return false;
    }
  }

  /**
   * Save a single job to the database with schema validation and logging
   * @param {Object} jobData - Raw job data from scraper
   * @returns {Object} - Save result
   */
  async saveJob(jobData) {
    try {
      // Create structured job document using schema
      const jobDocument = JobSchema.createJobDocument(jobData);

      // Validate the document
      const validation = JobSchema.validateJobDocument(jobDocument);

      // Log the job data before saving
      console.log("\n📋 Job Data to Save:");
      console.log("=".repeat(50));
      console.log(`📝 Title: ${jobDocument.title}`);
      console.log(`🏢 Company: ${jobDocument.company}`);
      console.log(`📍 Location: ${jobDocument.location}`);
      console.log(`💰 Salary: ${jobDocument.salary.raw || "Not specified"}`);
      console.log(
        `💼 Job Types: ${jobDocument.jobTypes.join(", ") || "Not specified"}`
      );
      console.log(`🎯 Experience Level: ${jobDocument.experienceLevel}`);
      console.log(`🏠 Work Mode: ${jobDocument.workMode}`);
      console.log(`⭐ Company Rating: ${jobDocument.companyRating || "N/A"}`);
      console.log(`🔗 Source URL: ${jobDocument.sourceUrl || "N/A"}`);
      console.log(`📊 Data Quality Score: ${validation.score}%`);

      if (jobDocument.skills.length > 0) {
        console.log(
          `🛠️ Skills: ${jobDocument.skills.slice(0, 10).join(", ")}${
            jobDocument.skills.length > 10 ? "..." : ""
          }`
        );
      }

      if (validation.warnings.length > 0) {
        console.log(`⚠️ Warnings: ${validation.warnings.join(", ")}`);
      }

      console.log("=".repeat(50));

      if (!validation.isValid) {
        console.error(`❌ Validation failed: ${validation.errors.join(", ")}`);
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
          data: null,
        };
      }

      // Attempt to save the job
      const result = await this.collection.insertOne(jobDocument);

      console.log(`✅ Job saved successfully with ID: ${result.insertedId}`);

      return {
        success: true,
        error: null,
        data: {
          insertedId: result.insertedId,
          jobDocument,
          validation,
        },
      };
    } catch (error) {
      // Handle duplicate key error (job already exists)
      if (error.code === 11000) {
        console.log(
          `⚠️ Job already exists: ${jobData.title} at ${jobData.company}`
        );
        return {
          success: false,
          error: "Job already exists (duplicate)",
          data: null,
          isDuplicate: true,
        };
      }

      console.error("❌ Error saving job:", error.message);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Save multiple jobs to the database with batch processing
   * @param {Array} jobsData - Array of raw job data
   * @returns {Object} - Batch save result
   */
  async saveJobs(jobsData) {
    if (!Array.isArray(jobsData) || jobsData.length === 0) {
      console.log("⚠️ No jobs to save");
      return {
        success: true,
        totalJobs: 0,
        savedJobs: 0,
        duplicates: 0,
        errors: 0,
        details: [],
      };
    }

    console.log(`\n🔄 Starting batch save of ${jobsData.length} jobs...`);

    const results = {
      success: true,
      totalJobs: jobsData.length,
      savedJobs: 0,
      duplicates: 0,
      errors: 0,
      details: [],
    };

    for (let i = 0; i < jobsData.length; i++) {
      const jobData = jobsData[i];
      console.log(`\n📊 Processing job ${i + 1}/${jobsData.length}`);

      const saveResult = await this.saveJob(jobData);

      if (saveResult.success) {
        results.savedJobs++;
      } else if (saveResult.isDuplicate) {
        results.duplicates++;
      } else {
        results.errors++;
      }

      results.details.push({
        index: i,
        title: jobData.title,
        company: jobData.company,
        result: saveResult,
      });

      // Add a small delay to prevent overwhelming the database
      if (i < jobsData.length - 1) {
        await this.delay(100);
      }
    }

    console.log("\n📈 Batch Save Results:");
    console.log("=".repeat(40));
    console.log(`📊 Total Jobs: ${results.totalJobs}`);
    console.log(`✅ Successfully Saved: ${results.savedJobs}`);
    console.log(`🔄 Duplicates Skipped: ${results.duplicates}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log("=".repeat(40));

    return results;
  }

  /**
   * Add delay utility method
   * @param {number} ms - Milliseconds to delay
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getRecentJobs(limit = 10) {
    try {
      const jobs = await this.collection
        .find({})
        .sort({ scrapedAt: -1 })
        .limit(limit)
        .toArray();

      console.log(`\n📋 Last ${jobs.length} scraped jobs:`);
      jobs.forEach((job, index) => {
        console.log(
          `${index + 1}. ${job.title} at ${job.company} - ${job.location}`
        );
      });

      return jobs;
    } catch (error) {
      console.error("❌ Error fetching jobs:", error.message);
      return [];
    }
  }

  async getJobsByCompany(companyName, limit = 5) {
    try {
      const jobs = await this.collection
        .find({ company: new RegExp(companyName, "i") })
        .limit(limit)
        .toArray();

      console.log(`\n🏢 Jobs at companies matching "${companyName}":`);
      jobs.forEach((job, index) => {
        console.log(
          `${index + 1}. ${job.title} at ${job.company} - ${
            job.salary || "Salary not specified"
          }`
        );
      });

      return jobs;
    } catch (error) {
      console.error("❌ Error fetching jobs by company:", error.message);
      return [];
    }
  }

  async getJobStats() {
    try {
      const total = await this.collection.countDocuments();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await this.collection.countDocuments({
        scrapedAt: { $gte: today },
      });

      const companies = await this.collection.distinct("company");
      const locations = await this.collection.distinct("location");

      // Get salary statistics
      const salaryJobs = await this.collection
        .find({ salary: { $exists: true, $ne: null } })
        .toArray();

      // Get job types
      const jobTypesAgg = await this.collection
        .aggregate([
          { $unwind: "$jobTypes" },
          { $group: { _id: "$jobTypes", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      console.log("\n📊 Comprehensive Job Statistics:");
      console.log(`📈 Total jobs: ${total}`);
      console.log(`📅 Jobs scraped today: ${todayCount}`);
      console.log(`🏢 Unique companies: ${companies.length}`);
      console.log(`📍 Unique locations: ${locations.length}`);
      console.log(`💰 Jobs with salary info: ${salaryJobs.length}`);

      console.log("\n📋 Top Job Types:");
      jobTypesAgg.slice(0, 5).forEach((type, index) => {
        console.log(`${index + 1}. ${type._id}: ${type.count} jobs`);
      });

      return {
        total,
        todayCount,
        companiesCount: companies.length,
        locationsCount: locations.length,
        salaryJobsCount: salaryJobs.length,
        topJobTypes: jobTypesAgg.slice(0, 5),
      };
    } catch (error) {
      console.error("❌ Error getting job stats:", error.message);
      return null;
    }
  }

  async clearOldJobs(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.collection.deleteMany({
        scrapedAt: { $lt: cutoffDate },
      });

      console.log(
        `🗑️  Deleted ${result.deletedCount} jobs older than ${daysOld} days`
      );
      return result.deletedCount;
    } catch (error) {
      console.error("❌ Error clearing old jobs:", error.message);
      return 0;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close();
        console.log("🔒 Database connection closed");
      }
    } catch (error) {
      console.error("❌ Error closing database connection:", error);
    }
  }
}

// CLI usage
async function main() {
  const dbManager = new DatabaseManager();

  try {
    const isConnected = await dbManager.testConnection();

    if (isConnected) {
      await dbManager.getJobStats();
      await dbManager.getRecentJobs(5);
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
  } finally {
    await dbManager.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseManager;
