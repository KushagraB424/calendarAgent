const axios = require('axios');
axios.post('http://localhost:5005/generate-yearly-plan', {
  requestId: "123",
  organizationId: 1,
  locationId: 1,
  parkDetails: {
    name: "Aerosports Brampton",
    city: "Brampton",
    state: "Ontario",
    country: "USA",
    timezone: "America/Los_Angeles",
    currency: "CAD",
    website: "",
  },
  schoolDistrictCalendarUrls: [
    "https://www.ontario.ca/page/school-year-calendars"
  ],
  year: 2026,
  agentVersion: "1.1",
  schemaVersion: "1.1"
}).then(res => console.log("SUCCESS")).catch(e => console.error("ERROR:", e.response ? e.response.status : e.message, e.response ? e.response.data : ''));
