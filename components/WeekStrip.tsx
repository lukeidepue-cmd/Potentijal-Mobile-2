/**
 * Week Strip Component
 * Displays weekday letters and completion dots for the current week
 * Matches the reference design with subtle styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface WeekStripProps {
  weekStartDate: string; // YYYY-MM-DD format
  loggedDates: string[]; // Dates with logged workouts
  scheduledDates?: string[]; // Optional: dates with scheduled workouts
}

/**
 * Get the current day index (0 = Sunday, 6 = Saturday)
 */
function getCurrentDayIndex(): number {
  return new Date().getDay();
}

/**
 * Get date string for a specific day in the week
 */
function getDateForDay(weekStartDate: string, dayIndex: number): string {
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayIndex);
  
  const yearStr = date.getFullYear();
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

export function WeekStrip({ weekStartDate, loggedDates, scheduledDates = [] }: WeekStripProps) {
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const currentDayIndex = getCurrentDayIndex();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Parse week start date
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const weekStart = new Date(year, month - 1, day);
  weekStart.setHours(0, 0, 0, 0);
  
  // Check if today is in this week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const isCurrentWeek = today >= weekStart && today <= weekEnd;
  
  // Create a Set for faster lookup
  const loggedSet = new Set(loggedDates);
  const scheduledSet = scheduledDates.length > 0 ? new Set(scheduledDates) : null;
  
  return (
    <View style={styles.container}>
      {/* Weekday Letters Row */}
      <View style={styles.lettersRow}>
        {weekDays.map((letter, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={styles.dayLetter}>{letter}</Text>
          </View>
        ))}
      </View>
      
      {/* Completion Dots Row */}
      <View style={styles.dotsRow}>
        {weekDays.map((_, index) => {
          const dateForDay = getDateForDay(weekStartDate, index);
          const isLogged = loggedSet.has(dateForDay);
          const isScheduled = scheduledSet ? scheduledSet.has(dateForDay) : false;
          // Only highlight current day if it's in the displayed week
          const isCurrentDay = isCurrentWeek && index === currentDayIndex;
          const isActive = isLogged || (isScheduled && !isLogged);
          
          return (
            <View 
              key={index} 
              style={[
                styles.dayColumn,
                isCurrentDay && styles.currentDayColumn,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  isCurrentDay && styles.dotCurrent,
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  lettersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDayColumn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dotActive: {
    backgroundColor: '#22C55E', // Neon green
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotCurrent: {
    backgroundColor: '#22C55E',
  },
});
