import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Calendar, Agenda, CalendarUtils } from 'react-native-calendars';

// Family member colors (matching Family OS avatar strip from UI mockups)
const MEMBER_COLORS = {
  mom: '#9c27b0',    // purple
  dad: '#1565c0',    // blue
  kid1: '#2e7d32',   // green
  kid2: '#e65100',   // orange
};

// Sample family events for the current month
const generateSampleEvents = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const events: Record<string, any> = {};

  // Day 5: Mom's dentist + Dad's meeting
  const day5 = `${year}-${month}-05`;
  events[day5] = {
    dots: [
      { key: 'mom', color: MEMBER_COLORS.mom },
      { key: 'dad', color: MEMBER_COLORS.dad },
    ],
  };

  // Day 10: Kid1 soccer
  const day10 = `${year}-${month}-10`;
  events[day10] = {
    dots: [{ key: 'kid1', color: MEMBER_COLORS.kid1 }],
  };

  // Day 12: Family outing (all members)
  const day12 = `${year}-${month}-12`;
  events[day12] = {
    dots: [
      { key: 'mom', color: MEMBER_COLORS.mom },
      { key: 'dad', color: MEMBER_COLORS.dad },
      { key: 'kid1', color: MEMBER_COLORS.kid1 },
      { key: 'kid2', color: MEMBER_COLORS.kid2 },
    ],
  };

  // Day 15: Mom's yoga + Kid2 piano
  const day15 = `${year}-${month}-15`;
  events[day15] = {
    dots: [
      { key: 'mom', color: MEMBER_COLORS.mom },
      { key: 'kid2', color: MEMBER_COLORS.kid2 },
    ],
  };

  // Day 20: Dad's travel + Kid1 school event
  const day20 = `${year}-${month}-20`;
  events[day20] = {
    dots: [
      { key: 'dad', color: MEMBER_COLORS.dad },
      { key: 'kid1', color: MEMBER_COLORS.kid1 },
    ],
  };

  // Today: highlight with selection
  const todayStr = `${year}-${month}-${String(today.getDate()).padStart(2, '0')}`;
  events[todayStr] = {
    ...events[todayStr],
    selected: true,
    selectedColor: '#6200ee',
    dots: events[todayStr]?.dots || [
      { key: 'mom', color: MEMBER_COLORS.mom },
    ],
  };

  return events;
};

export default function CalendarUITest() {
  const [selectedDate, setSelectedDate] = useState('');
  const markedDates = generateSampleEvents();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>react-native-calendars - Month View</Text>
      <Text style={styles.description}>
        Testing: Multi-dot color coding per family member, date selection, theming
      </Text>

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

      {/* Month Calendar */}
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day: any) => {
          setSelectedDate(day.dateString);
        }}
        theme={{
          // Family OS MD3-inspired theming
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#666',
          selectedDayBackgroundColor: '#6200ee',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#6200ee',
          dayTextColor: '#1a1a2e',
          textDisabledColor: '#d9e1e8',
          dotColor: '#6200ee',
          arrowColor: '#6200ee',
          monthTextColor: '#1a1a2e',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        style={styles.calendar}
      />

      {/* Selected Date Info */}
      {selectedDate ? (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedTitle}>Selected: {selectedDate}</Text>
          {markedDates[selectedDate]?.dots ? (
            <Text style={styles.selectedDetail}>
              Events from: {markedDates[selectedDate].dots.map((d: any) => d.key).join(', ')}
            </Text>
          ) : (
            <Text style={styles.selectedDetail}>No events on this date</Text>
          )}
        </View>
      ) : null}

      {/* Verdict Section */}
      <View style={styles.verdictBox}>
        <Text style={styles.verdictTitle}>POC-1 Month View Checklist</Text>
        <Text style={styles.verdictItem}>
          - Multi-dot marking per family member: Check the colored dots below dates
        </Text>
        <Text style={styles.verdictItem}>
          - Date selection callback: Tap a date and check the info box above
        </Text>
        <Text style={styles.verdictItem}>
          - MD3 theme colors (purple primary): Check header arrows and today highlight
        </Text>
        <Text style={styles.verdictItem}>
          - Smooth scrolling: Swipe left/right to change months
        </Text>
        <Text style={styles.verdictItem}>
          - Platform consistency: Compare iOS and Android rendering
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  description: { fontSize: 12, color: '#666', marginBottom: 12 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#333' },
  calendar: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedInfo: {
    marginTop: 12,
    backgroundColor: '#ede7f6',
    padding: 12,
    borderRadius: 8,
  },
  selectedTitle: { fontWeight: 'bold', color: '#4a148c', fontSize: 14 },
  selectedDetail: { color: '#666', fontSize: 12, marginTop: 4 },
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
