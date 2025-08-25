/**
 * Job Schema Definition for MongoDB
 * This file defines the structure and validation for job documents
 */

class JobSchema {
  /**
   * Creates a new job document with proper schema validation
   * @param {Object} jobData - Raw job data from scraper
   * @returns {Object} - Validated job document
   */
  static createJobDocument(jobData) {
    const now = new Date();

    // Validate required fields
    if (!jobData.title || !jobData.company) {
      throw new Error("Job title and company are required fields");
    }

    // Create the structured job document
    const jobDocument = {
      // Basic Information
      title: this.sanitizeString(jobData.title),
      company: this.sanitizeString(jobData.company),
      location: this.sanitizeString(jobData.location) || "Not specified",

      // Job Details
      description: this.sanitizeString(jobData.description) || "",
      summary: this.sanitizeString(jobData.summary) || "",
      requirements: Array.isArray(jobData.requirements)
        ? jobData.requirements
            .map((req) => this.sanitizeString(req))
            .filter(Boolean)
        : [],

      // Job Metadata
      jobTypes: Array.isArray(jobData.jobTypes)
        ? jobData.jobTypes
            .map((type) => this.sanitizeString(type))
            .filter(Boolean)
        : [this.sanitizeString(jobData.jobType)].filter(Boolean),

      workMode:
        this.extractWorkMode(jobData.location, jobData.jobTypes) || "On-site",

      // Company Details
      companyRating: jobData.companyRating
        ? parseFloat(jobData.companyRating)
        : null,
      companySize: this.sanitizeString(jobData.companySize) || null,
      industry: this.sanitizeString(jobData.industry) || null,

      // Source Information
      sourceUrl: this.sanitizeString(jobData.sourceUrl) || null,
      jobId: this.sanitizeString(jobData.jobId) || null,
      source: "naukri.com",

      // Experience Level
      experienceLevel: this.extractExperienceLevel(
        jobData.title,
        jobData.description
      ),

      // Skills (extracted from description and requirements)
      skills: this.extractSkills(jobData.description, jobData.requirements),

      // Posting Information
      postedDate: this.sanitizeString(jobData.postedDate) || null,

      // Timestamps
      scrapedAt: now,
      createdAt: now,
      updatedAt: now,

      // Data Quality
      dataQuality: this.calculateDataQuality(jobData),

      // Search and Indexing
      searchKeywords: this.generateSearchKeywords(jobData),
    };

    return jobDocument;
  }

  /**
   * Sanitizes string input by trimming and removing excessive whitespace
   * @param {string} str - Input string
   * @returns {string} - Sanitized string
   */
  static sanitizeString(str) {
    if (typeof str !== "string") return null;
    return str.trim().replace(/\s+/g, " ") || null;
  }

  /**
   * Extracts work mode from location and job types
   * @param {string} location - Job location
   * @param {Array} jobTypes - Job types array
   * @returns {string} - Work mode
   */
  static extractWorkMode(location, jobTypes) {
    const locationStr = (location || "").toLowerCase();
    const jobTypesStr = (
      Array.isArray(jobTypes) ? jobTypes.join(" ") : jobTypes || ""
    ).toLowerCase();

    if (
      locationStr.includes("remote") ||
      jobTypesStr.includes("remote") ||
      locationStr.includes("work from home")
    ) {
      return "Remote";
    }
    if (locationStr.includes("hybrid") || jobTypesStr.includes("hybrid")) {
      return "Hybrid";
    }

    return "On-site";
  }

  /**
   * Extracts experience level from job title and description
   * @param {string} title - Job title
   * @param {string} description - Job description
   * @returns {string} - Experience level
   */
  static extractExperienceLevel(title, description) {
    const text = ((title || "") + " " + (description || "")).toLowerCase();

    if (text.includes("intern") || text.includes("internship")) {
      return "Internship";
    }
    if (
      text.includes("entry") ||
      text.includes("junior") ||
      text.includes("fresher") ||
      text.includes("associate")
    ) {
      return "Entry Level";
    }
    if (
      text.includes("senior") ||
      text.includes("lead") ||
      text.includes("principal")
    ) {
      return "Senior Level";
    }
    if (
      text.includes("manager") ||
      text.includes("director") ||
      text.includes("head of")
    ) {
      return "Management";
    }

    return "Mid Level";
  }

  /**
   * Extracts skills from job description and requirements
   * @param {string} description - Job description
   * @param {Array} requirements - Job requirements
   * @returns {Array} - Array of skills
   */
  static extractSkills(description, requirements) {
    const text = (
      (description || "") +
      " " +
      (Array.isArray(requirements)
        ? requirements.join(" ")
        : requirements || "")
    ).toLowerCase();

    const commonSkills = [
      "javascript",
      "python",
      "java",
      "react",
      "angular",
      "vue",
      "node.js",
      "express",
      "mongodb",
      "mysql",
      "postgresql",
      "sql",
      "nosql",
      "redis",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "git",
      "html",
      "css",
      "sass",
      "less",
      "webpack",
      "babel",
      "typescript",
      "php",
      "laravel",
      "symfony",
      "django",
      "flask",
      "spring boot",
      "microservices",
      "rest api",
      "graphql",
      "agile",
      "scrum",
      "devops",
      "ci/cd",
      "jenkins",
      "terraform",
      "ansible",
      "linux",
      "ubuntu",
      "centos",
      "nginx",
      "apache",
    ];

    const foundSkills = commonSkills.filter((skill) =>
      text.includes(skill.toLowerCase())
    );

    return [...new Set(foundSkills)]; // Remove duplicates
  }

  /**
   * Calculates data quality score based on available fields
   * @param {Object} jobData - Job data
   * @returns {Object} - Data quality information
   */
  static calculateDataQuality(jobData) {
    const fields = [
      "title",
      "company",
      "location",
      "description",
      "jobTypes",
      "postedDate",
    ];
    const filledFields = fields.filter(
      (field) => jobData[field] && jobData[field].length > 0
    );

    const score = Math.round((filledFields.length / fields.length) * 100);

    return {
      score,
      filledFields: filledFields.length,
      totalFields: fields.length,
      missingFields: fields.filter(
        (field) => !jobData[field] || jobData[field].length === 0
      ),
    };
  }

  /**
   * Generates search keywords for better indexing
   * @param {Object} jobData - Job data
   * @returns {Array} - Array of search keywords
   */
  static generateSearchKeywords(jobData) {
    const keywords = new Set();

    // Add title words
    if (jobData.title) {
      jobData.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 2) keywords.add(word);
        });
    }

    // Add company name
    if (jobData.company) {
      keywords.add(jobData.company.toLowerCase());
    }

    // Add location
    if (jobData.location) {
      jobData.location
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 2) keywords.add(word);
        });
    }

    return Array.from(keywords);
  }

  /**
   * Creates database indexes for optimal query performance
   * @param {Object} collection - MongoDB collection
   */
  static async createIndexes(collection) {
    const indexes = [
      // Text search index
      {
        key: {
          title: "text",
          company: "text",
          description: "text",
          skills: "text",
        },
        name: "job_text_search",
      },
      // Common query indexes
      { key: { company: 1 }, name: "company_index" },
      { key: { location: 1 }, name: "location_index" },
      { key: { scrapedAt: -1 }, name: "scraped_date_index" },
      { key: { postedDate: -1 }, name: "posted_date_index" },
      { key: { experienceLevel: 1 }, name: "experience_level_index" },
      { key: { workMode: 1 }, name: "work_mode_index" },

      // Compound indexes
      { key: { company: 1, scrapedAt: -1 }, name: "company_date_index" },
      {
        key: { location: 1, experienceLevel: 1 },
        name: "location_experience_index",
      },

      // Unique index to prevent duplicates
      {
        key: { title: 1, company: 1, location: 1 },
        name: "job_unique_index",
        unique: true,
        partialFilterExpression: {
          title: { $exists: true },
          company: { $exists: true },
        },
      },
    ];

    for (const index of indexes) {
      try {
        const options = {
          name: index.name,
        };

        if (index.unique) {
          options.unique = index.unique;
        }

        if (index.partialFilterExpression) {
          options.partialFilterExpression = index.partialFilterExpression;
        }

        await collection.createIndex(index.key, options);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code !== 85) {
          // Index already exists
          console.warn(
            `⚠️ Index creation warning for ${index.name}:`,
            error.message
          );
        }
      }
    }
  }

  /**
   * Validates job document before saving
   * @param {Object} jobDocument - Job document to validate
   * @returns {Object} - Validation result
   */
  static validateJobDocument(jobDocument) {
    const errors = [];
    const warnings = [];

    // Required field validation
    if (!jobDocument.title) errors.push("Title is required");
    if (!jobDocument.company) errors.push("Company is required");

    // Data type validation
    if (
      jobDocument.companyRating &&
      (isNaN(jobDocument.companyRating) ||
        jobDocument.companyRating < 0 ||
        jobDocument.companyRating > 5)
    ) {
      warnings.push("Company rating should be between 0 and 5");
    }

    // Data quality check
    if (jobDocument.dataQuality.score < 50) {
      warnings.push("Low data quality score");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: jobDocument.dataQuality.score,
    };
  }
}

module.exports = JobSchema;
