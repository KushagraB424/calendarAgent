const assert = require('assert');
const { validatePlan } = require('./utils/planValidator');
const { getCanadianHolidays } = require('./utils/canadianCalendarHelper');

function runUnitValidationTests() {
  console.log('🧪 Starting Canadian Calendar & Marketability Unit Tests...\n');

  const parkDetails = {
    name: 'Aerosports Brampton',
    city: 'Brampton',
    state: 'Ontario',
    country: 'Canada',
    timezone: 'America/Toronto',
    currency: 'CAD',
  };

  const validPlan = {
    plan: {
      name: '2026 Canadian Marketing Plan',
      description: 'Aerosports Brampton Yearly Marketing Plan',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      rules: [
        {
          title: 'Summer Jump Pass Season',
          type: 'planning_campaign',
          description: 'Multi-week summer discount pass for students and families',
          confidenceScore: 100,
          recommendedAction: 'auto-apply',
        },
      ],
      overrides: [
        {
          title: "New Year's Day Jump Celebration",
          type: 'planning_holiday',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
          description: "Special New Year's Day jump session",
          sourceEvidence: 'Canadian statutory holiday',
          confidenceScore: 100,
          recommendedAction: 'auto-apply',
        },
        {
          title: 'Ontario Winter PA Day Jump Camp',
          type: 'planning_offer',
          startDate: '2026-01-23',
          endDate: '2026-01-23',
          description: 'Full day jump pass and drop-in camp for students off school on PA Day',
          sourceEvidence: 'Peel District School Board calendar PA Day',
          confidenceScore: 95,
          recommendedAction: 'auto-apply',
        },
        {
          title: 'Family Day Long Weekend Mega Bounce',
          type: 'planning_holiday',
          startDate: '2026-02-16',
          endDate: '2026-02-16',
          description: 'Ontario Family Day statutory holiday family passes and group bounce deals',
          sourceEvidence: 'Ontario Statutory Holiday (3rd Monday of February)',
          confidenceScore: 100,
          recommendedAction: 'auto-apply',
        },
        {
          title: 'March Break Mega Jump Week',
          type: 'planning_offer',
          startDate: '2026-03-16',
          endDate: '2026-03-20',
          description: 'Extended opening hours and all-access passes during Ontario March Break',
          sourceEvidence: 'Ontario Ministry of Education March Break',
          confidenceScore: 100,
          recommendedAction: 'auto-apply',
        },
        {
          title: 'College & University Reading Week Jump Night',
          type: 'planning_event',
          startDate: '2026-02-17',
          endDate: '2026-02-19',
          description: 'Student discount with valid post-secondary ID during college reading week',
          sourceEvidence: 'Ontario College and University Winter Reading Week',
          confidenceScore: 90,
          recommendedAction: 'auto-apply',
        },
        {
          title: 'Canada Day Red & White Jump Fest',
          type: 'planning_holiday',
          startDate: '2026-07-01',
          endDate: '2026-07-01',
          description: 'National holiday celebration with red and white socks and bounce deals',
          sourceEvidence: 'Canada national holiday July 1st',
          confidenceScore: 100,
          recommendedAction: 'auto-apply',
        },
        {
          title: 'Canadian Thanksgiving Family Special',
          type: 'planning_holiday',
          startDate: '2026-10-12',
          endDate: '2026-10-12',
          description: 'Second Monday in October family gathering jump pass deals',
          sourceEvidence: 'Canadian national Thanksgiving',
          confidenceScore: 100,
          recommendedAction: 'auto-apply',
        },
      ],
    },
  };

  // Test 1: Valid Canadian Plan Passes
  try {
    validatePlan(validPlan, 2026, parkDetails);
    console.log('✅ Test 1 Passed: Valid Canadian marketable plan accepted.');
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
    process.exit(1);
  }

  // Test 2: Reject US 4th of July for Canada
  try {
    const invalidPlan = JSON.parse(JSON.stringify(validPlan));
    invalidPlan.plan.overrides.push({
      title: '4th of July Fireworks Jump Special',
      type: 'planning_holiday',
      startDate: '2026-07-04',
      endDate: '2026-07-04',
      description: 'US independence day jump special',
      sourceEvidence: 'US Holiday calendar',
      confidenceScore: 100,
      recommendedAction: 'auto-apply',
    });
    validatePlan(invalidPlan, 2026, parkDetails);
    assert.fail('Should have rejected 4th of July for Canada');
  } catch (err) {
    assert(err.message.includes('False holiday for Canadian location') || err.message.includes('US Independence Day'));
    console.log('✅ Test 2 Passed: Rejected US 4th of July for Canadian location.');
  }

  // Test 3: Reject US Thanksgiving in November for Canada
  try {
    const invalidPlan = JSON.parse(JSON.stringify(validPlan));
    invalidPlan.plan.overrides.push({
      title: 'Thanksgiving Holiday Deal',
      type: 'planning_holiday',
      startDate: '2026-11-26',
      endDate: '2026-11-26',
      description: 'Thanksgiving deal',
      sourceEvidence: 'calendar',
      confidenceScore: 100,
      recommendedAction: 'auto-apply',
    });
    validatePlan(invalidPlan, 2026, parkDetails);
    assert.fail('Should have rejected November Thanksgiving for Canada');
  } catch (err) {
    assert(err.message.includes('November') && err.message.includes('Thanksgiving'));
    console.log('✅ Test 3 Passed: Rejected November Thanksgiving for Canadian location.');
  }

  // Test 4: Reject Internal School Examination Days (Non-Marketable)
  try {
    const invalidPlan = JSON.parse(JSON.stringify(validPlan));
    invalidPlan.plan.overrides.push({
      title: 'High School Examination Day',
      type: 'planning_event',
      startDate: '2026-01-28',
      endDate: '2026-01-28',
      description: 'Scheduled exam day for grade 11 students',
      sourceEvidence: 'School schedule',
      confidenceScore: 80,
      recommendedAction: 'auto-apply',
    });
    validatePlan(invalidPlan, 2026, parkDetails);
    assert.fail('Should have rejected school examination day');
  } catch (err) {
    assert(err.message.includes('Non-marketable school administrative event'));
    console.log('✅ Test 4 Passed: Rejected internal school examination day.');
  }

  // Test 5: Reject School Board Trustee Meetings (Non-Marketable)
  try {
    const invalidPlan = JSON.parse(JSON.stringify(validPlan));
    invalidPlan.plan.overrides.push({
      title: 'School Board Trustee Meeting',
      type: 'planning_event',
      startDate: '2026-04-14',
      endDate: '2026-04-14',
      description: 'Monthly school board trustee council meeting',
      sourceEvidence: 'School board minutes',
      confidenceScore: 80,
      recommendedAction: 'auto-apply',
    });
    validatePlan(invalidPlan, 2026, parkDetails);
    assert.fail('Should have rejected school board trustee meeting');
  } catch (err) {
    assert(err.message.includes('Non-marketable school administrative event'));
    console.log('✅ Test 5 Passed: Rejected school board trustee meeting.');
  }

  // Test 6: Reject Report Card Distribution (Non-Marketable)
  try {
    const invalidPlan = JSON.parse(JSON.stringify(validPlan));
    invalidPlan.plan.overrides.push({
      title: 'Term 1 Report Card Distribution',
      type: 'planning_event',
      startDate: '2026-02-10',
      endDate: '2026-02-10',
      description: 'Report cards distributed to parents',
      sourceEvidence: 'School schedule',
      confidenceScore: 80,
      recommendedAction: 'auto-apply',
    });
    validatePlan(invalidPlan, 2026, parkDetails);
    assert.fail('Should have rejected report card distribution');
  } catch (err) {
    assert(err.message.includes('Non-marketable school administrative event'));
    console.log('✅ Test 6 Passed: Rejected report card distribution event.');
  }

  // Test 7: Reject Inaccurate Family Day Date
  try {
    const invalidPlan = JSON.parse(JSON.stringify(validPlan));
    invalidPlan.plan.overrides.push({
      title: 'Family Day Special Bounce',
      type: 'planning_holiday',
      startDate: '2026-02-09', // Feb 9 is 2nd Monday, Family Day is 3rd Monday (Feb 16)!
      endDate: '2026-02-09',
      description: 'Family Day celebration',
      sourceEvidence: 'Holiday',
      confidenceScore: 100,
      recommendedAction: 'auto-apply',
    });
    validatePlan(invalidPlan, 2026, parkDetails);
    assert.fail('Should have rejected inaccurate Family Day date');
  } catch (err) {
    assert(err.message.includes('Family Day') && err.message.includes('2026-02-16'));
    console.log('✅ Test 7 Passed: Rejected inaccurate Family Day date (caught wrong Monday).');
  }

  console.log('\n🎉 All 7 Unit Validation Tests Passed Successfully!\n');
}

runUnitValidationTests();
