const axios = require('axios');
axios.post('http://localhost:5005/generate-yearly-plan', {
  requestId: "123",
  organizationId: 1,
  locationId: 1,
  year: 2026,
  parkDetails: {
    city: "Brampton", state: "ON", name: "Aerosports Brampton", timezone: "America/Toronto", currency: "CAD", country: "CA"
  },
  schoolDistrictCalendarUrls: [
    "https://www.ontario.ca/page/school-year-calendars"
  ]
}).then(res => console.log(JSON.stringify(res.data, null, 2))).catch(e => console.error(e.response ? e.response.data : e.message));
