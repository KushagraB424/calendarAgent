const express = require('express');
const router = express.Router();
const calendarAgentController = require('../controllers/calendarAgentController');

// The route that my-admin-app will call to scan and publish
router.post('/scan-and-publish', calendarAgentController.extractAndPublishHolidays);

module.exports = router;
