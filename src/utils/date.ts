/**
 * Utility to get the current date in YYYY-MM-DD format based strictly on the user's local timezone.
 * Using standard .toISOString() returns UTC, which causes bugs when users complete tasks late at night or early morning in non-UTC timezones.
 */
export const getLocalYYYYMMDD = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset(); // in minutes
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};
