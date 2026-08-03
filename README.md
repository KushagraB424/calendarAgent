# calendarAgent

calendarAgent is an Express.js microservice that leverages large language models (LLMs) and web scraping to generate comprehensive, yearly marketing plans for trampoline parks. It can also extract structured holiday data from local school district calendars to assist in scheduling.

## Features
- **Scrape & Extract**: Parse text from provided URLs (e.g., local school calendars) and use LLMs to identify key holidays and PA days.
- **Yearly Plan Generation**: Automatically build a 12-month marketing strategy complete with broad, long-running themes (`rules`) and specific, short-term promotional days (`overrides`).
- **Unified LLM Wrapper**: Features fallback support for API keys (`LLM_API_KEY` and `LLM_API_KEY2`) ensuring high availability and seamless fallback.

## Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables**
   Create a \`.env\` file in the root of the project with the following keys:
   \`\`\`env
   PORT=5005
   LLM_API_KEY=your_primary_api_key
   LLM_API_KEY2=your_fallback_api_key # optional
   \`\`\`

3. **Start the Service**
   \`\`\`bash
   npm start
   \`\`\`

## Endpoints

### \`GET /health\`
Returns the health status of the service.

### \`POST /extract-holidays\`
Extracts structured holiday data from a given URL using web scraping and LLMs.
- **Request Body**:
  \`\`\`json
  {
    "url": "https://example-school-calendar.com"
  }
  \`\`\`

### \`POST /generate-yearly-plan\`
Generates a full marketing plan for a given year and location, incorporating localized school calendar data if a URL is provided.
- **Request Body**:
  \`\`\`json
  {
    "year": 2026,
    "city": "Brampton",
    "state": "Ontario",
    "schoolCalendarUrl": "https://example-school-calendar.com"
  }
  \`\`\`

## Dependencies
- \`express\`
- \`cors\`
- \`dotenv\`
- \`axios\` (for web scraping/requests)
- \`cheerio\` (for HTML parsing)
