const {
  validateEventMarketabilityAndCanadaRules,
  DISALLOWED_ADMINISTRATIVE_KEYWORDS,
} = require('./canadianCalendarHelper');

const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regex)) return false;
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) return false;
  return d.toISOString().slice(0, 10) === dateString;
};

const getDaysDifference = (start, end) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const validatePlan = (planData, requestedYear, parkDetails = {}) => {
  if (!planData) throw new Error("Plan data is empty");
  
  const plan = planData.plan || planData;
  if (!plan) throw new Error("Missing root 'plan' object");

  const requiredFields = ['name', 'description', 'startDate', 'endDate', 'rules', 'overrides'];
  for (const field of requiredFields) {
    if (!plan[field]) throw new Error(`Missing required field: ${field}`);
  }

  if (!isValidDate(plan.startDate) || !isValidDate(plan.endDate)) {
    throw new Error("Invalid plan date format. Must be YYYY-MM-DD.");
  }
  
  if (plan.startDate > plan.endDate) {
    throw new Error("Plan startDate cannot be after endDate.");
  }
  
  if (!plan.startDate.startsWith(String(requestedYear)) || !plan.endDate.startsWith(String(requestedYear))) {
    throw new Error(`Plan dates must be within the requested year: ${requestedYear}`);
  }

  if ((!plan.rules || plan.rules.length === 0) && (!plan.overrides || plan.overrides.length === 0)) {
    throw new Error("Plan must contain at least one rule or override (empty plan).");
  }

  const country = (parkDetails.country || '').toLowerCase();
  const state = (parkDetails.state || '').toLowerCase();
  const isCanadianLocation = country.includes('canada') || country === 'ca' || 
    ['ontario', 'on', 'quebec', 'qc', 'alberta', 'ab', 'british columbia', 'bc', 'manitoba', 'mb', 'saskatchewan', 'sk', 'nova scotia', 'ns'].includes(state);

  const allowedRuleTypes = ['planning_campaign'];
  if (!Array.isArray(plan.rules)) throw new Error("rules must be an array");
  for (const rule of plan.rules) {
    if (!rule.title) throw new Error("Rule missing title");
    if (!allowedRuleTypes.includes(rule.type)) {
      throw new Error(`Invalid rule type: ${rule.type}`);
    }
    if (typeof rule.confidenceScore !== 'number' || !['auto-apply', 'requires-review', 'discard'].includes(rule.recommendedAction)) {
      throw new Error(`Rule ${rule.title} missing or invalid confidenceScore or recommendedAction`);
    }

    // Check prohibited administrative items in rules
    for (const item of DISALLOWED_ADMINISTRATIVE_KEYWORDS) {
      if (item.pattern.test(rule.title) || (rule.description && item.pattern.test(rule.description))) {
        throw new Error(`Non-marketable school administrative theme detected in rule: "${rule.title}". Reason: ${item.reason}`);
      }
    }
  }

  const allowedOverrideTypes = [
    'planning_offer', 'planning_event', 'planning_holiday', 
    'planning_schedule', 'planning_closed', 'planning_campaign'
  ];
  
  const overrideKeys = new Set();
  const overrides = plan.overrides;
  if (!Array.isArray(overrides)) throw new Error("overrides must be an array");

  for (let i = 0; i < overrides.length; i++) {
    const override = overrides[i];
    if (!override.title || !override.type || !override.startDate || !override.endDate || typeof override.sourceEvidence !== 'string' || override.sourceEvidence.trim() === '') {
      throw new Error(`Override at index ${i} missing required fields (title, type, startDate, endDate, sourceEvidence).`);
    }

    if (typeof override.confidenceScore !== 'number' || !['auto-apply', 'requires-review', 'discard'].includes(override.recommendedAction)) {
      throw new Error(`Override ${override.title} missing or invalid confidenceScore or recommendedAction`);
    }

    if (!allowedOverrideTypes.includes(override.type)) {
      throw new Error(`Invalid override type: ${override.type} for override ${override.title}`);
    }

    if (!isValidDate(override.startDate) || !isValidDate(override.endDate)) {
      throw new Error(`Invalid date format in override: ${override.title}`);
    }

    if (override.startDate > override.endDate) {
      throw new Error(`Invalid date range in override: ${override.title} (startDate after endDate)`);
    }

    if (!override.startDate.startsWith(String(requestedYear)) && !override.endDate.startsWith(String(requestedYear))) {
       throw new Error(`Override ${override.title} is outside the requested year ${requestedYear}.`);
    }

    const duration = getDaysDifference(override.startDate, override.endDate);
    if (duration > 14) {
      throw new Error(`Override ${override.title} exceeds maximum 14-day duration.`);
    }

    // Validate Canadian holiday accuracy and trampoline park marketability
    validateEventMarketabilityAndCanadaRules(override, requestedYear, isCanadianLocation);

    // Duplicate event check
    const key = `${override.title}-${override.startDate}-${override.endDate}`;
    if (overrideKeys.has(key)) {
      throw new Error(`Duplicate event detected: ${override.title} on ${override.startDate}`);
    }
    overrideKeys.add(key);
  }

  // Check overlapping campaigns and conflicting closed/open
  for (let i = 0; i < overrides.length; i++) {
    for (let j = i + 1; j < overrides.length; j++) {
      const o1 = overrides[i];
      const o2 = overrides[j];
      
      const overlap = (o1.startDate <= o2.endDate) && (o2.startDate <= o1.endDate);
      if (overlap) {
        if (o1.type === 'planning_campaign' && o2.type === 'planning_campaign') {
          throw new Error(`Overlapping campaigns detected: ${o1.title} and ${o2.title}`);
        }
        
        const isClosed1 = o1.type === 'planning_closed';
        const isClosed2 = o2.type === 'planning_closed';
        const isOpen1 = ['planning_event', 'planning_offer', 'planning_holiday'].includes(o1.type);
        const isOpen2 = ['planning_event', 'planning_offer', 'planning_holiday'].includes(o2.type);
        
        // Single-day closures (e.g. Christmas Day) within multi-day promotions are valid specific overrides
        const dur1 = getDaysDifference(o1.startDate, o1.endDate);
        const dur2 = getDaysDifference(o2.startDate, o2.endDate);
        const isSingleDayClosed1 = isClosed1 && dur1 <= 1;
        const isSingleDayClosed2 = isClosed2 && dur2 <= 1;

        if (((isClosed1 && isOpen2) || (isClosed2 && isOpen1)) && !isSingleDayClosed1 && !isSingleDayClosed2) {
          throw new Error(`Conflicting closed/open instructions: ${o1.title} and ${o2.title} overlap.`);
        }
      }
    }
  }

  // Factual general holiday accuracy
  const staticHolidays = [
    ["christmas break", null],
    ["pre-christmas", null],
    ["post-christmas", null],
    ["christmas eve", "-12-24"],
    ["christmas", "-12-25"],
    ["halloween", "-10-31"],
    ["valentine", "-02-14"],
    ["new year's eve", "-12-31"],
    ["lunar new year", null],
    ["chinese new year", null],
    ["new year", "-01-01"]
  ];

  for (const override of overrides) {
    const titleLower = override.title.toLowerCase();
    for (const [holiday, suffix] of staticHolidays) {
      if (titleLower.includes(holiday)) {
        if (suffix) {
          const holidayDate = `${requestedYear}${suffix}`;
          if (holidayDate < override.startDate || holidayDate > override.endDate) {
            throw new Error(`Factual holiday accuracy failed for ${override.title}. Expected to include ${holidayDate}.`);
          }
        }
        break;
      }
    }
  }

  return true;
};

module.exports = { validatePlan };
