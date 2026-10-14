# calendarAgent

calendarAgent is an Express.js microservice that leverages large language models (LLMs), web scraping, and PDF parsing to generate comprehensive, yearly marketing plans for trampoline parks. It extracts structured holiday and break data from local school district calendar links and uploaded calendar PDF documents.

## Features
- **Scrape & Extract**: Parse text from provided URLs (e.g., local school calendars) and uploaded calendar PDF documents.
- **Yearly Plan Generation**: Automatically build a 12-month marketing strategy complete with broad, long-running themes (`rules`) and specific, short-term promotional days (`overrides`).
- **Multi-Source Aggregation**: Combines web links and uploaded calendar PDF files into unified scheduling context.
- **Unified LLM Wrapper**: Features fallback support for API keys (`LLM_API_KEY` and `LLM_API_KEY2`) ensuring high availability and seamless fallback.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root of the project with the following keys:
   ```env
   PORT=5005
   LLM_API_KEY=your_primary_api_key
   LLM_API_KEY2=your_fallback_api_key # optional
   ```

3. **Start the Service**
   ```bash
   npm start
   ```

## Endpoints

### `GET /health`
Returns the health status of the service.

### `POST /extract-holidays`
Extracts structured holiday data from a given URL or uploaded calendar PDF using LLMs.
- **Request Body**:
  ```json
  {
    "url": "https://example-school-calendar.com",
    "calendarPdf": {
      "name": "calendar.pdf",
      "data": "data:application/pdf;base64,..."
    }
  }
  ```

### `POST /generate-yearly-plan`
Generates a full marketing plan for a given year and location, incorporating localized school calendar data from both URLs and uploaded calendar PDF documents.
- **Request Body**:
  ```json
  {
    "requestId": "req-123",
    "organizationId": 1,
    "locationId": 1,
    "year": 2026,
    "parkDetails": {
      "name": "PixelPulse Play - Vaughan",
      "city": "Vaughan",
      "state": "Ontario",
      "country": "Canada",
      "timezone": "America/Toronto",
      "currency": "CAD"
    },
    "schoolDistrictCalendarUrls": [
      "https://www.ontario.ca/page/school-year-calendars"
    ],
    "calendarPdfs": [
      {
        "name": "school-calendar-2026.pdf",
        "data": "data:application/pdf;base64,..."
      }
    ]
  }
  ```

## Dependencies
- `express`
- `cors`
- `dotenv`
- `axios` (for web scraping/requests)
- `cheerio` (for HTML parsing)
- `pdf-parse` (for PDF text extraction)
