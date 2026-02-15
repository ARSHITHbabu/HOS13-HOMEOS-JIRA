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
import QuickCrypto from 'react-native-quick-crypto';
import * as SecureStore from 'expo-secure-store';

// Buffer polyfill from quick-crypto
const { Buffer } = QuickCrypto;

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // TEST 1: Random bytes generation
  const testRandomBytes = () => {
    try {
      addLog('Testing randomBytes generation...');
      const start = Date.now();

      const bytes16 = QuickCrypto.randomBytes(16);
      const bytes32 = QuickCrypto.randomBytes(32);
      const bytes64 = QuickCrypto.randomBytes(64);

      const elapsed = Date.now() - start;
      addLog(`Generated 16 bytes: ${Buffer.from(bytes16).toString('hex').substring(0, 32)}...`);
      addLog(`Generated 32 bytes: ${Buffer.from(bytes32).toString('hex').substring(0, 32)}...`);
      addLog(`Generated 64 bytes: ${Buffer.from(bytes64).toString('hex').substring(0, 32)}...`);
      addLog(`SUCCESS: randomBytes works (${elapsed}ms)`);

      // Verify randomness (basic check: no two are the same)
      const hex16 = Buffer.from(bytes16).toString('hex');
      const hex32 = Buffer.from(bytes32).toString('hex');
      if (hex16 !== hex32.substring(0, 32)) {
        addLog('SUCCESS: Values are unique (basic randomness check)');
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  // TEST 2: AES-256-GCM Encrypt/Decrypt round-trip
  const testAES256GCM = () => {
    try {
      addLog('Testing AES-256-GCM encrypt/decrypt...');
      const start = Date.now();

      // Generate key and IV
      const key = QuickCrypto.randomBytes(32); // 256-bit key
      const iv = QuickCrypto.randomBytes(12);  // 96-bit IV (recommended for GCM)

      const plaintext = 'Family OS - Sensitive data: SSN 123-45-6789, Bank Acct: 9876543210';
      addLog(`Plaintext: "${plaintext}"`);
      addLog(`Key (hex): ${Buffer.from(key).toString('hex').substring(0, 32)}...`);
      addLog(`IV (hex): ${Buffer.from(iv).toString('hex')}`);

      // Encrypt
      const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      addLog(`Encrypted (hex): ${encrypted.substring(0, 40)}...`);
      addLog(`Auth Tag (hex): ${Buffer.from(authTag).toString('hex')}`);

      // Decrypt
      const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const elapsed = Date.now() - start;

      if (decrypted === plaintext) {
        addLog(`Decrypted: "${decrypted}"`);
        addLog(`SUCCESS: AES-256-GCM round-trip passed (${elapsed}ms)`);
      } else {
        addLog(`ERROR: Decrypted text doesn't match! Got: "${decrypted}"`);
      }
    } catch (err: any) {
      addLog(`ERROR: AES-256-GCM failed - ${err.message}`);
    }
  };

  // TEST 3: Wrong key test (Known issue #798)
  const testWrongKey = () => {
    try {
      addLog('Testing wrong key decryption (Issue #798 check)...');

      // Encrypt with correct key
      const correctKey = QuickCrypto.randomBytes(32);
      const wrongKey = QuickCrypto.randomBytes(32);
      const iv = QuickCrypto.randomBytes(12);
      const plaintext = 'Secret family data';

      const cipher = QuickCrypto.createCipheriv('aes-256-gcm', correctKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      addLog('Encrypted with correct key. Now trying wrong key...');

      // Try to decrypt with wrong key
      try {
        const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', wrongKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // If we get here, the wrong key didn't throw!
        addLog(`WARNING: Wrong key did NOT throw an error!`);
        addLog(`Decrypted garbage: "${decrypted}"`);
        addLog('ISSUE #798 CONFIRMED: decipher.final() should throw with wrong key but did not.');
        addLog('BLOCKER NOTE: Must add explicit auth tag verification in app layer.');
      } catch (decryptErr: any) {
        addLog(`SUCCESS: Wrong key correctly threw error: "${decryptErr.message}"`);
        addLog('Issue #798 NOT reproduced -- library handles wrong keys properly.');
      }
    } catch (err: any) {
      addLog(`ERROR: Test setup failed - ${err.message}`);
    }
  };

  // TEST 4: Secure Store key storage + re-decrypt
  const testSecureStore = async () => {
    try {
      addLog('Testing Secure Store (key storage + re-decrypt)...');
      const start = Date.now();

      // Generate and store a key
      const key = QuickCrypto.randomBytes(32);
      const iv = QuickCrypto.randomBytes(12);
      const keyHex = Buffer.from(key).toString('hex');
      const ivHex = Buffer.from(iv).toString('hex');

      addLog('Storing encryption key in Secure Store...');
      await SecureStore.setItemAsync('poc4_test_key', keyHex);
      await SecureStore.setItemAsync('poc4_test_iv', ivHex);
      addLog('SUCCESS: Key and IV stored in Secure Store.');

      // Encrypt data
      const plaintext = 'Family OS Vault: Birth Certificate #12345';
      const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = Buffer.from(cipher.getAuthTag()).toString('hex');

      addLog(`Encrypted "${plaintext.substring(0, 30)}..." with stored key.`);

      // Retrieve key from Secure Store and re-decrypt
      addLog('Retrieving key from Secure Store...');
      const retrievedKeyHex = await SecureStore.getItemAsync('poc4_test_key');
      const retrievedIvHex = await SecureStore.getItemAsync('poc4_test_iv');

      if (!retrievedKeyHex || !retrievedIvHex) {
        addLog('ERROR: Could not retrieve key/IV from Secure Store.');
        return;
      }

      const retrievedKey = Buffer.from(retrievedKeyHex, 'hex');
      const retrievedIv = Buffer.from(retrievedIvHex, 'hex');

      const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', retrievedKey, retrievedIv);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const elapsed = Date.now() - start;

      if (decrypted === plaintext) {
        addLog(`Decrypted: "${decrypted}"`);
        addLog(`SUCCESS: Secure Store round-trip works (${elapsed}ms)`);
        addLog('Key stored -> retrieved -> decrypt verified.');
      } else {
        addLog('ERROR: Decrypted text does not match original!');
      }

      // Cleanup
      await SecureStore.deleteItemAsync('poc4_test_key');
      await SecureStore.deleteItemAsync('poc4_test_iv');
      addLog('Cleaned up stored keys.');
    } catch (err: any) {
      addLog(`ERROR: Secure Store test failed - ${err.message}`);
    }
  };

  // TEST 5: Performance test (encrypt large data)
  const testPerformance = () => {
    try {
      addLog('Testing encryption performance...');

      const key = QuickCrypto.randomBytes(32);
      const iv = QuickCrypto.randomBytes(12);

      // Test with different data sizes
      const sizes = [100, 1000, 10000, 100000];

      sizes.forEach((size) => {
        const data = 'A'.repeat(size);
        const start = Date.now();

        const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        cipher.getAuthTag();

        const encryptTime = Date.now() - start;

        const decStart = Date.now();
        const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(cipher.getAuthTag());
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const decryptTime = Date.now() - decStart;

        addLog(`  ${(size / 1000).toFixed(1)}KB: encrypt=${encryptTime}ms, decrypt=${decryptTime}ms`);
      });

      addLog('SUCCESS: Performance test complete.');
    } catch (err: any) {
      addLog(`ERROR: Performance test failed - ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.header}>POC-4: AES-256 Encryption</Text>
      <Text style={styles.subheader}>Family OS - HOS13 | react-native-quick-crypto v1.0.11</Text>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Encryption Tests</Text>
        <Text style={styles.description}>
          Tests AES-256-GCM encryption for Document Vault data security.
          {'\n'}Run tests in order (1-5). Requires Development Build.
        </Text>
        <Text style={styles.warn}>
          NOTE: Docs said react-native-quick-crypto ~0.7.5, actual installed = v1.0.11
        </Text>

        {/* Test Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={testRandomBytes}>
            <Text style={styles.buttonText}>1. Random Bytes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={testAES256GCM}>
            <Text style={styles.buttonText}>2. AES-256-GCM</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#d32f2f' }]} onPress={testWrongKey}>
            <Text style={styles.buttonText}>3. Wrong Key (#798)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={testSecureStore}>
            <Text style={styles.buttonText}>4. Secure Store</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={testPerformance}>
            <Text style={styles.buttonText}>5. Performance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#757575' }]}
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
                log.includes('WARNING') && styles.logWarning,
                log.includes('ISSUE') && styles.logWarning,
                log.includes('BLOCKER') && styles.logError,
              ]}
            >
              {log}
            </Text>
          ))}
        </View>

        {/* Verdict */}
        <View style={styles.verdictBox}>
          <Text style={styles.verdictTitle}>POC-4 Checklist</Text>
          <Text style={styles.verdictItem}>- Does randomBytes generate unique values?</Text>
          <Text style={styles.verdictItem}>- Does AES-256-GCM encrypt/decrypt round-trip work?</Text>
          <Text style={styles.verdictItem}>- Does wrong key throw an error? (Issue #798)</Text>
          <Text style={styles.verdictItem}>- Can keys be stored/retrieved from Secure Store?</Text>
          <Text style={styles.verdictItem}>- What is the performance for 1KB, 10KB, 100KB data?</Text>
          <Text style={styles.verdictItem}>- Is v1.0.11 API compatible with docs (which say ~0.7.5)?</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', paddingTop: 10, color: '#1a1a2e' },
  subheader: { fontSize: 12, textAlign: 'center', color: '#666', marginBottom: 10 },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  description: { fontSize: 12, color: '#666', marginBottom: 8 },
  warn: { fontSize: 12, color: '#e65100', marginBottom: 16, lineHeight: 18, backgroundColor: '#fff3e0', padding: 8, borderRadius: 8 },
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
  logWarning: { color: '#ff9800' },
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
