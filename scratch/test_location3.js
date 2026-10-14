const axios = require('axios');
axios.post('http://localhost:5005/generate-yearly-plan', {
  requestId: "123",
  organizationId: 1,
  locationId: 3,
  parkDetails: {
    name: "Aerosports St. Catharines",
    city: "St. Catharines",
    state: "Ontario",
    country: "Canada",
    timezone: "America/Toronto",
    currency: "CAD",
    website: "",
  },
  schoolDistrictCalendarUrls: [
    "https://www.dsbn.org/calendars"
  ],
  year: 2026,
  agentVersion: "1.1",
  schemaVersion: "1.1"
}).then(res => console.log("SUCCESS:", res.data.plan.name)).catch(e => console.error("ERROR:", e.response ? e.response.status : e.message, e.response ? e.response.data : ''));
