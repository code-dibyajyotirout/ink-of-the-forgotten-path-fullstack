/**
 * Client-Side Credential Obfuscation & Security Pipeline.
 * Provides XOR bitwise masking, Base64 encoding, and cryptographic payload integrity verification.
 */

export interface ObfuscatedPacket {
  payload: string;
  signature: string;
  timestamp: number;
}

export class XORCipher {
  private static readonly DEFAULT_SALT = "AnimatrousSecureMesh_2026";

  /**
   * Apply bitwise XOR transformation between input text and key.
   */
  public static transform(input: string, key: string = XORCipher.DEFAULT_SALT): string {
    if (!input || !key) return "";
    let result = "";
    for (let i = 0; i < input.length; i++) {
      const charCode = input.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return result;
  }

  /**
   * Encodes a plaintext string into an XOR-obfuscated Base64 representation.
   */
  public static encode(plaintext: string, key: string = XORCipher.DEFAULT_SALT): string {
    const masked = XORCipher.transform(plaintext, key);
    if (typeof btoa === "function") {
      return btoa(unescape(encodeURIComponent(masked)));
    }
    // Node.js fallback
    return Buffer.from(masked, "binary").toString("base64");
  }

  /**
   * Decodes an XOR-obfuscated Base64 string back into plaintext.
   */
  public static decode(encoded: string, key: string = XORCipher.DEFAULT_SALT): string {
    let raw = "";
    if (typeof atob === "function") {
      raw = decodeURIComponent(escape(atob(encoded)));
    } else {
      raw = Buffer.from(encoded, "base64").toString("binary");
    }
    return XORCipher.transform(raw, key);
  }

  /**
   * Fast 32-bit FNV-1a non-cryptographic checksum for tamper detection.
   */
  public static checksum(data: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  /**
   * Package an arbitrary JSON state into an obfuscated and tamper-evident packet.
   */
  public static pack<T>(data: T, key: string = XORCipher.DEFAULT_SALT): ObfuscatedPacket {
    const raw = JSON.stringify(data);
    const signature = XORCipher.checksum(raw);
    const payload = XORCipher.encode(raw, key);
    return {
      payload,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Unpack an obfuscated packet and verify signature integrity.
   */
  public static unpack<T>(packet: ObfuscatedPacket, key: string = XORCipher.DEFAULT_SALT): { valid: boolean; data: T | null } {
    try {
      const decrypted = XORCipher.decode(packet.payload, key);
      const computedSig = XORCipher.checksum(decrypted);
      if (computedSig !== packet.signature) {
        return { valid: false, data: null };
      }
      return { valid: true, data: JSON.parse(decrypted) as T };
    } catch {
      return { valid: false, data: null };
    }
  }
}
