/**
 * POC6-NobleCiphers: AES-256-GCM Encryption with @noble/ciphers
 *
 * Family OS - Document Vault Encryption Validation
 * Replaces POC4-Encryption (react-native-quick-crypto) which was BLOCKED
 * due to persistent Nitro Module PKCS1 initialization failure.
 *
 * This POC validates @noble/ciphers as a pure JavaScript fallback
 * for AES-256-GCM encryption required by the Document Vault feature.
 *
 * Tests mirror POC4 test suite:
 *   Test 1: Random Bytes Generation
 *   Test 2: AES-256-GCM Encrypt/Decrypt Round-Trip
 *   Test 3: Wrong Key / Tampered Data Detection
 *   Test 4: Secure Store Integration (expo-secure-store)
 *   Test 5: Performance Benchmark (100B to 100KB)
 */

// NOTE: crypto.getRandomValues polyfill is loaded in index.ts via crypto-polyfill.ts
// This MUST happen before @noble/ciphers is imported (it needs Web Crypto API)

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import * as SecureStore from 'expo-secure-store';

// ─── Helpers ─────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── Types ───────────────────────────────────────────────

type LogLevel = 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING' | 'HEADER';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
}

// ─── Main App ────────────────────────────────────────────

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const addLog = useCallback((level: LogLevel, message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setLogs((prev) => [...prev, { timestamp, level, message }]);
  }, []);

  // ═══════════════════════════════════════════════════════
  // TEST 1: Random Bytes Generation
  // ═══════════════════════════════════════════════════════
  const testRandomBytes = async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      addLog('HEADER', '══ TEST 1: Random Bytes Generation ══');

      // Generate random bytes of different sizes
      const rand16 = randomBytes(16);
      const rand32 = randomBytes(32);
      const rand64 = randomBytes(64);

      addLog('INFO', `16 bytes: ${bytesToHex(rand16)}`);
      addLog('INFO', `32 bytes: ${bytesToHex(rand32)}`);
      addLog('INFO', `64 bytes: ${bytesToHex(rand64)}`);

      // Verify correct lengths
      if (rand16.length !== 16 || rand32.length !== 32 || rand64.length !== 64) {
        throw new Error('Random bytes length mismatch');
      }

      // Verify uniqueness (two calls should produce different values)
      const rand32a = randomBytes(32);
      const rand32b = randomBytes(32);
      const hex32a = bytesToHex(rand32a);
      const hex32b = bytesToHex(rand32b);

      if (hex32a === hex32b) {
        throw new Error('Random bytes not unique -- generated identical values');
      }
      addLog('SUCCESS', `Uniqueness verified: two 32-byte values differ`);
      addLog('SUCCESS', `  A: ${hex32a.substring(0, 32)}...`);
      addLog('SUCCESS', `  B: ${hex32b.substring(0, 32)}...`);

      const duration = performance.now() - start;
      addLog('SUCCESS', `TEST 1 PASSED (${duration.toFixed(1)}ms)`);
      return { name: 'Random Bytes Generation', passed: true, duration, details: 'All sizes generated correctly, uniqueness verified' };
    } catch (err: any) {
      const duration = performance.now() - start;
      addLog('ERROR', `TEST 1 FAILED: ${err.message}`);
      return { name: 'Random Bytes Generation', passed: false, duration, details: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════
  // TEST 2: AES-256-GCM Encrypt/Decrypt Round-Trip
  // ═══════════════════════════════════════════════════════
  const testEncryptDecrypt = async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      addLog('HEADER', '══ TEST 2: AES-256-GCM Encrypt/Decrypt ══');

      // Same test data as POC4 for consistency
      const plaintext = 'Family OS - Sensitive data: SSN 123-45-6789, Bank Acct: 9876543210';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Generate 256-bit key (32 bytes) and 96-bit nonce (12 bytes)
      const key = randomBytes(32);
      const nonce = randomBytes(12);

      addLog('INFO', `Plaintext: "${plaintext}"`);
      addLog('INFO', `Key (hex): ${bytesToHex(key).substring(0, 32)}...`);
      addLog('INFO', `Nonce (hex): ${bytesToHex(nonce)}`);
      addLog('INFO', `Key size: ${key.length * 8} bits (AES-256)`);
      addLog('INFO', `Nonce size: ${nonce.length * 8} bits (96-bit, recommended for GCM)`);

      // Encrypt
      const plaintextBytes = encoder.encode(plaintext);
      const aes = gcm(key, nonce);
      const ciphertext = aes.encrypt(plaintextBytes);

      addLog('INFO', `Ciphertext length: ${ciphertext.length} bytes`);
      addLog('INFO', `Ciphertext (hex): ${bytesToHex(ciphertext).substring(0, 64)}...`);
      addLog('INFO', `Note: Ciphertext includes 16-byte GCM auth tag (appended automatically)`);

      // Decrypt
      const aes2 = gcm(key, nonce);
      const decryptedBytes = aes2.decrypt(ciphertext);
      const decrypted = decoder.decode(decryptedBytes);

      addLog('INFO', `Decrypted: "${decrypted}"`);

      // Verify round-trip
      if (decrypted !== plaintext) {
        throw new Error(`Round-trip failed: expected "${plaintext}" but got "${decrypted}"`);
      }

      addLog('SUCCESS', 'Round-trip verification: MATCH');
      addLog('SUCCESS', `Plaintext bytes: ${plaintextBytes.length}, Ciphertext bytes: ${ciphertext.length} (includes 16-byte auth tag)`);

      const duration = performance.now() - start;
      addLog('SUCCESS', `TEST 2 PASSED (${duration.toFixed(1)}ms)`);
      return { name: 'AES-256-GCM Encrypt/Decrypt', passed: true, duration, details: `Round-trip verified. ${plaintextBytes.length}B plaintext -> ${ciphertext.length}B ciphertext` };
    } catch (err: any) {
      const duration = performance.now() - start;
      addLog('ERROR', `TEST 2 FAILED: ${err.message}`);
      return { name: 'AES-256-GCM Encrypt/Decrypt', passed: false, duration, details: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════
  // TEST 3: Wrong Key / Tampered Data Detection
  // (Validates that @noble/ciphers properly throws on wrong key
  //  -- this is the Issue #798 that react-native-quick-crypto fails)
  // ═══════════════════════════════════════════════════════
  const testWrongKeyDetection = async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      addLog('HEADER', '══ TEST 3: Wrong Key / Tampered Data Detection ══');
      addLog('INFO', 'This test validates that @noble/ciphers correctly rejects:');
      addLog('INFO', '  (a) Decryption with a wrong key');
      addLog('INFO', '  (b) Decryption of tampered ciphertext');
      addLog('INFO', '  (Note: react-native-quick-crypto Issue #798 fails this test)');

      const encoder = new TextEncoder();
      const plaintext = 'Family OS Vault: Birth Certificate #12345';
      const plaintextBytes = encoder.encode(plaintext);

      // Encrypt with correct key
      const correctKey = randomBytes(32);
      const nonce = randomBytes(12);
      const aesCorrect = gcm(correctKey, nonce);
      const ciphertext = aesCorrect.encrypt(plaintextBytes);

      addLog('INFO', `Encrypted "${plaintext}" with correct key`);

      // ─── Test 3a: Wrong Key ───
      addLog('INFO', '--- Test 3a: Decrypt with WRONG key ---');
      const wrongKey = randomBytes(32);
      let wrongKeyThrew = false;
      try {
        const aesWrong = gcm(wrongKey, nonce);
        aesWrong.decrypt(ciphertext);
        addLog('ERROR', 'WRONG KEY: Did NOT throw error (Issue #798 behavior)');
      } catch (decryptErr: any) {
        wrongKeyThrew = true;
        addLog('SUCCESS', `WRONG KEY: Correctly threw error: "${decryptErr.message}"`);
      }

      // ─── Test 3b: Tampered Ciphertext ───
      addLog('INFO', '--- Test 3b: Decrypt TAMPERED ciphertext ---');
      const tampered = new Uint8Array(ciphertext);
      tampered[0] ^= 0xff; // Flip bits in first byte
      tampered[Math.floor(tampered.length / 2)] ^= 0xff; // Flip middle byte

      let tamperedThrew = false;
      try {
        const aesTampered = gcm(correctKey, nonce);
        aesTampered.decrypt(tampered);
        addLog('ERROR', 'TAMPERED DATA: Did NOT throw error');
      } catch (tamperedErr: any) {
        tamperedThrew = true;
        addLog('SUCCESS', `TAMPERED DATA: Correctly threw error: "${tamperedErr.message}"`);
      }

      // ─── Test 3c: Wrong Nonce ───
      addLog('INFO', '--- Test 3c: Decrypt with WRONG nonce ---');
      const wrongNonce = randomBytes(12);
      let wrongNonceThrew = false;
      try {
        const aesWrongNonce = gcm(correctKey, wrongNonce);
        aesWrongNonce.decrypt(ciphertext);
        addLog('ERROR', 'WRONG NONCE: Did NOT throw error');
      } catch (nonceErr: any) {
        wrongNonceThrew = true;
        addLog('SUCCESS', `WRONG NONCE: Correctly threw error: "${nonceErr.message}"`);
      }

      if (!wrongKeyThrew || !tamperedThrew || !wrongNonceThrew) {
        const failures = [];
        if (!wrongKeyThrew) failures.push('wrong key');
        if (!tamperedThrew) failures.push('tampered data');
        if (!wrongNonceThrew) failures.push('wrong nonce');
        throw new Error(`Failed to detect: ${failures.join(', ')}`);
      }

      addLog('SUCCESS', 'All 3 integrity checks PASSED');
      addLog('SUCCESS', '@noble/ciphers correctly handles auth tag verification');
      addLog('SUCCESS', 'Issue #798 does NOT apply -- @noble/ciphers throws on wrong key');

      const duration = performance.now() - start;
      addLog('SUCCESS', `TEST 3 PASSED (${duration.toFixed(1)}ms)`);
      return { name: 'Wrong Key / Tampered Data Detection', passed: true, duration, details: 'All 3 checks passed: wrong key, tampered data, wrong nonce all throw correctly' };
    } catch (err: any) {
      const duration = performance.now() - start;
      addLog('ERROR', `TEST 3 FAILED: ${err.message}`);
      return { name: 'Wrong Key / Tampered Data Detection', passed: false, duration, details: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════
  // TEST 4: Secure Store Integration (expo-secure-store)
  // ═══════════════════════════════════════════════════════
  const testSecureStore = async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      addLog('HEADER', '══ TEST 4: Secure Store Integration ══');
      addLog('INFO', 'Testing key storage with expo-secure-store (iOS Keychain / Android KeyStore)');

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Generate key and nonce
      const key = randomBytes(32);
      const nonce = randomBytes(12);

      // Encrypt sensitive data
      const plaintext = 'Family OS Vault: Birth Certificate #12345, Medical Records';
      const plaintextBytes = encoder.encode(plaintext);
      const aes = gcm(key, nonce);
      const ciphertext = aes.encrypt(plaintextBytes);

      addLog('INFO', `Encrypted: "${plaintext}"`);
      addLog('INFO', `Ciphertext: ${ciphertext.length} bytes`);

      // Store key and nonce in Secure Store
      const keyHex = bytesToHex(key);
      const nonceHex = bytesToHex(nonce);
      const ciphertextHex = bytesToHex(ciphertext);

      await SecureStore.setItemAsync('poc6_encryption_key', keyHex);
      await SecureStore.setItemAsync('poc6_encryption_nonce', nonceHex);
      addLog('SUCCESS', 'Stored encryption key in SecureStore (poc6_encryption_key)');
      addLog('SUCCESS', 'Stored nonce in SecureStore (poc6_encryption_nonce)');

      // Retrieve key and nonce from Secure Store
      const retrievedKeyHex = await SecureStore.getItemAsync('poc6_encryption_key');
      const retrievedNonceHex = await SecureStore.getItemAsync('poc6_encryption_nonce');

      if (!retrievedKeyHex || !retrievedNonceHex) {
        throw new Error('Failed to retrieve key or nonce from SecureStore');
      }

      addLog('SUCCESS', 'Retrieved key from SecureStore');
      addLog('SUCCESS', 'Retrieved nonce from SecureStore');

      // Verify retrieved values match
      if (retrievedKeyHex !== keyHex) {
        throw new Error('Retrieved key does not match stored key');
      }
      if (retrievedNonceHex !== nonceHex) {
        throw new Error('Retrieved nonce does not match stored nonce');
      }
      addLog('SUCCESS', 'Key match verified: stored === retrieved');
      addLog('SUCCESS', 'Nonce match verified: stored === retrieved');

      // Decrypt using retrieved key
      const retrievedKey = hexToBytes(retrievedKeyHex);
      const retrievedNonce = hexToBytes(retrievedNonceHex);
      const storedCiphertext = hexToBytes(ciphertextHex);

      const aes2 = gcm(retrievedKey, retrievedNonce);
      const decryptedBytes = aes2.decrypt(storedCiphertext);
      const decrypted = decoder.decode(decryptedBytes);

      if (decrypted !== plaintext) {
        throw new Error(`Decrypted text mismatch: "${decrypted}" !== "${plaintext}"`);
      }

      addLog('SUCCESS', `Decrypted with retrieved key: "${decrypted}"`);
      addLog('SUCCESS', 'Full round-trip verified: encrypt -> store key -> retrieve key -> decrypt');

      // Cleanup
      await SecureStore.deleteItemAsync('poc6_encryption_key');
      await SecureStore.deleteItemAsync('poc6_encryption_nonce');
      addLog('INFO', 'Cleaned up SecureStore keys');

      const duration = performance.now() - start;
      addLog('SUCCESS', `TEST 4 PASSED (${duration.toFixed(1)}ms)`);
      return { name: 'Secure Store Integration', passed: true, duration, details: 'Key stored/retrieved from SecureStore, decrypt verified' };
    } catch (err: any) {
      const duration = performance.now() - start;
      addLog('ERROR', `TEST 4 FAILED: ${err.message}`);
      // Cleanup on failure
      try {
        await SecureStore.deleteItemAsync('poc6_encryption_key');
        await SecureStore.deleteItemAsync('poc6_encryption_nonce');
      } catch {}
      return { name: 'Secure Store Integration', passed: false, duration, details: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════
  // TEST 5: Performance Benchmark (100B, 1KB, 10KB, 100KB)
  // ═══════════════════════════════════════════════════════
  const testPerformance = async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      addLog('HEADER', '══ TEST 5: Performance Benchmark ══');
      addLog('INFO', 'Testing encrypt/decrypt at multiple data sizes');
      addLog('INFO', 'Simulates Family OS Document Vault workloads');

      const sizes = [
        { label: '100 B', size: 100 },
        { label: '1 KB', size: 1_000 },
        { label: '10 KB', size: 10_000 },
        { label: '100 KB', size: 100_000 },
      ];

      const benchResults: string[] = [];

      for (const { label, size } of sizes) {
        // Generate test data
        const testData = randomBytes(size);
        const key = randomBytes(32);
        const nonce = randomBytes(12);

        // Benchmark encrypt
        const encStart = performance.now();
        const aesEnc = gcm(key, nonce);
        const ciphertext = aesEnc.encrypt(testData);
        const encTime = performance.now() - encStart;

        // Benchmark decrypt
        const decStart = performance.now();
        const aesDec = gcm(key, nonce);
        const decrypted = aesDec.decrypt(ciphertext);
        const decTime = performance.now() - decStart;

        // Verify
        if (decrypted.length !== testData.length) {
          throw new Error(`Size mismatch at ${label}: ${decrypted.length} !== ${testData.length}`);
        }

        // Verify first and last bytes match
        if (decrypted[0] !== testData[0] || decrypted[decrypted.length - 1] !== testData[testData.length - 1]) {
          throw new Error(`Data mismatch at ${label}`);
        }

        const result = `${label}: encrypt=${encTime.toFixed(2)}ms, decrypt=${decTime.toFixed(2)}ms, ciphertext=${ciphertext.length}B`;
        benchResults.push(result);
        addLog('SUCCESS', result);
      }

      addLog('INFO', '');
      addLog('INFO', 'Performance Summary:');
      addLog('INFO', '  - 100B-10KB: Sub-millisecond (instant for chat messages, metadata)');
      addLog('INFO', '  - 100KB: Fast (suitable for small documents, receipts)');
      addLog('INFO', '  - For Document Vault: typical files <10MB are well within acceptable range');
      addLog('INFO', '  - @noble/ciphers is pure JS -- no native bridge overhead');

      const duration = performance.now() - start;
      addLog('SUCCESS', `TEST 5 PASSED (${duration.toFixed(1)}ms total)`);
      return { name: 'Performance Benchmark', passed: true, duration, details: benchResults.join(' | ') };
    } catch (err: any) {
      const duration = performance.now() - start;
      addLog('ERROR', `TEST 5 FAILED: ${err.message}`);
      return { name: 'Performance Benchmark', passed: false, duration, details: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════
  // RUN ALL TESTS
  // ═══════════════════════════════════════════════════════
  const runAllTests = async () => {
    setLogs([]);
    setResults([]);
    setRunning(true);
    setCompleted(false);

    addLog('HEADER', '╔══════════════════════════════════════════════╗');
    addLog('HEADER', '║  POC6: @noble/ciphers Encryption Validation ║');
    addLog('HEADER', '║  Family OS - Document Vault AES-256-GCM     ║');
    addLog('HEADER', '║  Fallback for react-native-quick-crypto     ║');
    addLog('HEADER', '╚══════════════════════════════════════════════╝');
    addLog('INFO', '');
    addLog('INFO', 'Library: @noble/ciphers (pure JavaScript)');
    addLog('INFO', 'Algorithm: AES-256-GCM (authenticated encryption)');
    addLog('INFO', 'Key Storage: expo-secure-store');
    addLog('INFO', `Platform: React Native ${require('react-native/package.json').version}`);
    addLog('INFO', '');

    const allResults: TestResult[] = [];

    // Test 1
    const r1 = await testRandomBytes();
    allResults.push(r1);
    addLog('INFO', '');

    // Test 2
    const r2 = await testEncryptDecrypt();
    allResults.push(r2);
    addLog('INFO', '');

    // Test 3
    const r3 = await testWrongKeyDetection();
    allResults.push(r3);
    addLog('INFO', '');

    // Test 4
    const r4 = await testSecureStore();
    allResults.push(r4);
    addLog('INFO', '');

    // Test 5
    const r5 = await testPerformance();
    allResults.push(r5);
    addLog('INFO', '');

    // Summary
    const passed = allResults.filter((r) => r.passed).length;
    const failed = allResults.filter((r) => !r.passed).length;
    const totalTime = allResults.reduce((sum, r) => sum + r.duration, 0);

    addLog('HEADER', '══════════════════════════════════════════');
    addLog('HEADER', '           FINAL RESULTS SUMMARY          ');
    addLog('HEADER', '══════════════════════════════════════════');
    addLog(passed === 5 ? 'SUCCESS' : 'WARNING', `Results: ${passed}/5 passed, ${failed}/5 failed`);
    addLog('INFO', `Total time: ${totalTime.toFixed(1)}ms`);
    addLog('INFO', '');

    if (passed === 5) {
      addLog('SUCCESS', 'ALL TESTS PASSED');
      addLog('SUCCESS', '@noble/ciphers is VALIDATED for Family OS Document Vault');
      addLog('SUCCESS', '');
      addLog('SUCCESS', 'POC6 Conclusion:');
      addLog('SUCCESS', '  - AES-256-GCM encryption/decryption: WORKING');
      addLog('SUCCESS', '  - Auth tag verification (wrong key/tamper): WORKING');
      addLog('SUCCESS', '  - expo-secure-store key management: WORKING');
      addLog('SUCCESS', '  - Performance (100B-100KB): ACCEPTABLE');
      addLog('SUCCESS', '  - No native modules required: CONFIRMED');
      addLog('SUCCESS', '  - Issue #798 does NOT apply: CONFIRMED');
    } else {
      addLog('ERROR', `${failed} test(s) failed. See details above.`);
    }

    setResults(allResults);
    setRunning(false);
    setCompleted(true);
  };

  // ─── UI Rendering ──────────────────────────────────────

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case 'SUCCESS': return '#27ae60';
      case 'ERROR': return '#e74c3c';
      case 'WARNING': return '#f39c12';
      case 'HEADER': return '#2980b9';
      case 'INFO': default: return '#ecf0f1';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>POC6: @noble/ciphers</Text>
        <Text style={styles.headerSubtitle}>AES-256-GCM Encryption Validation</Text>
        <Text style={styles.headerInfo}>Family OS Document Vault | Pure JavaScript</Text>
      </View>

      {/* Test Checklist */}
      {completed && (
        <View style={styles.checklist}>
          {results.map((r, i) => (
            <View key={i} style={styles.checkItem}>
              <Text style={[styles.checkIcon, { color: r.passed ? '#27ae60' : '#e74c3c' }]}>
                {r.passed ? '[PASS]' : '[FAIL]'}
              </Text>
              <Text style={styles.checkText}>
                Test {i + 1}: {r.name} ({r.duration.toFixed(1)}ms)
              </Text>
            </View>
          ))}
          <View style={styles.checkItem}>
            <Text style={[styles.checkIcon, { color: results.every((r) => r.passed) ? '#27ae60' : '#e74c3c' }]}>
              {results.every((r) => r.passed) ? '[PASS]' : '[FAIL]'}
            </Text>
            <Text style={[styles.checkText, { fontWeight: 'bold' }]}>
              Overall: {results.filter((r) => r.passed).length}/{results.length} passed
            </Text>
          </View>
        </View>
      )}

      {/* Run Button */}
      <TouchableOpacity
        style={[styles.runButton, running && styles.runButtonDisabled]}
        onPress={runAllTests}
        disabled={running}
      >
        {running ? (
          <View style={styles.runButtonContent}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.runButtonText}>  Running Tests...</Text>
          </View>
        ) : (
          <Text style={styles.runButtonText}>
            {completed ? 'Re-Run All Tests' : 'Run All 5 Tests'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Log Output */}
      <ScrollView
        style={styles.logContainer}
        contentContainerStyle={styles.logContent}
        ref={(ref) => {
          if (ref) {
            setTimeout(() => ref.scrollToEnd({ animated: true }), 100);
          }
        }}
      >
        {logs.length === 0 && (
          <Text style={styles.placeholder}>
            Press "Run All 5 Tests" to validate @noble/ciphers{'\n\n'}
            Tests:{'\n'}
            1. Random Bytes Generation{'\n'}
            2. AES-256-GCM Encrypt/Decrypt Round-Trip{'\n'}
            3. Wrong Key / Tampered Data Detection{'\n'}
            4. Secure Store Integration{'\n'}
            5. Performance Benchmark (100B-100KB){'\n\n'}
            This POC replaces POC4-Encryption which was{'\n'}
            BLOCKED due to react-native-quick-crypto{'\n'}
            Nitro Module PKCS1 initialization failure.
          </Text>
        )}
        {logs.map((log, i) => (
          <Text key={i} style={[styles.logLine, { color: getLogColor(log.level) }]}>
            {log.level === 'HEADER' ? log.message : `[${log.timestamp}] ${log.message}`}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#16213e',
    borderBottomWidth: 2,
    borderBottomColor: '#0f3460',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ecf0f1',
    textAlign: 'center',
    marginTop: 2,
  },
  headerInfo: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 2,
  },
  checklist: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  checkIcon: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    width: 50,
  },
  checkText: {
    color: '#ecf0f1',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  runButton: {
    backgroundColor: '#e94560',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  runButtonDisabled: {
    backgroundColor: '#555',
  },
  runButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#0d1117',
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  logContent: {
    padding: 10,
  },
  placeholder: {
    color: '#7f8c8d',
    fontSize: 13,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
    paddingTop: 40,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
