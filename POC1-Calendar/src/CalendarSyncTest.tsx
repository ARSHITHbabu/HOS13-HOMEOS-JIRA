import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Calendar from 'expo-calendar';

export default function CalendarSyncTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // TEST 1: Request permissions
  const testPermissions = async () => {
    try {
      addLog('Requesting calendar permissions...');
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      addLog(`Permission status: ${status}`);
      if (status !== 'granted') {
        addLog('ERROR: Permission denied. Cannot proceed.');
      } else {
        addLog('SUCCESS: Calendar permission granted.');
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  // TEST 2: List device calendars
  const testListCalendars = async () => {
    try {
      addLog('Fetching device calendars...');
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      setCalendars(cals);
      addLog(`Found ${cals.length} calendars:`);
      cals.forEach((cal) => {
        addLog(`  - "${cal.title}" (${cal.source?.name || 'unknown source'}) [${cal.accessLevel}]`);
      });
      addLog('SUCCESS: Calendars listed.');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  // TEST 3: Read events for next 7 days
  const testReadEvents = async () => {
    try {
      addLog('Reading events for next 7 days...');
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const calIds = calendars.map((c) => c.id);
      if (calIds.length === 0) {
        addLog('ERROR: No calendars found. List calendars first.');
        return;
      }

      const events = await Calendar.getEventsAsync(calIds, startDate, endDate);
      addLog(`Found ${events.length} events in next 7 days:`);
      events.slice(0, 10).forEach((evt) => {
        const start = new Date(evt.startDate).toLocaleString();
        addLog(`  - "${evt.title}" at ${start}`);
      });
      if (events.length > 10) {
        addLog(`  ... and ${events.length - 10} more`);
      }
      addLog('SUCCESS: Events read.');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  // TEST 4: Create a test event
  const testCreateEvent = async () => {
    try {
      addLog('Creating test event "Family Dinner"...');

      // Find a writable calendar
      const writableCal = calendars.find(
        (c) => c.accessLevel === Calendar.CalendarAccessLevel.OWNER ||
               c.accessLevel === Calendar.CalendarAccessLevel.ROOT
      );

      if (!writableCal) {
        addLog('No writable calendar found. Creating a new calendar...');
        const defaultCalendarSource =
          calendars.length > 0
            ? calendars[0].source
            : { isLocalAccount: true, name: 'Family OS POC', type: Calendar.SourceType.LOCAL };

        const newCalId = await Calendar.createCalendarAsync({
          title: 'Family OS POC',
          color: '#6200ee',
          entityType: Calendar.EntityTypes.EVENT,
          source: defaultCalendarSource,
          name: 'familyos-poc',
          ownerAccount: 'personal',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        addLog(`Created new calendar with ID: ${newCalId}`);

        const eventDate = new Date();
        eventDate.setHours(19, 0, 0, 0); // 7pm today

        const eventId = await Calendar.createEventAsync(newCalId, {
          title: 'Family Dinner',
          startDate: eventDate,
          endDate: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour
          location: 'Home',
          notes: 'Created by Family OS POC-1 test',
          alarms: [{ relativeOffset: -30 }], // 30 min before
        });
        addLog(`SUCCESS: Event created with ID: ${eventId}`);
        addLog('Check your native calendar app to verify!');
        return;
      }

      const eventDate = new Date();
      eventDate.setHours(19, 0, 0, 0); // 7pm today

      const eventId = await Calendar.createEventAsync(writableCal.id, {
        title: 'Family Dinner',
        startDate: eventDate,
        endDate: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour
        location: 'Home',
        notes: 'Created by Family OS POC-1 test',
        alarms: [{ relativeOffset: -30 }], // 30 min before
      });
      addLog(`SUCCESS: Event created with ID: ${eventId}`);
      addLog(`Calendar: "${writableCal.title}"`);
      addLog('Check your native calendar app to verify!');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  // TEST 5: Create recurring event
  const testRecurringEvent = async () => {
    try {
      addLog('Creating recurring event "Weekly Family Meeting"...');

      const writableCal = calendars.find(
        (c) => c.accessLevel === Calendar.CalendarAccessLevel.OWNER ||
               c.accessLevel === Calendar.CalendarAccessLevel.ROOT
      );

      if (!writableCal) {
        addLog('ERROR: No writable calendar. Run "Create Event" first to set one up.');
        return;
      }

      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
      nextSunday.setHours(10, 0, 0, 0);

      const eventId = await Calendar.createEventAsync(writableCal.id, {
        title: 'Weekly Family Meeting',
        startDate: nextSunday,
        endDate: new Date(nextSunday.getTime() + 60 * 60 * 1000),
        location: 'Living Room',
        notes: 'Recurring event - Family OS POC-1',
        recurrenceRule: {
          frequency: Calendar.Frequency.WEEKLY,
          interval: 1,
          occurrence: 10, // 10 occurrences
        },
      });
      addLog(`SUCCESS: Recurring event created with ID: ${eventId}`);
      addLog('Every Sunday at 10am for 10 weeks.');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>expo-calendar Sync Tests</Text>
      <Text style={styles.description}>
        Tests device calendar read/write. Run tests in order (1-5).
      </Text>

      {/* Test Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={testPermissions}>
          <Text style={styles.buttonText}>1. Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testListCalendars}>
          <Text style={styles.buttonText}>2. List Calendars</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={testReadEvents}>
          <Text style={styles.buttonText}>3. Read Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testCreateEvent}>
          <Text style={styles.buttonText}>4. Create Event</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={testRecurringEvent}>
          <Text style={styles.buttonText}>5. Recurring Event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#d32f2f' }]}
          onPress={() => setLogs([])}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Log Output */}
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Test Logs:</Text>
        {logs.length === 0 && (
          <Text style={styles.logEmpty}>Press a test button to start...</Text>
        )}
        {logs.map((log, i) => (
          <Text
            key={i}
            style={[
              styles.logLine,
              log.includes('SUCCESS') && styles.logSuccess,
              log.includes('ERROR') && styles.logError,
            ]}
          >
            {log}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  description: { fontSize: 12, color: '#666', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  button: {
    flex: 1,
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  logContainer: {
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
  },
  logTitle: { color: '#aaa', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  logEmpty: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  logLine: { color: '#ddd', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  logSuccess: { color: '#4caf50' },
  logError: { color: '#f44336' },
});
