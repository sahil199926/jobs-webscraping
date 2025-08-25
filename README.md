
## Features

- 🚀 **Automated Web Scraping**: Uses Puppeteer for dynamic content scraping
- 🗄️ **MongoDB Integration**: Stores job data with duplicate prevention
- 📊 **Analytics Dashboard**: Provides insights on scraped job data
- ⚡ **Configurable**: Easy to customize scraping parameters
- 🔄 **Rate Limiting**: Built-in delays to respect website policies
- 📈 **Progress Tracking**: Real-time scraping progress updates
- 🛡️ **Error Handling**: Robust error handling and recovery

## Installation

1. Clone or download this project
2. Install dependencies:

```bash
npm install
```

3. Configure your environment variables in `.env`:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://sahil:<your_db_password>@attendancecluster.to6lv.mongodb.net/
DB_NAME=jobPortal
COLLECTION_NAME=jobs

# Scraping Configuration
DELAY_BETWEEN_REQUESTS=2000
MAX_PAGES=5
HEADLESS=true
```

## Usage

### Basic Scraping

Run the scraper with default settings:

```bash
npm start
```

### Development Mode

Run with automatic restarts on file changes:

```bash
npm run dev
```

### Analytics

Run analytics on scraped data:

```bash
node src/analytics.js
```

## Configuration

### Environment Variables

- `MONGODB_URI`: Your MongoDB connection string
- `DB_NAME`: Database name (default: jobPortal)
- `COLLECTION_NAME`: Collection name (default: jobs)
- `DELAY_BETWEEN_REQUESTS`: Delay between page requests in milliseconds
- `MAX_PAGES`: Maximum number of pages to scrape
- `HEADLESS`: Run browser in headless mode (true/false)

### Customizing Search Parameters

Edit the `indeedUrl` variable in `src/scraper.js` to change search criteria:

```javascript
const indeedUrl = "https://in.indeed.com/jobs?q=your+search+terms&l=location";
```

## Data Structure

Each job record contains the following fields:

```javascript
{
  jobId: "unique_job_identifier",
  title: "Job Title",
  company: "Company Name",
  location: "Job Location",
  salary: "Salary Range",
  jobTypes: ["Full-time", "Remote"],
  rating: 4.2,
  description: ["Job description points"],
  benefits: ["Benefits listed"],
  jobUrl: "https://indeed.com/job/url",
  isUrgentlyHiring: false,
  hasEasilyApply: true,
  isNewJob: false,
  scrapedAt: "2024-01-01T00:00:00.000Z",
  source: "indeed.com"
}
```

## Analytics Features

The analytics module provides insights including:

- 🏢 **Top Companies**: Companies with most job postings
- 📍 **Location Distribution**: Job distribution by location
- 💰 **Salary Analysis**: Salary range breakdown
- 💼 **Job Types**: Distribution of job types
- 🕐 **Recent Activity**: Jobs scraped in recent hours

## Error Handling

The scraper includes comprehensive error handling for:

- Network timeouts
- Missing page elements
- Database connection issues
- Rate limiting responses
- Duplicate data prevention

## Best Practices

1. **Respect Rate Limits**: Don't set `DELAY_BETWEEN_REQUESTS` too low
2. **Monitor Resources**: Keep an eye on memory usage for large scraping jobs
3. **Database Indexing**: The scraper automatically creates indexes for performance
4. **Regular Cleanup**: Consider implementing data retention policies

## Troubleshooting

### Common Issues

1. **Browser Launch Failed**

   - Ensure you have sufficient system resources
   - Try running with `HEADLESS=false` to see browser activity

2. **MongoDB Connection Error**

   - Verify your MongoDB URI and credentials
   - Check network connectivity

3. **No Jobs Found**

   - The target website may have changed its structure
   - Check if the selectors in `extractJobData()` need updating

4. **Memory Issues**
   - Reduce `MAX_PAGES` for large scraping jobs
   - Consider implementing batch processing

## Legal Considerations

- Always respect robots.txt and website terms of service
- Implement appropriate rate limiting
- Use scraped data responsibly and ethically
- Consider reaching out to Indeed for official API access for commercial use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

# jobs-webscraping
