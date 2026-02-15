import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import dayjs from 'dayjs';

// Family member colors
const MEMBER_COLORS = {
  mom: '#9c27b0',
  dad: '#1565c0',
  kid1: '#2e7d32',
  kid2: '#e65100',
};

// Sample events with overlapping times (conflict detection test)
const generateWeekEvents = () => {
  const today = dayjs();
  const monday = today.startOf('week').add(1, 'day'); // Monday

  return [
    // Monday: Mom dentist + Dad meeting (OVERLAP - conflict test)
    {
      title: "Mom's Dentist",
      start: monday.hour(10).minute(0).toDate(),
      end: monday.hour(11).minute(30).toDate(),
      color: MEMBER_COLORS.mom,
    },
    {
      title: "Dad's Client Meeting",
      start: monday.hour(10).minute(30).toDate(),
      end: monday.hour(12).minute(0).toDate(),
      color: MEMBER_COLORS.dad,
    },

    // Tuesday: Kid1 soccer practice
    {
      title: "Soccer Practice",
      start: monday.add(1, 'day').hour(16).minute(0).toDate(),
      end: monday.add(1, 'day').hour(17).minute(30).toDate(),
      color: MEMBER_COLORS.kid1,
    },

    // Wednesday: Family Dinner
    {
      title: "Family Dinner Out",
      start: monday.add(2, 'day').hour(19).minute(0).toDate(),
      end: monday.add(2, 'day').hour(21).minute(0).toDate(),
      color: MEMBER_COLORS.mom, // organized by mom
    },

    // Thursday: 3 OVERLAPPING events (stress test)
    {
      title: "Mom's Yoga",
      start: monday.add(3, 'day').hour(9).minute(0).toDate(),
      end: monday.add(3, 'day').hour(10).minute(0).toDate(),
      color: MEMBER_COLORS.mom,
    },
    {
      title: "Dad's Gym",
      start: monday.add(3, 'day').hour(9).minute(30).toDate(),
      end: monday.add(3, 'day').hour(10).minute(30).toDate(),
      color: MEMBER_COLORS.dad,
    },
    {
      title: "Kid2 Piano Lesson",
      start: monday.add(3, 'day').hour(9).minute(0).toDate(),
      end: monday.add(3, 'day').hour(10).minute(0).toDate(),
      color: MEMBER_COLORS.kid2,
    },

    // Friday: Kid1 school event
    {
      title: "School Science Fair",
      start: monday.add(4, 'day').hour(14).minute(0).toDate(),
      end: monday.add(4, 'day').hour(16).minute(0).toDate(),
      color: MEMBER_COLORS.kid1,
    },

    // Saturday: Family outing (all day feel)
    {
      title: "Family Outing - New York",
      start: monday.add(5, 'day').hour(8).minute(0).toDate(),
      end: monday.add(5, 'day').hour(18).minute(0).toDate(),
      color: '#6200ee', // family event color
    },
  ];
};

type ViewMode = 'week' | 'day' | '3days';

export default function BigCalendarTest() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const events = generateWeekEvents();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>react-native-big-calendar - Timeline</Text>
      <Text style={styles.description}>
        Testing: Week/Day timeline, overlapping events (conflicts), swipe gestures
      </Text>

      {/* View Mode Toggle */}
      <View style={styles.toggleRow}>
        {(['week', '3days', 'day'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, viewMode === mode && styles.toggleActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode === '3days' ? '3 Days' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(MEMBER_COLORS).map(([name, color]) => (
          <View key={name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      {/* Big Calendar */}
      <View style={styles.calendarContainer}>
        <BigCalendar
          events={events}
          height={500}
          mode={viewMode}
          swipeEnabled={true}
          showTime={true}
          eventCellStyle={(event: any) => ({
            backgroundColor: event.color || '#6200ee',
            borderRadius: 4,
            borderLeftWidth: 3,
            borderLeftColor: event.color || '#6200ee',
          })}
          theme={{
            palette: {
              primary: {
                main: '#6200ee',
                contrastText: '#ffffff',
              },
              gray: {
                '100': '#f5f5f5',
                '200': '#eeeeee',
                '300': '#e0e0e0',
                '500': '#9e9e9e',
                '800': '#424242',
              },
            },
            typography: {
              xs: { fontSize: 10 },
              sm: { fontSize: 12 },
              xl: { fontSize: 18 },
            },
          }}
        />
      </View>

      {/* Verdict Checklist */}
      <View style={styles.verdictBox}>
        <Text style={styles.verdictTitle}>POC-1 Week View Checklist</Text>
        <Text style={styles.verdictItem}>
          - Overlapping events: Check Monday 10am (Mom + Dad overlap) and Thursday 9am (3 events)
        </Text>
        <Text style={styles.verdictItem}>
          - Color coding: Each event should show the member's color
        </Text>
        <Text style={styles.verdictItem}>
          - Swipe navigation: Swipe left/right between weeks
        </Text>
        <Text style={styles.verdictItem}>
          - View modes: Toggle between Week, 3 Days, Day
        </Text>
        <Text style={styles.verdictItem}>
          - Hour slots: Should show time grid from morning to evening
        </Text>
        <Text style={styles.verdictItem}>
          - Touch events: Tap an event to see if callback works
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  description: { fontSize: 12, color: '#666', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  toggleActive: { backgroundColor: '#6200ee' },
  toggleText: { fontSize: 13, color: '#333', fontWeight: '500' },
  toggleTextActive: { color: '#fff' },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#333' },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  verdictBox: {
    marginTop: 16,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 40,
  },
  verdictTitle: { fontWeight: 'bold', color: '#e65100', fontSize: 14, marginBottom: 8 },
  verdictItem: { fontSize: 11, color: '#555', marginBottom: 4 },
});
