import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import CalendarSyncTest from './src/CalendarSyncTest';
import CalendarUITest from './src/CalendarUITest';
import BigCalendarTest from './src/BigCalendarTest';

type Tab = 'sync' | 'ui-month' | 'ui-week';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sync');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.header}>POC-1: Calendar Libraries</Text>
      <Text style={styles.subheader}>Family OS - HOS13 Validation</Text>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sync' && styles.activeTab]}
          onPress={() => setActiveTab('sync')}
        >
          <Text style={[styles.tabText, activeTab === 'sync' && styles.activeTabText]}>
            Sync (expo-calendar)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ui-month' && styles.activeTab]}
          onPress={() => setActiveTab('ui-month')}
        >
          <Text style={[styles.tabText, activeTab === 'ui-month' && styles.activeTabText]}>
            Month View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ui-week' && styles.activeTab]}
          onPress={() => setActiveTab('ui-week')}
        >
          <Text style={[styles.tabText, activeTab === 'ui-week' && styles.activeTabText]}>
            Week View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'sync' && <CalendarSyncTest />}
        {activeTab === 'ui-month' && <CalendarUITest />}
        {activeTab === 'ui-week' && <BigCalendarTest />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 10,
    color: '#1a1a2e',
  },
  subheader: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6200ee',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});
