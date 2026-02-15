import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition, { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

type AppScreen = 'home' | 'camera' | 'result';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<TextRecognitionResult | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [ocrTime, setOcrTime] = useState<number>(0);
  const cameraRef = useRef<CameraView>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Take photo with camera
  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      addLog('Capturing photo...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        addLog(`SUCCESS: Photo captured (${photo.width}x${photo.height})`);
        setCapturedUri(photo.uri);
        setScreen('result');
        runOCR(photo.uri);
      }
    } catch (err: any) {
      addLog(`ERROR: Camera capture failed - ${err.message}`);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      addLog('Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addLog(`SUCCESS: Image selected (${asset.width}x${asset.height})`);
        setCapturedUri(asset.uri);
        setScreen('result');
        runOCR(asset.uri);
      } else {
        addLog('Image picker cancelled.');
      }
    } catch (err: any) {
      addLog(`ERROR: Image picker failed - ${err.message}`);
    }
  };

  // Run ML Kit OCR on image
  const runOCR = async (uri: string) => {
    setProcessing(true);
    setOcrResult(null);
    setOcrText('');
    try {
      addLog('Running ML Kit text recognition...');
      const startTime = Date.now();
      const result = await TextRecognition.recognize(uri);
      const elapsed = Date.now() - startTime;
      setOcrTime(elapsed);

      setOcrResult(result);
      setOcrText(result.text);

      addLog(`SUCCESS: OCR completed in ${elapsed}ms`);
      addLog(`Detected ${result.blocks.length} text blocks`);
      addLog(`Total characters: ${result.text.length}`);

      // Log first few lines for quick preview
      const lines = result.text.split('\n').filter((l) => l.trim());
      lines.slice(0, 5).forEach((line, i) => {
        addLog(`  Line ${i + 1}: "${line.substring(0, 60)}${line.length > 60 ? '...' : ''}"`);
      });
      if (lines.length > 5) {
        addLog(`  ... and ${lines.length - 5} more lines`);
      }
    } catch (err: any) {
      addLog(`ERROR: OCR failed - ${err.message}`);
      setOcrText(`OCR Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // HOME SCREEN
  const renderHome = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Camera + OCR Test</Text>
      <Text style={styles.warn}>
        IMPORTANT: Requires Development Build (not Expo Go).
        {'\n'}Run: npx expo prebuild --clean && npx expo run:android
      </Text>

      {/* Test Options */}
      <TouchableOpacity
        style={styles.card}
        onPress={async () => {
          if (!permission?.granted) {
            const result = await requestPermission();
            addLog(`Camera permission: ${result.granted ? 'GRANTED' : 'DENIED'}`);
            if (!result.granted) return;
          }
          setScreen('camera');
          addLog('Opening camera...');
        }}
      >
        <Text style={styles.cardTitle}>Option 1: Take Photo with Camera</Text>
        <Text style={styles.cardDesc}>
          Open camera, capture a receipt, document, or any text. ML Kit will extract the text.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={pickImage}>
        <Text style={styles.cardTitle}>Option 2: Pick Image from Gallery</Text>
        <Text style={styles.cardDesc}>
          Select an existing photo containing text (receipt, business card, etc.)
        </Text>
      </TouchableOpacity>

      {/* Logs */}
      <View style={styles.logContainer}>
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Test Logs:</Text>
          {logs.length > 0 && (
            <TouchableOpacity onPress={() => setLogs([])}>
              <Text style={styles.clearBtn}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {logs.length === 0 && <Text style={styles.logEmpty}>Select an option to start...</Text>}
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
        <Text style={styles.verdictTitle}>POC-3 Checklist</Text>
        <Text style={styles.verdictItem}>- Does the camera open and capture a photo?</Text>
        <Text style={styles.verdictItem}>- Does ML Kit extract text from the image?</Text>
        <Text style={styles.verdictItem}>- Is the OCR accuracy acceptable for receipts?</Text>
        <Text style={styles.verdictItem}>- What is the OCR processing time?</Text>
        <Text style={styles.verdictItem}>- Does image picker work as an alternative input?</Text>
        <Text style={styles.verdictItem}>- Is on-device OCR enough, or does Gemini need to post-process?</Text>
      </View>
    </ScrollView>
  );

  // CAMERA SCREEN
  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame}>
            <Text style={styles.scanText}>Point at text (receipt, document, etc.)</Text>
          </View>
        </View>
      </CameraView>
      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setScreen('home')}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
        <View style={{ width: 60 }} />
      </View>
    </View>
  );

  // RESULT SCREEN
  const renderResult = () => (
    <ScrollView style={styles.content}>
      <View style={styles.resultHeader}>
        <TouchableOpacity onPress={() => setScreen('home')}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.resultTitle}>OCR Result</Text>
        <TouchableOpacity
          onPress={() => {
            if (capturedUri) runOCR(capturedUri);
          }}
        >
          <Text style={styles.backBtn}>Re-scan</Text>
        </TouchableOpacity>
      </View>

      {/* Captured Image Preview */}
      {capturedUri && (
        <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />
      )}

      {/* Processing Indicator */}
      {processing && (
        <View style={styles.processingBar}>
          <ActivityIndicator size="small" color="#6200ee" />
          <Text style={styles.processingText}>Running ML Kit text recognition...</Text>
        </View>
      )}

      {/* OCR Stats */}
      {ocrResult && !processing && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {ocrResult.blocks.length} blocks | {ocrResult.text.length} chars | {ocrTime}ms
          </Text>
        </View>
      )}

      {/* Extracted Text */}
      <View style={styles.ocrResultBox}>
        <Text style={styles.ocrResultTitle}>Extracted Text:</Text>
        {processing ? (
          <Text style={styles.ocrResultEmpty}>Processing...</Text>
        ) : ocrText ? (
          <Text style={styles.ocrResultText} selectable>
            {ocrText}
          </Text>
        ) : (
          <Text style={styles.ocrResultEmpty}>No text detected</Text>
        )}
      </View>

      {/* Block-level detail */}
      {ocrResult && ocrResult.blocks.length > 0 && (
        <View style={styles.blocksContainer}>
          <Text style={styles.blocksTitle}>
            Text Blocks Detail ({ocrResult.blocks.length} blocks):
          </Text>
          {ocrResult.blocks.map((block, i) => (
            <View key={i} style={styles.blockItem}>
              <Text style={styles.blockIndex}>Block {i + 1}:</Text>
              <Text style={styles.blockText} selectable>
                {block.text}
              </Text>
              <Text style={styles.blockMeta}>
                Lines: {block.lines.length} | Frame: ({Math.round(block.frame.left)},{' '}
                {Math.round(block.frame.top)}) {Math.round(block.frame.width)}x
                {Math.round(block.frame.height)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {screen !== 'camera' && (
        <>
          <Text style={styles.header}>POC-3: Camera + OCR</Text>
          <Text style={styles.subheader}>Family OS - HOS13 | expo-camera + ML Kit</Text>
        </>
      )}

      {screen === 'home' && renderHome()}
      {screen === 'camera' && renderCamera()}
      {screen === 'result' && renderResult()}
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
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#666' },

  // Camera
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: '80%',
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  scanText: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    backgroundColor: '#000',
  },
  cancelBtn: { width: 60 },
  cancelBtnText: { color: '#fff', fontSize: 16 },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 3, borderColor: '#333' },

  // Result
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { color: '#6200ee', fontWeight: '600', fontSize: 14 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  preview: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#e0e0e0', marginBottom: 12 },
  processingBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#ede7f6', borderRadius: 8, marginBottom: 12, gap: 8 },
  processingText: { color: '#4a148c', fontSize: 13 },
  statsBar: { padding: 8, backgroundColor: '#e8f5e9', borderRadius: 8, marginBottom: 12 },
  statsText: { color: '#2e7d32', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // OCR Result
  ocrResultBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  ocrResultTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  ocrResultText: { fontSize: 13, color: '#333', lineHeight: 20, fontFamily: 'monospace' },
  ocrResultEmpty: { fontSize: 13, color: '#999', fontStyle: 'italic' },

  // Blocks detail
  blocksContainer: { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginBottom: 40 },
  blocksTitle: { color: '#aaa', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  blockItem: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  blockIndex: { color: '#4caf50', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  blockText: { color: '#ddd', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  blockMeta: { color: '#888', fontSize: 10 },

  // Logs
  logContainer: { marginTop: 16, backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, minHeight: 100 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logTitle: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  clearBtn: { color: '#f44336', fontSize: 12 },
  logEmpty: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  logLine: { color: '#ddd', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  logSuccess: { color: '#4caf50' },
  logError: { color: '#f44336' },

  // Verdict
  verdictBox: { marginTop: 16, backgroundColor: '#fff3e0', padding: 12, borderRadius: 8, marginBottom: 40 },
  verdictTitle: { fontWeight: 'bold', color: '#e65100', fontSize: 14, marginBottom: 8 },
  verdictItem: { fontSize: 11, color: '#555', marginBottom: 4 },
});
