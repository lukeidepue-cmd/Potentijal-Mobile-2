/**
 * Time Interval Bucket Utilities
 * Handles calculation of time buckets for progress graphs
 * All intervals use 6 buckets with different bucket sizes
 */

export type TimeInterval = 30 | 90 | 180 | 360;

/**
 * Time interval configuration
 */
export interface TimeIntervalConfig {
  days: TimeInterval;
  bucketCount: number;
  bucketSizeDays: number;
}

/**
 * Time interval configurations
 */
const TIME_INTERVAL_CONFIGS: Record<TimeInterval, TimeIntervalConfig> = {
  30: { days: 30, bucketCount: 6, bucketSizeDays: 5 },
  90: { days: 90, bucketCount: 6, bucketSizeDays: 15 },
  180: { days: 180, bucketCount: 6, bucketSizeDays: 30 },
  360: { days: 360, bucketCount: 6, bucketSizeDays: 60 },
};

/**
 * Bucket information
 */
export interface TimeBucket {
  bucketIndex: number; // 0-5 (0 is most recent, 5 is oldest)
  startDate: Date;
  endDate: Date;
  startDateStr: string; // YYYY-MM-DD format for database queries
  endDateStr: string;   // YYYY-MM-DD format for database queries
}

/**
 * Calculate time buckets for a given time interval
 * Buckets are calculated from today backwards
 * 
 * @param timeInterval - The time interval (30, 90, 180, or 360 days)
 * @returns Array of 6 buckets, with bucketIndex 0 being most recent
 */
export function calculateTimeBuckets(timeInterval: TimeInterval): TimeBucket[] {
  const config = TIME_INTERVAL_CONFIGS[timeInterval];
  const buckets: TimeBucket[] = [];
  
  // Start from today (end of day)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  // Calculate buckets going backwards in time
  // Bucket 0 = most recent (today - 0 days to today - 4 days for 30 day interval)
  // Bucket 1 = next period (today - 5 days to today - 9 days)
  // etc.
  for (let i = 0; i < config.bucketCount; i++) {
    // Calculate end date of this bucket (most recent day in bucket)
    // For bucket 0: endDate = today
    // For bucket 1: endDate = today - bucketSizeDays
    // For bucket 2: endDate = today - (2 * bucketSizeDays)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - (i * config.bucketSizeDays));
    endDate.setHours(23, 59, 59, 999);
    
    // Calculate start date of this bucket (oldest day in bucket)
    // For bucket 0: startDate = today - (bucketSizeDays - 1) = today - 4 (for 5 day buckets)
    // For bucket 1: startDate = endDate - (bucketSizeDays - 1) = today - 5 - 4 = today - 9
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (config.bucketSizeDays - 1));
    startDate.setHours(0, 0, 0, 0);
    
    // Format dates as YYYY-MM-DD for database queries
    const startDateStr = formatDateForDB(startDate);
    const endDateStr = formatDateForDB(endDate);
    
    buckets.push({
      bucketIndex: i,
      startDate,
      endDate,
      startDateStr,
      endDateStr,
    });
  }
  
  // Return buckets in chronological order (oldest to newest)
  // This makes it easier to display on graph (left to right)
  // Bucket 5 (oldest) should be first, Bucket 0 (most recent) should be last
  return buckets.reverse();
}

/**
 * Get the bucket index for a given date
 * 
 * @param date - The date to check
 * @param timeInterval - The time interval
 * @returns Bucket index (0-5) or -1 if date is outside the time range
 */
export function getBucketIndexForDate(
  date: Date,
  timeInterval: TimeInterval
): number {
  const config = TIME_INTERVAL_CONFIGS[timeInterval];
  const buckets = calculateTimeBuckets(timeInterval);
  
  // Convert date to local date (ignore time)
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  // Find which bucket this date falls into
  for (const bucket of buckets) {
    const bucketStart = new Date(bucket.startDate);
    bucketStart.setHours(0, 0, 0, 0);
    
    const bucketEnd = new Date(bucket.endDate);
    bucketEnd.setHours(23, 59, 59, 999);
    
    if (checkDate >= bucketStart && checkDate <= bucketEnd) {
      return bucket.bucketIndex;
    }
  }
  
  // Date is outside the time range
  return -1;
}

/**
 * Format a date as YYYY-MM-DD for database queries
 * Uses local date components to avoid timezone issues
 */
function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the time interval configuration
 */
export function getTimeIntervalConfig(timeInterval: TimeInterval): TimeIntervalConfig {
  return TIME_INTERVAL_CONFIGS[timeInterval];
}

/**
 * Get all available time intervals (for UI)
 */
export function getAvailableTimeIntervals(): TimeInterval[] {
  return [30, 90, 180, 360];
}

/**
 * Get time interval label for UI
 */
export function getTimeIntervalLabel(timeInterval: TimeInterval): string {
  return `${timeInterval} Days`;
}
