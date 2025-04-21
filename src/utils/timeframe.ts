/**
 * Get minutes from timeframe string
 * @param timeframe Timeframe string (e.g. '15m', '1h', '1d', '1w')
 * @returns Number of minutes in the timeframe
 */
export function getMinutesFromTimeframe(timeframe: string): number {
  const unit = timeframe.slice(-1).toLowerCase();
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit) {
    case 'm':
      return value;
    case 'h':
      return value * 60;
    case 'd':
      return value * 24 * 60;
    case 'w':
      return value * 7 * 24 * 60;
    default:
      return 15; // Default to 15 minutes if unknown
  }
} 