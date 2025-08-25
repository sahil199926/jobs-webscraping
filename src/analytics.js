const IndeedJobScraper = require("./scraper");

class JobAnalytics {
  constructor(mongoUri, dbName = "jobPortal", collectionName = "jobs") {
    this.mongoUri = mongoUri;
    this.dbName = dbName;
    this.collectionName = collectionName;
    this.scraper = new IndeedJobScraper();
  }

  async initialize() {
    await this.scraper.initialize();
    this.collection = this.scraper.collection;
  }

  async getTopCompanies(limit = 10) {
    try {
      const pipeline = [
        { $group: { _id: "$company", jobCount: { $sum: 1 } } },
        { $sort: { jobCount: -1 } },
        { $limit: limit },
      ];

      const result = await this.collection.aggregate(pipeline).toArray();
      console.log(`\n🏢 Top ${limit} Companies by Job Count:`);
      result.forEach((company, index) => {
        console.log(`${index + 1}. ${company._id}: ${company.jobCount} jobs`);
      });

      return result;
    } catch (error) {
      console.error("Error getting top companies:", error);
    }
  }

  async getLocationDistribution(limit = 10) {
    try {
      const pipeline = [
        { $group: { _id: "$location", jobCount: { $sum: 1 } } },
        { $sort: { jobCount: -1 } },
        { $limit: limit },
      ];

      const result = await this.collection.aggregate(pipeline).toArray();
      console.log(`\n📍 Top ${limit} Locations by Job Count:`);
      result.forEach((location, index) => {
        console.log(`${index + 1}. ${location._id}: ${location.jobCount} jobs`);
      });

      return result;
    } catch (error) {
      console.error("Error getting location distribution:", error);
    }
  }

  async getSalaryAnalysis() {
    try {
      const jobs = await this.collection
        .find({ salary: { $exists: true, $ne: null } })
        .toArray();

      console.log(
        `\n💰 Salary Analysis (${jobs.length} jobs with salary info):`
      );

      const salaryRanges = {
        "Under 5 LPA": 0,
        "5-10 LPA": 0,
        "10-20 LPA": 0,
        "20-30 LPA": 0,
        "30-50 LPA": 0,
        "Above 50 LPA": 0,
      };

      jobs.forEach((job) => {
        const salary = job.salary.toLowerCase();
        if (salary.includes("₹")) {
          // Extract numeric values from salary string
          const numbers = salary.match(/[\d,]+/g);
          if (numbers) {
            const firstNumber = parseInt(numbers[0].replace(/,/g, ""));
            if (firstNumber < 500000) {
              salaryRanges["Under 5 LPA"]++;
            } else if (firstNumber < 1000000) {
              salaryRanges["5-10 LPA"]++;
            } else if (firstNumber < 2000000) {
              salaryRanges["10-20 LPA"]++;
            } else if (firstNumber < 3000000) {
              salaryRanges["20-30 LPA"]++;
            } else if (firstNumber < 5000000) {
              salaryRanges["30-50 LPA"]++;
            } else {
              salaryRanges["Above 50 LPA"]++;
            }
          }
        }
      });

      Object.entries(salaryRanges).forEach(([range, count]) => {
        console.log(`${range}: ${count} jobs`);
      });

      return salaryRanges;
    } catch (error) {
      console.error("Error analyzing salaries:", error);
    }
  }

  async getJobTypeDistribution() {
    try {
      const pipeline = [
        { $unwind: "$jobTypes" },
        { $group: { _id: "$jobTypes", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ];

      const result = await this.collection.aggregate(pipeline).toArray();
      console.log("\n💼 Job Type Distribution:");
      result.forEach((type, index) => {
        console.log(`${index + 1}. ${type._id}: ${type.count} jobs`);
      });

      return result;
    } catch (error) {
      console.error("Error getting job type distribution:", error);
    }
  }

  async getRecentJobs(hours = 24) {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const count = await this.collection.countDocuments({
        scrapedAt: { $gte: cutoff },
      });

      console.log(`\n🕐 Jobs scraped in last ${hours} hours: ${count}`);
      return count;
    } catch (error) {
      console.error("Error getting recent jobs:", error);
    }
  }

  async cleanup() {
    if (this.scraper) {
      await this.scraper.cleanup();
    }
  }
}

// Export for use in other files
module.exports = JobAnalytics;

// Run analytics if called directly
if (require.main === module) {
  async function runAnalytics() {
    const analytics = new JobAnalytics(process.env.MONGODB_URI);

    try {
      await analytics.initialize();

      await analytics.getTopCompanies();
      await analytics.getLocationDistribution();
      await analytics.getSalaryAnalysis();
      await analytics.getJobTypeDistribution();
      await analytics.getRecentJobs();
    } catch (error) {
      console.error("Error running analytics:", error);
    } finally {
      await analytics.cleanup();
    }
  }

  runAnalytics();
}
