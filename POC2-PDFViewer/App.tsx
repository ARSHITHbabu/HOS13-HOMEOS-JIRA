import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Pdf from 'react-native-pdf';

const { width } = Dimensions.get('window');

// Public domain PDF URLs for testing
const TEST_PDFS = [
  {
    name: 'Simple PDF (1 page)',
    url: 'https://www.africau.edu/images/default/sample.pdf',
    description: 'Test: Basic rendering of a simple PDF',
  },
  {
    name: 'W-9 Form (6 pages)',
    url: 'https://www.irs.gov/pub/irs-pdf/fw9.pdf',
    description: 'Test: Multi-page, form fields, zoom',
  },
  {
    name: 'Tax Instructions (100+ pages)',
    url: 'https://www.irs.gov/pub/irs-pdf/i1040gi.pdf',
    description: 'Test: Large doc performance, scrolling',
  },
];

export default function App() {
  const [selectedPdf, setSelectedPdf] = useState<(typeof TEST_PDFS)[0] | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [pdfInfo, setPdfInfo] = useState<{ pages: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const loadStart = useRef<number>(0);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const openPdf = (pdf: (typeof TEST_PDFS)[0]) => {
    setSelectedPdf(pdf);
    setPdfInfo(null);
    loadStart.current = Date.now();
    addLog(`Opening: ${pdf.name}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.header}>POC-2: PDF Viewer</Text>
      <Text style={styles.subheader}>Family OS - HOS13 | react-native-pdf</Text>

      {!selectedPdf ? (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Select a Test PDF</Text>
          <Text style={styles.warn}>
            IMPORTANT: Requires Development Build (not Expo Go).
            {'\n'}Run: npx expo prebuild --clean && npx expo run:android
          </Text>

          {TEST_PDFS.map((pdf, i) => (
            <TouchableOpacity key={i} style={styles.pdfCard} onPress={() => openPdf(pdf)}>
              <Text style={styles.pdfCardTitle}>{pdf.name}</Text>
              <Text style={styles.pdfCardDesc}>{pdf.description}</Text>
            </TouchableOpacity>
          ))}

          {/* Logs */}
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Test Logs:</Text>
            {logs.length === 0 && <Text style={styles.logEmpty}>Select a PDF to start...</Text>}
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

          {/* Verdict */}
          <View style={styles.verdictBox}>
            <Text style={styles.verdictTitle}>POC-2 Checklist</Text>
            <Text style={styles.verdictItem}>- Does the PDF render on screen?</Text>
            <Text style={styles.verdictItem}>- Can you pinch-to-zoom?</Text>
            <Text style={styles.verdictItem}>- Can you scroll through multiple pages?</Text>
            <Text style={styles.verdictItem}>- Does the modal overlay work? (Document Vault preview)</Text>
            <Text style={styles.verdictItem}>- What is the load time for the large PDF?</Text>
            <Text style={styles.verdictItem}>- Any crashes on the 100+ page PDF?</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.pdfViewContainer}>
          {/* Header */}
          <View style={styles.pdfHeader}>
            <TouchableOpacity onPress={() => setSelectedPdf(null)}>
              <Text style={styles.backBtn}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.pdfTitle} numberOfLines={1}>{selectedPdf.name}</Text>
            <TouchableOpacity onPress={() => setShowModal(true)}>
              <Text style={styles.modalBtn}>Modal</Text>
            </TouchableOpacity>
          </View>

          {/* Info Bar */}
          {pdfInfo && (
            <View style={styles.infoBar}>
              <Text style={styles.infoText}>Total pages: {pdfInfo.pages}</Text>
            </View>
          )}

          {/* PDF */}
          <Pdf
            source={{ uri: selectedPdf.url }}
            style={styles.pdf}
            onLoadComplete={(numberOfPages: number, filePath: string) => {
              const elapsed = Date.now() - loadStart.current;
              setPdfInfo({ pages: numberOfPages });
              addLog(`SUCCESS: Loaded ${numberOfPages} pages in ${elapsed}ms`);
            }}
            onPageChanged={(page: number, numberOfPages: number) => {
              // Only log every 10th page for large docs
              if (page % 10 === 1 || numberOfPages <= 10) {
                addLog(`Page ${page} of ${numberOfPages}`);
              }
            }}
            onError={(error: any) => {
              addLog(`ERROR: ${JSON.stringify(error)}`);
            }}
          />
        </View>
      )}

      {/* Modal View (Document Vault preview simulation) */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.backBtn}>Close Preview</Text>
            </TouchableOpacity>
            <Text style={styles.pdfTitle}>Document Vault Preview</Text>
          </View>
          {selectedPdf && (
            <Pdf
              source={{ uri: selectedPdf.url }}
              style={styles.pdf}
              onLoadComplete={(pages: number) => addLog(`Modal loaded: ${pages} pages`)}
              onError={(error: any) => addLog(`Modal ERROR: ${error}`)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', paddingTop: 10, color: '#1a1a2e' },
  subheader: { fontSize: 12, textAlign: 'center', color: '#666', marginBottom: 10 },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  warn: { fontSize: 12, color: '#d32f2f', marginBottom: 16, lineHeight: 18, backgroundColor: '#ffebee', padding: 8, borderRadius: 8 },
  pdfCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  pdfCardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  pdfCardDesc: { fontSize: 12, color: '#666' },
  pdfViewContainer: { flex: 1 },
  pdfHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backBtn: { color: '#6200ee', fontWeight: '600', fontSize: 14 },
  modalBtn: { color: '#6200ee', fontWeight: '600', fontSize: 14 },
  pdfTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', flex: 1, textAlign: 'center' },
  infoBar: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#ede7f6' },
  infoText: { fontSize: 12, color: '#4a148c' },
  pdf: { flex: 1, width, backgroundColor: '#e0e0e0' },
  logContainer: { marginTop: 16, backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, minHeight: 100 },
  logTitle: { color: '#aaa', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  logEmpty: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  logLine: { color: '#ddd', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  logSuccess: { color: '#4caf50' },
  logError: { color: '#f44336' },
  verdictBox: { marginTop: 16, backgroundColor: '#fff3e0', padding: 12, borderRadius: 8, marginBottom: 40 },
  verdictTitle: { fontWeight: 'bold', color: '#e65100', fontSize: 14, marginBottom: 8 },
  verdictItem: { fontSize: 11, color: '#555', marginBottom: 4 },
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
});
