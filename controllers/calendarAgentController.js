const axios = require('axios');
const { SpecialHours } = require('../models');

exports.extractAndPublishHolidays = async (req, res) => {
  try {
    const { url, locationId } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Default locationId to 1 if not provided, you might want to adjust based on authentication middleware
    const locId = locationId || req.user?.locationId || 1;

    // Call the microservice
    // The microservice runs on port 5173 by default
    const microserviceUrl = process.env.CALENDAR_AGENT_URL || 'http://localhost:5173';
    
    console.log(`Calling calendarAgent microservice at ${microserviceUrl}/extract-holidays with url: ${url}`);
    
    const response = await axios.post(`${microserviceUrl}/extract-holidays`, { url });
    
    // The response is expected to be a JSON array of dates or objects
    const data = response.data;
    
    // Depending on what Day 2 returns, we might have { data: { holidays: [...] } }
    // We will assume the microservice returns an array of holidays under data.holidays
    // like [{ date: '2024-12-25', name: 'Christmas Day' }]
    const holidays = data?.data?.holidays || [];
    
    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(200).json({ 
        message: 'No holidays were extracted from the URL.',
        rawText: data?.data?.rawText 
      });
    }

    let insertedCount = 0;
    
    // Upsert the holidays into the SpecialHours table
    for (const holiday of holidays) {
      if (!holiday.date || !holiday.name) continue;
      
      await SpecialHours.upsert({
        locationId: locId,
        date: holiday.date,
        label: holiday.name,
        isClosed: true // Assuming holidays mean the park is closed, or special hours apply
      });
      insertedCount++;
    }

    res.json({ 
      success: true, 
      message: `Successfully extracted and published ${insertedCount} holidays to the calendar.`,
      holidays 
    });

  } catch (error) {
    console.error('[extractAndPublishHolidays] Error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
