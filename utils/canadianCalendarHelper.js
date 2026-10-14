/**
 * Canadian Calendar Helper
 * Real-world holiday calculations, academic date rules, and marketability filters
 * for Canadian trampoline parks (e.g., Ontario / Canada).
 */

function getNthWeekdayOfMonth(year, monthIndex, targetDayOfWeek, n) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const dayOfWeek = firstDay.getUTCDay();
  const diff = (targetDayOfWeek - dayOfWeek + 7) % 7;
  const date = 1 + diff + (n - 1) * 7;
  const d = new Date(Date.UTC(year, monthIndex, date));
  return d.toISOString().slice(0, 10);
}

function getVictoriaDay(year) {
  // Monday immediately preceding May 25 (May 18 to May 24)
  for (let day = 24; day >= 18; day--) {
    const d = new Date(Date.UTC(year, 4, day));
    if (d.getUTCDay() === 1) return d.toISOString().slice(0, 10);
  }
  return `${year}-05-18`;
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

/**
 * Returns accurate real-world Canadian statutory & provincial holidays for a given year.
 */
function getCanadianHolidays(year) {
  const easter = getEasterSunday(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);

  return {
    newYear: `${year}-01-01`,
    familyDay: getNthWeekdayOfMonth(year, 1, 1, 3), // 3rd Monday in Feb (Ontario/Canada)
    goodFriday,
    easterMonday,
    victoriaDay: getVictoriaDay(year), // Monday before May 25
    canadaDay: `${year}-07-01`,
    civicHoliday: getNthWeekdayOfMonth(year, 7, 1, 1), // 1st Monday of August (Simcoe Day in ON)
    labourDay: getNthWeekdayOfMonth(year, 8, 1, 1), // 1st Monday of September
    truthAndReconciliation: `${year}-09-30`,
    thanksgiving: getNthWeekdayOfMonth(year, 9, 1, 2), // 2nd Monday of October
    remembranceDay: `${year}-11-11`,
    christmasEve: `${year}-12-24`,
    christmas: `${year}-12-25`,
    boxingDay: `${year}-12-26`,
    newYearsEve: `${year}-12-31`,
    halloween: `${year}-10-31`,
    valentines: `${year}-02-14`,
  };
}

/**
 * Disallowed foreign/US-only holidays for Canadian locations.
 */
const DISALLOWED_FOREIGN_HOLIDAYS = [
  { pattern: /4th of july|fourth of july|independence day/i, name: "US Independence Day (use Canada Day on July 1 instead)" },
  { pattern: /memorial day/i, name: "US Memorial Day (use Victoria Day in May instead)" },
  { pattern: /presidents'? day/i, name: "US Presidents' Day (use Family Day in February instead)" },
  { pattern: /martin luther king|mlk day/i, name: "Martin Luther King Jr. Day (US-only holiday)" },
  { pattern: /juneteenth/i, name: "Juneteenth (US-only holiday)" },
  { pattern: /columbus day/i, name: "Columbus Day (US-only holiday)" },
];

/**
 * Disallowed non-marketable internal school/administrative events.
 * Trampoline parks do not run deals for staff meetings, board trustee meetings, or exams!
 */
const DISALLOWED_ADMINISTRATIVE_KEYWORDS = [
  { pattern: /\b(exam|examination)\s*(day|period|schedule|session)?\b/i, reason: "School examination periods are not marketable recreational events for trampoline parks." },
  { pattern: /\b(trustee|school board|board)\s*(meeting|election|council)\b/i, reason: "Internal school board meetings are administrative and not marketable." },
  { pattern: /\b(staff|faculty|department)\s*meeting\b/i, reason: "Internal school staff meetings are administrative and not marketable." },
  { pattern: /\breport\s*card(s)?\s*(distribution|issued|day)?\b/i, reason: "Report card distribution dates are internal administrative markers." },
  { pattern: /\b(eqao|osslt)\b/i, reason: "Provincial standardized testing days are in-school tests and not trampoline park events." },
  { pattern: /\b(parent[\s-]teacher|curriculum\s*night|meet\s*the\s*teacher|open\s*house)\b/i, reason: "School evening meetings do not represent student daytime jump opportunities." },
  { pattern: /\b(photo\s*day|picture\s*day|retake\s*day)\b/i, reason: "School photo sessions are internal school days." },
  { pattern: /\b(budget\s*consultation|advisory\s*committee)\b/i, reason: "School committee administrative items are not marketable." },
  { pattern: /\bkindergarten\s*registration\b/i, reason: "School registration periods are internal school deadlines." }
];

/**
 * Validates a single event or override for Canadian accuracy and trampoline park marketability.
 */
function validateEventMarketabilityAndCanadaRules(override, requestedYear, isCanadianLocation) {
  const title = override.title || "";
  const desc = override.description || "";
  const combinedText = `${title} ${desc}`.toLowerCase();

  // 1. Check prohibited school administrative items
  for (const item of DISALLOWED_ADMINISTRATIVE_KEYWORDS) {
    if (item.pattern.test(title) || item.pattern.test(desc)) {
      throw new Error(`Non-marketable school administrative event detected: "${title}". Reason: ${item.reason}`);
    }
  }

  // 2. Check foreign/US holidays if Canadian venue
  if (isCanadianLocation) {
    for (const disallowed of DISALLOWED_FOREIGN_HOLIDAYS) {
      if (disallowed.pattern.test(title)) {
        throw new Error(`False holiday for Canadian location: "${title}". Reason: ${disallowed.name}.`);
      }
    }

    // Check Canadian Thanksgiving: must be in October (specifically 2nd Monday), NOT November
    if (/thanksgiving/i.test(title)) {
      if (override.startDate.includes("-11-") || override.endDate.includes("-11-")) {
        throw new Error(`False Canadian holiday: "${title}" is scheduled in November. Canadian Thanksgiving is on the second Monday of October, NOT US Thanksgiving.`);
      }
    }

    const canadianHolidays = getCanadianHolidays(requestedYear);

    // Verify key Canadian statutory holiday dates if explicitly mentioned
    const holidayDateChecks = [
      { key: /family day/i, expected: canadianHolidays.familyDay, name: "Family Day" },
      { key: /victoria day/i, expected: canadianHolidays.victoriaDay, name: "Victoria Day" },
      { key: /canada day/i, expected: canadianHolidays.canadaDay, name: "Canada Day" },
      { key: /civic holiday|simcoe day/i, expected: canadianHolidays.civicHoliday, name: "Civic Holiday / Simcoe Day" },
      { key: /labour day/i, expected: canadianHolidays.labourDay, name: "Labour Day" },
      { key: /truth and reconciliation/i, expected: canadianHolidays.truthAndReconciliation, name: "National Day for Truth and Reconciliation" },
      { key: /thanksgiving/i, expected: canadianHolidays.thanksgiving, name: "Canadian Thanksgiving" },
      { key: /remembrance day/i, expected: canadianHolidays.remembranceDay, name: "Remembrance Day" },
      { key: /boxing day/i, expected: canadianHolidays.boxingDay, name: "Boxing Day" },
    ];

    for (const check of holidayDateChecks) {
      if (check.key.test(title)) {
        // The override date range should cover or match the expected holiday date
        if (check.expected < override.startDate || check.expected > override.endDate) {
          throw new Error(`Inaccurate holiday date for "${title}". Canadian ${check.name} in ${requestedYear} is on ${check.expected}, but event is set to ${override.startDate} to ${override.endDate}.`);
        }
      }
    }
  }

  return true;
}

module.exports = {
  getCanadianHolidays,
  getNthWeekdayOfMonth,
  getVictoriaDay,
  getEasterSunday,
  DISALLOWED_FOREIGN_HOLIDAYS,
  DISALLOWED_ADMINISTRATIVE_KEYWORDS,
  validateEventMarketabilityAndCanadaRules,
};
