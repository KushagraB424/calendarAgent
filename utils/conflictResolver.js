/**
 * Conflict Resolver Utility
 * Implements traditional deterministic date/time math to detect overlapping events.
 * 
 * Supports both full datetime strings (e.g., ISO-8601) and YYYY-MM-DD dates.
 */

const getOverlap = (startA, endA, startB, endB) => {
  const tStartA = new Date(startA).getTime();
  const tEndA = new Date(endA).getTime();
  const tStartB = new Date(startB).getTime();
  const tEndB = new Date(endB).getTime();

  if (isNaN(tStartA) || isNaN(tEndA) || isNaN(tStartB) || isNaN(tEndB)) {
    throw new Error('Invalid date format provided for conflict resolution.');
  }

  // Overlap occurs if A starts before B ends AND A ends after B starts.
  return (tStartA <= tEndB) && (tEndA >= tStartB);
};

/**
 * Checks a new event against a list of existing events for conflicts.
 * 
 * @param {Object} newEvent - { id, startDate, endDate, type, ... }
 * @param {Array} existingEvents - Array of event objects
 * @returns {Object} - { hasConflict: boolean, conflicts: Array }
 */
const detectConflicts = (newEvent, existingEvents) => {
  if (!newEvent || !newEvent.startDate || !newEvent.endDate) {
    throw new Error('New event must have startDate and endDate.');
  }

  const conflicts = existingEvents.filter(existing => {
    if (!existing.startDate || !existing.endDate) return false;
    
    // Ignore self if updating an existing event
    if (newEvent.id && existing.id && newEvent.id === existing.id) {
      return false;
    }

    return getOverlap(newEvent.startDate, newEvent.endDate, existing.startDate, existing.endDate);
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
};

module.exports = {
  getOverlap,
  detectConflicts
};
