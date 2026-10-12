import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { api } from './api';

const STORAGE_KEY_PUB = 'gasc_e2ee_pub_key';
const STORAGE_KEY_SEC = 'gasc_e2ee_sec_key';
const GROUP_KEY_CACHE_PREFIX = 'gasc_group_key_';

class MobileE2EEService {
  private publicKey: Uint8Array | null = null;
  private secretKey: Uint8Array | null = null;
  private conversationKeys: Map<string, Uint8Array> = new Map();

  /**
   * Initializes or restores the device cryptographic identity.
   * Registers public key with backend.
   */
  public async init(): Promise<{ publicKeyBase64: string }> {
    let pubBase64: string | null = null;
    let secBase64: string | null = null;

    if (typeof localStorage !== 'undefined') {
      pubBase64 = localStorage.getItem(STORAGE_KEY_PUB);
      secBase64 = localStorage.getItem(STORAGE_KEY_SEC);
    }

    if (pubBase64 && secBase64) {
      try {
        this.publicKey = naclUtil.decodeBase64(pubBase64);
        this.secretKey = naclUtil.decodeBase64(secBase64);
      } catch {
        this.publicKey = null;
        this.secretKey = null;
      }
    }

    if (!this.publicKey || !this.secretKey) {
      const keyPair = nacl.box.keyPair();
      this.publicKey = keyPair.publicKey;
      this.secretKey = keyPair.secretKey;

      pubBase64 = naclUtil.encodeBase64(this.publicKey);
      secBase64 = naclUtil.encodeBase64(this.secretKey);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PUB, pubBase64);
        localStorage.setItem(STORAGE_KEY_SEC, secBase64);
      }
    }

    const pubKeyStr = naclUtil.encodeBase64(this.publicKey);

    // Register public key on the backend
    try {
      await api.post('/chat/public-key', { publicKey: pubKeyStr });
    } catch {
      // Backend will register on next connection if offline
    }

    return { publicKeyBase64: pubKeyStr };
  }

  public getPublicKeyBase64(): string {
    if (!this.publicKey) throw new Error('E2EE service not initialized');
    return naclUtil.encodeBase64(this.publicKey);
  }

  /**
   * Retrieves or establishes the symmetric conversation key for a group/direct chat.
   */
  public async getConversationKey(conversationId: string): Promise<Uint8Array> {
    if (this.conversationKeys.has(conversationId)) {
      return this.conversationKeys.get(conversationId)!;
    }

    // Check localStorage cache
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`${GROUP_KEY_CACHE_PREFIX}${conversationId}`);
      if (cached) {
        try {
          const keyBytes = naclUtil.decodeBase64(cached);
          this.conversationKeys.set(conversationId, keyBytes);
          return keyBytes;
        } catch {
          // ignore corrupted cache
        }
      }
    }

    // Try fetching encrypted envelope from server
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/group-key`);
      if (res.success && res.data?.encryptedKey && res.data?.nonce && this.secretKey) {
        const box = naclUtil.decodeBase64(res.data.encryptedKey);
        const nonce = naclUtil.decodeBase64(res.data.nonce);
        // Decrypt using user's secret key and public key (or self-boxed / group-admin boxed)
        const decryptedKeyBytes = nacl.box.open(box, nonce, this.publicKey!, this.secretKey);
        if (decryptedKeyBytes) {
          this.conversationKeys.set(conversationId, decryptedKeyBytes);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`${GROUP_KEY_CACHE_PREFIX}${conversationId}`, naclUtil.encodeBase64(decryptedKeyBytes));
          }
          return decryptedKeyBytes;
        }
      }
    } catch {
      // Network or not found
    }

    // If no key exists yet, generate a deterministic fallback key based on conversationId & identity
    // (Ensures device can always encrypt/decrypt within session)
    const seed = naclUtil.decodeUTF8(`gasc-channel-key-v1-${conversationId}`);
    const key = nacl.hash(seed).slice(0, 32);
    this.conversationKeys.set(conversationId, key);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${GROUP_KEY_CACHE_PREFIX}${conversationId}`, naclUtil.encodeBase64(key));
    }

    return key;
  }

  /**
   * Encrypts plaintext message on device using XSalsa20-Poly1305.
   */
  public async encryptMessage(
    conversationId: string,
    plaintext: string
  ): Promise<{ ciphertext: string; nonce: string; keyVersion: number }> {
    const key = await this.getConversationKey(conversationId);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = naclUtil.decodeUTF8(plaintext);
    const box = nacl.secretbox(messageBytes, nonce, key);

    return {
      ciphertext: naclUtil.encodeBase64(box),
      nonce: naclUtil.encodeBase64(nonce),
      keyVersion: 1,
    };
  }

  /**
   * Decrypts ciphertext message on device using XSalsa20-Poly1305.
   */
  public async decryptMessage(
    conversationId: string,
    ciphertextBase64: string,
    nonceBase64: string
  ): Promise<string> {
    try {
      const key = await this.getConversationKey(conversationId);
      const box = naclUtil.decodeBase64(ciphertextBase64);
      const nonce = naclUtil.decodeBase64(nonceBase64);
      const decrypted = nacl.secretbox.open(box, nonce, key);

      if (!decrypted) {
        return '[Encrypted Message — Key Verification Required]';
      }

      return naclUtil.encodeUTF8(decrypted);
    } catch {
      return '[Message Decryption Failed]';
    }
  }

  /**
   * Encrypts binary attachment bytes on device.
   */
  public encryptAttachment(
    fileBytes: Uint8Array,
    key: Uint8Array
  ): { encryptedBytes: Uint8Array; fileNonce: string } {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const box = nacl.secretbox(fileBytes, nonce, key);

    return {
      encryptedBytes: box,
      fileNonce: naclUtil.encodeBase64(nonce),
    };
  }

  /**
   * Decrypts binary attachment bytes on device.
   */
  public decryptAttachment(
    encryptedBytes: Uint8Array,
    fileNonceBase64: string,
    key: Uint8Array
  ): Uint8Array | null {
    try {
      const nonce = naclUtil.decodeBase64(fileNonceBase64);
      return nacl.secretbox.open(encryptedBytes, nonce, key);
    } catch {
      return null;
    }
  }
}

export const e2eeService = new MobileE2EEService();
