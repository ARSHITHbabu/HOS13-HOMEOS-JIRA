/**
 * Polyfill crypto.getRandomValues for React Native (Hermes engine).
 *
 * React Native's Hermes does NOT provide the Web Crypto API.
 * @noble/ciphers requires crypto.getRandomValues for secure randomness.
 *
 * This polyfill uses expo-crypto which delegates to the OS CSPRNG:
 *   - iOS: SecRandomCopyBytes
 *   - Android: java.security.SecureRandom
 *
 * IMPORTANT: This file MUST be imported before any @noble/ciphers imports.
 */
import * as ExpoCrypto from 'expo-crypto';

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}

if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  // expo-crypto.getRandomBytes() has a 1024-byte limit per call.
  // We chunk larger requests to stay within the limit.
  const MAX_CHUNK = 1024;

  (globalThis.crypto as any).getRandomValues = <T extends ArrayBufferView>(array: T): T => {
    const target = new Uint8Array(
      (array as unknown as Uint8Array).buffer,
      (array as unknown as Uint8Array).byteOffset,
      array.byteLength,
    );

    let offset = 0;
    while (offset < target.length) {
      const chunkSize = Math.min(MAX_CHUNK, target.length - offset);
      const bytes = ExpoCrypto.getRandomBytes(chunkSize);
      target.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), offset);
      offset += chunkSize;
    }

    return array;
  };
}
