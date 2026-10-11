import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

/**
 * Server-side E2EE validation & verification utilities.
 * Note: Under genuine E2EE, the server NEVER holds user private keys or decrypts message content.
 * The server's responsibility is to enforce cryptographic format validity, verify public key registrations,
 * securely store and route ciphertext and nonces, and manage encrypted group key distribution envelopes.
 */

export interface KeyPairResult {
  publicKey: string; // Base64
  secretKey: string; // Base64
}

/**
 * Validates whether a given string is a valid Base64 string.
 */
export function isValidBase64(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const decoded = naclUtil.decodeBase64(str);
    return decoded && decoded.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validates a 24-byte Base64 nonce (standard TweetNaCl nonce size).
 */
export function isValidNonce(nonceBase64: string): boolean {
  if (!isValidBase64(nonceBase64)) return false;
  try {
    const bytes = naclUtil.decodeBase64(nonceBase64);
    return bytes.length === nacl.box.nonceLength; // 24 bytes
  } catch {
    return false;
  }
}

/**
 * Validates a 32-byte Base64 public key (Curve25519/TweetNaCl public key).
 */
export function isValidPublicKey(pubKeyBase64: string): boolean {
  if (!isValidBase64(pubKeyBase64)) return false;
  try {
    const bytes = naclUtil.decodeBase64(pubKeyBase64);
    return bytes.length === nacl.box.publicKeyLength; // 32 bytes
  } catch {
    return false;
  }
}

/**
 * Generates a fresh random 24-byte nonce encoded in Base64 (used for testing or client mock).
 */
export function generateNonceBase64(): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  return naclUtil.encodeBase64(nonce);
}

/**
 * Generates a Curve25519 keypair for test or mock purposes.
 */
export function generateTestKeyPair(): KeyPairResult {
  const kp = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(kp.publicKey),
    secretKey: naclUtil.encodeBase64(kp.secretKey),
  };
}

/**
 * Client-side helper (also used in end-to-end tests) to encrypt plaintext using a symmetric 32-byte key.
 */
export function encryptSymmetric(plaintext: string, keyBytes: Uint8Array): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const msgBytes = naclUtil.decodeUTF8(plaintext);
  const box = nacl.secretbox(msgBytes, nonce, keyBytes);
  return {
    ciphertext: naclUtil.encodeBase64(box),
    nonce: naclUtil.encodeBase64(nonce),
  };
}

/**
 * Client-side helper (also used in end-to-end tests) to decrypt ciphertext using a symmetric 32-byte key.
 */
export function decryptSymmetric(ciphertextBase64: string, nonceBase64: string, keyBytes: Uint8Array): string | null {
  try {
    const box = naclUtil.decodeBase64(ciphertextBase64);
    const nonce = naclUtil.decodeBase64(nonceBase64);
    const decrypted = nacl.secretbox.open(box, nonce, keyBytes);
    if (!decrypted) return null;
    return naclUtil.encodeUTF8(decrypted);
  } catch {
    return null;
  }
}
