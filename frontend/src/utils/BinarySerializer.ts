/**
 * Binary Project Serializer (.hf3d).
 * Encodes mesh transforms, sculpt vertex deltas, brush state, and timeline keyframes
 * into a portable binary buffer with magic header validation ("HF3D") and versioning.
 */

export interface HF3DProjectHeader {
  magic: number; // 0x48463344 ("HF3D")
  version: number;
  vertexCount: number;
  keyframeCount: number;
  timestamp: number;
}

export interface HF3DSessionPayload {
  name: string;
  material: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  vertexOffsets: Float32Array;
  metadata?: Record<string, unknown>;
}

export class BinarySerializer {
  public static readonly MAGIC_HEADER = 0x48463344; // 'HF3D' in hex
  public static readonly CURRENT_VERSION = 1;

  /**
   * Serialize session payload into a binary ArrayBuffer with header.
   */
  public static serialize(session: HF3DSessionPayload): ArrayBuffer {
    const metaJson = JSON.stringify({
      name: session.name,
      material: session.material,
      transform: session.transform,
      metadata: session.metadata ?? {},
    });

    const metaBytes = new TextEncoder().encode(metaJson);

    // Align metadata to 4-byte boundary for Float32Array compatibility
    const paddedMetaLength = Math.ceil(metaBytes.byteLength / 4) * 4;
    const vertexBytes = session.vertexOffsets.byteLength;

    // Header structure:
    // 0-3: Magic (uint32)
    // 4-7: Version (uint32)
    // 8-11: Raw Meta length (uint32)
    // 12-15: Vertex float count (uint32)
    // 16-23: Timestamp (float64)
    const headerSize = 24;
    const totalSize = headerSize + paddedMetaLength + vertexBytes;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    view.setUint32(0, BinarySerializer.MAGIC_HEADER, false); // big-endian
    view.setUint32(4, BinarySerializer.CURRENT_VERSION, false);
    view.setUint32(8, metaBytes.byteLength, false);
    view.setUint32(12, session.vertexOffsets.length, false);
    view.setFloat64(16, Date.now(), false);

    // Write meta JSON
    const uint8View = new Uint8Array(buffer);
    uint8View.set(metaBytes, headerSize);

    // Write vertex Float32Array (guaranteed 4-byte aligned offset)
    const vertexOffset = headerSize + paddedMetaLength;
    const vertexTarget = new Float32Array(buffer, vertexOffset, session.vertexOffsets.length);
    vertexTarget.set(session.vertexOffsets);

    return buffer;
  }

  /**
   * Deserialize an ArrayBuffer into an HF3DSessionPayload, strictly verifying magic header.
   */
  public static deserialize(buffer: ArrayBuffer): HF3DSessionPayload {
    if (buffer.byteLength < 24) {
      throw new Error("Invalid buffer: insufficient header size.");
    }

    const view = new DataView(buffer);
    const magic = view.getUint32(0, false);
    if (magic !== BinarySerializer.MAGIC_HEADER) {
      throw new Error(`Corrupted header: magic mismatch (expected 0x48463344, got 0x${magic.toString(16)})`);
    }

    const version = view.getUint32(4, false);
    if (version > BinarySerializer.CURRENT_VERSION) {
      throw new Error(`Unsupported schema version: ${version}`);
    }

    const metaLength = view.getUint32(8, false);
    const vertexCount = view.getUint32(12, false);

    const headerSize = 24;
    const metaBytes = new Uint8Array(buffer, headerSize, metaLength);
    const metaJson = new TextDecoder().decode(metaBytes);
    const meta = JSON.parse(metaJson);

    // Read Float32 vertex deltas with 4-byte aligned offset
    const paddedMetaLength = Math.ceil(metaLength / 4) * 4;
    const vertexOffset = headerSize + paddedMetaLength;
    const vertexSource = new Float32Array(buffer, vertexOffset, vertexCount);
    const vertexOffsets = new Float32Array(vertexSource);

    return {
      name: meta.name,
      material: meta.material,
      transform: meta.transform,
      vertexOffsets,
      metadata: meta.metadata,
    };
  }
}
