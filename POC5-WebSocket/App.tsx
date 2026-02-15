import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { create } from 'zustand';

// ─── Zustand Store ───────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  type: 'sent' | 'received' | 'system';
  timestamp: number;
}

interface WebSocketStore {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  messages: Message[];
  logs: string[];
  messageInput: string;
  reconnectCount: number;
  setStatus: (status: WebSocketStore['status']) => void;
  addMessage: (msg: Message) => void;
  addLog: (msg: string) => void;
  setMessageInput: (text: string) => void;
  incrementReconnect: () => void;
  clearAll: () => void;
}

const useStore = create<WebSocketStore>((set) => ({
  status: 'disconnected',
  messages: [],
  logs: [],
  messageInput: '',
  reconnectCount: 0,
  setStatus: (status) => set({ status }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  addLog: (msg) =>
    set((state) => ({
      logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${msg}`],
    })),
  setMessageInput: (text) => set({ messageInput: text }),
  incrementReconnect: () => set((state) => ({ reconnectCount: state.reconnectCount + 1 })),
  clearAll: () => set({ messages: [], logs: [], reconnectCount: 0 }),
}));

// ─── WebSocket Echo Servers ──────────────────────────────────
const ECHO_SERVERS = [
  { name: 'Postman Echo', url: 'wss://ws.postman-echo.com/raw' },
  { name: 'WebSocket.org Echo', url: 'wss://echo.websocket.org' },
];

export default function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    status,
    messages,
    logs,
    messageInput,
    reconnectCount,
    setStatus,
    addMessage,
    addLog,
    setMessageInput,
    incrementReconnect,
    clearAll,
  } = useStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Connect to WebSocket
  const connect = (serverUrl: string, serverName: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    addLog(`Connecting to ${serverName}...`);
    setStatus('connecting');

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        addLog(`SUCCESS: Connected to ${serverName}`);
        addMessage({
          id: Date.now().toString(),
          text: `Connected to ${serverName}`,
          type: 'system',
          timestamp: Date.now(),
        });
      };

      ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        addLog(`Received: "${data.substring(0, 80)}${data.length > 80 ? '...' : ''}"`);
        addMessage({
          id: Date.now().toString(),
          text: data,
          type: 'received',
          timestamp: Date.now(),
        });

        // Update Zustand store with parsed data (simulating real-time sync)
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'family_update') {
            addLog(`Zustand updated with family event: ${parsed.event}`);
          }
        } catch {
          // Not JSON, that's fine for echo tests
        }
      };

      ws.onerror = (event: any) => {
        setStatus('error');
        addLog(`ERROR: WebSocket error - ${event.message || 'Unknown error'}`);
      };

      ws.onclose = (event) => {
        setStatus('disconnected');
        addLog(`Connection closed (code: ${event.code}, reason: "${event.reason || 'none'}")`);
        wsRef.current = null;

        // Auto-reconnect test
        if (event.code !== 1000) {
          incrementReconnect();
          addLog(`Scheduling reconnect (#${reconnectCount + 1}) in 3 seconds...`);
          reconnectTimerRef.current = setTimeout(() => {
            addLog('Attempting reconnect...');
            connect(serverUrl, serverName);
          }, 3000);
        }
      };
    } catch (err: any) {
      setStatus('error');
      addLog(`ERROR: Failed to create WebSocket - ${err.message}`);
    }
  };

  // Send message
  const sendMessage = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('ERROR: Not connected. Connect first.');
      return;
    }

    wsRef.current.send(text);
    addLog(`Sent: "${text}"`);
    addMessage({
      id: Date.now().toString(),
      text,
      type: 'sent',
      timestamp: Date.now(),
    });
    setMessageInput('');
  };

  // Send structured Family OS message
  const sendFamilyUpdate = () => {
    const update = JSON.stringify({
      type: 'family_update',
      event: 'task_completed',
      member: 'dad',
      data: {
        taskId: 'task-001',
        title: 'Buy groceries',
        completedAt: new Date().toISOString(),
      },
    });
    sendMessage(update);
  };

  // Disconnect
  const disconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      addLog('Disconnecting...');
    }
  };

  const statusColor =
    status === 'connected'
      ? '#4caf50'
      : status === 'connecting'
        ? '#ff9800'
        : status === 'error'
          ? '#f44336'
          : '#999';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.header}>POC-5: WebSocket + Zustand</Text>
      <Text style={styles.subheader}>
        Family OS - HOS13 | Native WS + Zustand v5.0.11
      </Text>

      <ScrollView style={styles.content}>
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>
            {status.toUpperCase()}
            {reconnectCount > 0 ? ` (reconnects: ${reconnectCount})` : ''}
          </Text>
          <Text style={styles.storeInfo}>
            Zustand msgs: {messages.length}
          </Text>
        </View>

        {/* Server Selection */}
        <Text style={styles.sectionTitle}>1. Connect to Echo Server</Text>
        <View style={styles.buttonRow}>
          {ECHO_SERVERS.map((server) => (
            <TouchableOpacity
              key={server.name}
              style={[styles.button, status === 'connected' && styles.buttonDisabled]}
              onPress={() => connect(server.url, server.name)}
              disabled={status === 'connected'}
            >
              <Text style={styles.buttonText}>{server.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Send Messages */}
        <Text style={styles.sectionTitle}>2. Send Messages</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.sendBtn, status !== 'connected' && styles.buttonDisabled]}
            onPress={() => messageInput.trim() && sendMessage(messageInput.trim())}
            disabled={status !== 'connected'}
          >
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Messages */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.quickBtn, status !== 'connected' && styles.buttonDisabled]}
            onPress={() => sendMessage('Hello Family OS!')}
            disabled={status !== 'connected'}
          >
            <Text style={styles.quickBtnText}>Quick: Hello</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, status !== 'connected' && styles.buttonDisabled]}
            onPress={sendFamilyUpdate}
            disabled={status !== 'connected'}
          >
            <Text style={styles.quickBtnText}>Family Update</Text>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <Text style={styles.sectionTitle}>3. Connection Tests</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#d32f2f' }]}
            onPress={disconnect}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#757575' }]}
            onPress={clearAll}
          >
            <Text style={styles.buttonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Tip: Toggle airplane mode to test auto-reconnect behavior
        </Text>

        {/* Messages (Zustand state) */}
        <View style={styles.messagesContainer}>
          <Text style={styles.messagesTitle}>
            Messages (Zustand Store: {messages.length} items)
          </Text>
          {messages.length === 0 && (
            <Text style={styles.logEmpty}>No messages yet...</Text>
          )}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.type === 'sent' && styles.sentBubble,
                msg.type === 'received' && styles.receivedBubble,
                msg.type === 'system' && styles.systemBubble,
              ]}
            >
              <Text style={styles.messageType}>
                {msg.type === 'sent' ? 'SENT' : msg.type === 'received' ? 'ECHO' : 'SYSTEM'}
              </Text>
              <Text
                style={[
                  styles.messageText,
                  msg.type === 'system' && styles.systemText,
                ]}
                selectable
              >
                {msg.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Logs */}
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Connection Logs:</Text>
          {logs.length === 0 && (
            <Text style={styles.logEmpty}>Connect to a server to start...</Text>
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

        {/* Verdict */}
        <View style={styles.verdictBox}>
          <Text style={styles.verdictTitle}>POC-5 Checklist</Text>
          <Text style={styles.verdictItem}>- Does WebSocket connect to the echo server?</Text>
          <Text style={styles.verdictItem}>- Are sent messages echoed back correctly?</Text>
          <Text style={styles.verdictItem}>- Does Zustand store update from WebSocket messages?</Text>
          <Text style={styles.verdictItem}>- Does JSON message parsing work (Family Update)?</Text>
          <Text style={styles.verdictItem}>- Does auto-reconnect work after disconnect?</Text>
          <Text style={styles.verdictItem}>- Any platform-specific WebSocket issues?</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8, marginTop: 12 },

  // Status
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    gap: 8,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  storeInfo: { marginLeft: 'auto', fontSize: 11, color: '#666' },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  button: {
    flex: 1,
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Input
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  sendBtn: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },

  // Quick buttons
  quickBtn: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  hint: { fontSize: 11, color: '#999', fontStyle: 'italic', marginBottom: 8 },

  // Messages
  messagesContainer: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    elevation: 2,
  },
  messagesTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 },
  messageBubble: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  sentBubble: { backgroundColor: '#ede7f6', alignSelf: 'flex-end', maxWidth: '80%' },
  receivedBubble: { backgroundColor: '#e8f5e9', alignSelf: 'flex-start', maxWidth: '80%' },
  systemBubble: { backgroundColor: '#f5f5f5', alignSelf: 'center' },
  messageType: { fontSize: 9, fontWeight: '700', color: '#999', marginBottom: 2 },
  messageText: { fontSize: 12, color: '#333' },
  systemText: { fontStyle: 'italic', color: '#666', textAlign: 'center' },

  // Logs
  logContainer: {
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  logTitle: { color: '#aaa', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  logEmpty: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  logLine: { color: '#ddd', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  logSuccess: { color: '#4caf50' },
  logError: { color: '#f44336' },

  // Verdict
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
