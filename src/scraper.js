const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const DatabaseManager = require("./database");
require("dotenv").config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class JobScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.databaseManager = new DatabaseManager();
  }

  async initialize() {
    console.log("🚀 Initializing stealth browser...");

    // Launch browser with stealth settings
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS === "false" ? false : true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--disable-web-security",
        "--disable-features=ChromeWhatsNewUI",
        "--disable-ipc-flooding-protection",
        "--window-size=1366,768",
      ],
    });

    this.page = await this.browser.newPage();

    // Set realistic viewport
    await this.page.setViewport({ width: 1366, height: 768 });

    // Remove webdriver property
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    // Set realistic user agent (randomize)
    const userAgents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUA);

    // Set extra headers to look more human
    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    console.log(
      `✅ Stealth browser initialized with UA: ${randomUA.substring(0, 50)}...`
    );
  }

  async scrapeJobsFromPage(url, pageNumber = 1) {
    try {
      console.log(`📄 Scraping page ${pageNumber}: ${url}`);

      // Add human-like delay before navigation
      await this.sleep(1000 + Math.random() * 2000); // 1-3 seconds

      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Simulate human scrolling and mouse movements
      console.log("🤖 Simulating human behavior...");
      await this.simulateHumanBehavior();

      // Wait for Naukri job results to load
      const selectors = [
        ".styles_job-listing-container__OCfZC",
        ".srp-jobtuple-wrapper",
        ".cust-job-tuple",
        "#listContainer",
        ".styles_jlc__main__VdwtF",
      ];

      let pageLoaded = false;
      let foundSelector = null;

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 8000 });
          console.log(`✅ Page loaded with selector: ${selector}`);
          pageLoaded = true;
          foundSelector = selector;
          break;
        } catch (error) {
          console.log(`⏳ Trying next selector after timeout for: ${selector}`);
          continue;
        }
      }

      // If no selectors found, check if we're blocked
      if (!pageLoaded) {
        const content = await this.page.content();
        if (
          content.includes("Access blocked") ||
          content.includes("unusual activity")
        ) {
          console.log("🚫 Access blocked - implementing bypass strategies...");
          await this.handleAccessBlocked();
          return [];
        }

        console.log(
          "⚠️ No job selectors found, taking screenshot for debugging..."
        );
        await this.page.screenshot({
          path: `debug-naukri-${Date.now()}.png`,
          fullPage: true,
        });
        console.log("📸 Screenshot saved for debugging");
        return [];
      }

      const content = await this.page.content();
      const $ = cheerio.load(content);
      const jobs = [];

      // Extract jobs from Naukri
      $(".srp-jobtuple-wrapper").each((index, jobElement) => {
        try {
          const jobData = this.extractNaukriJobData($, jobElement);
          if (jobData) {
            jobs.push(jobData);
          }
        } catch (error) {
          console.warn(`⚠️ Error extracting job ${index}:`, error.message);
        }
      });

      console.log(`✅ Found ${jobs.length} jobs on page ${pageNumber}`);
      return jobs;
    } catch (error) {
      console.error(`❌ Error scraping page ${pageNumber}:`, error);
      return [];
    }
  }

  // Helper method to simulate human behavior
  async simulateHumanBehavior() {
    // Random mouse movements
    await this.page.mouse.move(Math.random() * 1366, Math.random() * 768);

    // Random scroll
    await this.page.evaluate(() => {
      window.scrollTo(0, Math.random() * 500);
    });

    await this.sleep(500 + Math.random() * 1000);

    // Scroll back to top
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  // Handle access blocked scenarios
  async handleAccessBlocked() {
    console.log("🔄 Attempting to bypass access block...");

    // Wait longer
    await this.sleep(5000 + Math.random() * 5000);

    // Try refreshing the page
    await this.page.reload({ waitUntil: "networkidle2" });

    // Add more human-like behavior
    await this.simulateHumanBehavior();
  }

  extractNaukriJobData($, jobElement) {
    const $job = $(jobElement);

    try {
      // Extract job ID from data attribute
      const jobId = $job.attr("data-job-id") || null;

      // Extract job title and URL
      const titleElement = $job.find(".title");
      const title = titleElement.text().trim();
      const jobUrl = titleElement.attr("href");

      if (!title) return null; // Skip if no title

      // Extract company name and URL
      const companyElement = $job.find(".comp-name");
      const company = companyElement.text().trim() || "Unknown Company";
      const companyUrl = companyElement.attr("href");

      // Extract company rating
      const ratingElement = $job.find(".rating .main-2");
      const companyRating = ratingElement.text().trim()
        ? parseFloat(ratingElement.text().trim())
        : null;

      // Extract experience
      const experienceElement = $job.find(".expwdth");
      const experience =
        experienceElement.attr("title") ||
        experienceElement.text().trim() ||
        null;

      // Extract location
      const locationElement = $job.find(".locWdth");
      const location =
        locationElement.attr("title") ||
        locationElement.text().trim() ||
        "Not specified";

      // Extract job description
      const descriptionElement = $job.find(".job-desc");
      const description = descriptionElement.text().trim() || "";

      // Extract posting date
      const postingElement = $job.find(".job-post-day");
      const postedDate = postingElement.text().trim() || "";

      // Extract company logo
      const logoElement = $job.find(".logoImage");
      const companyLogo = logoElement.attr("src") || "";

      // Assume full-time for Naukri jobs
      const jobType = "Full-time";

      // Extract skills from tags section
      const skillsFromTags = [];
      $job.find(".tags-gt .tag-li").each((i, tagElement) => {
        const skill = $(tagElement).text().trim();
        if (skill) {
          skillsFromTags.push(skill);
        }
      });

      // Fallback: Extract skills from description using keyword matching if no tags found
      const skillKeywords = [
        "JavaScript",
        "Python",
        "Java",
        "React",
        "Angular",
        "Vue",
        "Node.js",
        "TypeScript",
        "AWS",
        "Docker",
        "MongoDB",
        "MySQL",
        "PostgreSQL",
        "SQL",
        "NoSQL",
        "Git",
        "HTML",
        "CSS",
        "Kubernetes",
        "Jenkins",
        "TensorFlow",
        "PyTorch",
        "Scikit-learn",
        "Bootstrap",
        "Spring Boot",
        "Django",
        "Flask",
        "C++",
        "C#",
        ".NET",
        "PHP",
        "Ruby",
        "Go",
        "Rust",
        "Swift",
        "Kotlin",
      ];

      const skillsFromDescription = skillKeywords.filter(
        (skill) =>
          description.toLowerCase().includes(skill.toLowerCase()) ||
          title.toLowerCase().includes(skill.toLowerCase())
      );

      // Combine skills from tags and description, prioritizing tags
      const skills =
        skillsFromTags.length > 0 ? skillsFromTags : skillsFromDescription;

      return {
        jobId: jobId,
        title: title,
        company: company,
        location: location,
        jobType: jobType,
        jobTypes: [jobType],
        experience: experience,
        description: description,
        summary:
          description.length > 100
            ? description.substring(0, 100) + "..."
            : description,
        postedDate: postedDate,
        sourceUrl:
          jobUrl && jobUrl.startsWith("http")
            ? jobUrl
            : jobUrl
            ? `https://www.naukri.com${jobUrl}`
            : "",
        companyUrl:
          companyUrl && companyUrl.startsWith("http")
            ? companyUrl
            : companyUrl
            ? `https://www.naukri.com${companyUrl}`
            : "",
        companyLogo: companyLogo,
        companySize: "",
        companyStatus: "",
        requirements: skills,
        benefits: [],
        skills: skills,

        hasEasilyApply: true,
        source: "naukri.com",
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error("❌ Error extracting Naukri job data:", error.message);
      return null;
    }
  }

  extractRemoteOKJobData($, jobRow) {
    const $job = $(jobRow);

    try {
      // Extract job title
      const titleElement = $job.find(".company h2");
      const title = titleElement.text().trim();

      if (!title) return null; // Skip if no title

      // Extract company name
      const companyElement = $job.find(".company h3");
      const company = companyElement.text().trim() || "Remote Company";

      // Extract location (RemoteOK is all remote)
      const location = "Remote";

      // Extract tags/skills
      const tagElements = $job.find(".tags .tag");
      const skills = [];
      tagElements.each((i, el) => {
        const skill = $(el).text().trim();
        if (skill) skills.push(skill);
      });

      // Extract job URL
      const jobUrl = $job.find("a.preventLink").attr("href");
      const fullJobUrl = jobUrl ? `https://remoteok.io${jobUrl}` : "";

      // Extract job ID from URL or data attribute
      const jobId = $job.attr("data-id") || jobUrl?.split("/").pop() || null;

      // Extract posting date
      const dateElement = $job.find(".time time");
      const postedDate =
        dateElement.attr("datetime") || dateElement.text().trim() || "";

      // Extract job type (assume full-time for RemoteOK)
      const jobType = "Full-time";

      return {
        jobId: jobId,
        title: title,
        company: company,
        location: location,
        jobType: jobType,
        jobTypes: [jobType],
        experience: null,
        description: skills.join(", "),
        summary: `${title} at ${company} - Remote position`,
        postedDate: postedDate,
        sourceUrl: fullJobUrl,
        companyUrl: "",
        companySize: "",
        companyStatus: "",
        requirements: skills,
        benefits: [],
        skills: skills,
        companyRating: null,
        hasEasilyApply: true,
        source: "remoteok.io",
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error("❌ Error extracting RemoteOK job data:", error.message);
      return null;
    }
  }

  extractWellfoundJobData($, companyCard) {
    const $card = $(companyCard);
    const jobs = [];

    try {
      // Extract company information
      const companyElement = $card.find(
        '[data-testid="startup-header"] a[href^="/company/"]'
      );
      const companyName =
        companyElement.find("h2").text().trim() || "Unknown Company";
      const companyUrl = companyElement.attr("href") || "";
      const companyDescription =
        $card
          .find('[data-testid="startup-header"]')
          .parent()
          .find("span.text-xs.text-neutral-1000")
          .first()
          .text()
          .trim() || "";

      // Extract company size
      const companySizeText = $card
        .find("span.text-xs.italic.text-neutral-500")
        .text()
        .trim();
      const companySizeMatch = companySizeText.match(
        /(\d+[-–]\d+|\d+\+)\s*Employees/
      );
      const companySize = companySizeMatch ? companySizeMatch[1] : "";

      // Extract company status (Actively Hiring, etc.)
      const companyStatus = $card.find(".text-pop-green").text().trim();

      // Find all job positions within this company card
      $card
        .find(".min-h-\\[50px\\].items-end.justify-between")
        .each((jobIndex, jobElement) => {
          const $job = $(jobElement);

          // Extract job title and URL
          const jobTitleElement = $job.find(
            "a.text-sm.font-semibold.text-brand-burgandy"
          );
          const title = jobTitleElement.text().trim();
          const jobPath = jobTitleElement.attr("href") || "";

          if (!title) return; // Skip if no job title found

          // Extract job type
          const jobType =
            $job
              .find(".whitespace-nowrap.rounded-lg.bg-accent-yellow-100")
              .text()
              .trim() || "Full-time";

          // Extract location
          const locationElement = $job
            .find("span.pl-1.text-xs")
            .filter((i, el) => {
              const text = $(el).text();
              return (
                text.includes("Remote") ||
                text.includes("•") ||
                text.includes("United States") ||
                text.includes("Everywhere")
              );
            });
          const location =
            locationElement.first().text().trim() || "Not specified";

          // Extract experience requirement
          const experienceElement = $job
            .find("span.pl-1.text-xs")
            .filter((i, el) => {
              const text = $(el).text();
              return text.includes("years") || text.includes("exp");
            });
          const experience = experienceElement.first().text().trim() || null;

          // Extract posting date
          const dateElement = $job.find(".text-xs.lowercase.text-dark-a");
          const postedDate = dateElement.first().text().trim() || "";

          // Extract job ID from URL
          const jobIdMatch = jobPath.match(/\/jobs\/(\d+)-/);
          const jobId = jobIdMatch ? jobIdMatch[1] : null;

          // Create job object
          const jobData = {
            jobId: jobId,
            title: title,
            company: companyName,
            location: location,
            jobType: jobType,
            jobTypes: [jobType],
            experience: experience,
            description: companyDescription,
            summary:
              companyDescription.substring(0, 100) +
              (companyDescription.length > 100 ? "..." : ""),
            postedDate: postedDate,
            sourceUrl: jobPath.startsWith("/")
              ? `https://wellfound.com${jobPath}`
              : jobPath,
            companyUrl: companyUrl.startsWith("/")
              ? `https://wellfound.com${companyUrl}`
              : companyUrl,
            companySize: companySize,
            companyStatus: companyStatus,
            requirements: [],
            benefits: [],
            companyRating: null,
            hasEasilyApply: true,
            source: "wellfound.com",
            scrapedAt: new Date(),
          };

          console.log(`📋 Found job: ${title} at ${companyName}`);
          jobs.push(jobData);
        });
    } catch (error) {
      console.error("❌ Error processing company card:", error.message);
    }

    return jobs;
  }

  async saveJobsToDatabase(jobs) {
    if (!jobs || jobs.length === 0) {
      console.log("📝 No jobs to save");
      return {
        totalJobs: 0,
        savedJobs: 0,
        duplicates: 0,
        errors: 0,
      };
    }

    console.log(`\n💾 Processing ${jobs.length} jobs for database storage...`);

    // Use the DatabaseManager to save jobs with schema validation and logging
    const result = await this.databaseManager.saveJobs(jobs);

    return result;
  }

  async scrapeJobs(baseUrl, targetPages = 4) {
    try {
      let allJobs = [];
      let scrapedPages = 0;
      const usedPages = new Set(); // Track used page numbers to avoid duplicates

      console.log(
        `🎯 Target: Scrape ${targetPages} random pages from Naukri (pages 2-100)`
      );

      while (scrapedPages < targetPages) {
        // Generate random page number between 2 and 100
        let randomPage;
        do {
          randomPage = Math.floor(Math.random() * 99) + 2; // 2 to 100
        } while (usedPages.has(randomPage));

        usedPages.add(randomPage);

        // Build URL with random page number
        // For Naukri, the URL format is: /software-engineer-jobs-{pageNumber}?query=params
        // We need to insert the page number before the query parameters
        let url;
        if (baseUrl.includes("?")) {
          // Split the base URL and query parameters
          const baseWithoutQuery = baseUrl.split("?")[0];
          const queryParams = "?" + baseUrl.split("?")[1];

          // Remove any existing page number from the base URL (like -jobs-10)
          const cleanBase = baseWithoutQuery.replace(/-\d+$/, "");

          // Construct the new URL with the random page number
          url = `${cleanBase}-${randomPage}${queryParams}`;
        } else {
          // No query parameters
          const cleanBase = baseUrl.replace(/-\d+$/, "");
          url = `${cleanBase}-${randomPage}`;
        }

        console.log(
          `\n🎲 Randomly selected page ${randomPage} (${
            scrapedPages + 1
          }/${targetPages})`
        );
        console.log(`🔗 Constructed URL: ${url}`);

        const jobs = await this.scrapeJobsFromPage(url, randomPage);

        if (jobs.length === 0) {
          console.log(`⚠️ No jobs found on page ${randomPage}, continuing...`);
        } else {
          allJobs = [...allJobs, ...jobs];
          // Save jobs to database after each page
          await this.saveJobsToDatabase(jobs);
        }

        scrapedPages++;

        // Add delay between requests to be respectful and avoid rate limiting
        if (scrapedPages < targetPages) {
          const delay = 4000 + Math.random() * 6000; // 4-10 seconds random delay
          console.log(
            `⏳ Waiting ${Math.round(delay)}ms before next random page...`
          );
          await this.sleep(delay);
        }
      }

      console.log(`\n🎉 Random page scraping completed!`);
      console.log(`📊 Scraped ${scrapedPages} random pages`);
      console.log(`📋 Total jobs collected: ${allJobs.length}`);
      console.log(
        `🔢 Pages used: ${Array.from(usedPages)
          .sort((a, b) => a - b)
          .join(", ")}`
      );

      return allJobs;
    } catch (error) {
      console.error("❌ Error during random page scraping:", error);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log("🔒 Browser closed");
      }

      if (this.dbManager) {
        await this.dbManager.close();
        console.log("🔒 Database connection closed");
      }
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  async getJobStats() {
    try {
      return await this.dbManager.getJobStats();
    } catch (error) {
      console.error("❌ Error getting job stats:", error);
    }
  }
}

// Main execution
async function main() {
  const scraper = new JobScraper();

  try {
    await scraper.initialize();

    // Naukri URL for software engineer jobs
    const naukriUrl =
      "https://www.naukri.com/software-engineer-jobs?k=software+engineer&nignbevent_src=jobsearchDeskGNB";

    console.log("🎯 Starting random Naukri job scraping...");
    console.log("📊 Will scrape 4 random pages from pages 2-100");

    await scraper.scrapeJobs(naukriUrl, 4); // Scrape 4 random pages

    // Get and display statistics
    await scraper.getJobStats();
  } catch (error) {
    console.error("💥 Fatal error:", error);
  } finally {
    await scraper.cleanup();
    process.exit(0);
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log("\n🛑 Process interrupted, cleaning up...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Process terminated, cleaning up...");
  process.exit(0);
});

// Run the scraper
if (require.main === module) {
  main();
}

module.exports = JobScraper;
