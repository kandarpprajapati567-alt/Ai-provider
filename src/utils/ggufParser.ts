import { GgufHeaderMetadata } from '../types/router';

export class GgufParser {
  private view: DataView;
  private offset = 0;
  private isLittleEndian = true;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  public parse(): GgufHeaderMetadata {
    if (this.view.byteLength < 24) {
      throw new Error('File buffer is too small to be a valid GGUF file.');
    }

    // Read Magic (4 bytes)
    const magic1 = this.view.getUint8(0);
    const magic2 = this.view.getUint8(1);
    const magic3 = this.view.getUint8(2);
    const magic4 = this.view.getUint8(3);
    const magic = String.fromCharCode(magic1, magic2, magic3, magic4);

    if (magic !== 'GGUF') {
      throw new Error(`Invalid GGUF magic header. Expected 'GGUF', found '${magic}'`);
    }

    this.offset = 4;

    // Read Version (uint32)
    const version = this.view.getUint32(this.offset, this.isLittleEndian);
    this.offset += 4;

    // Read Tensor Count (uint64)
    const tensorCount = Number(this.readUint64());

    // Read Metadata KV Count (uint64)
    const metadataKvCount = Number(this.readUint64());

    const rawMetadata: Record<string, any> = {};

    // Read Key-Value pairs (up to available buffer)
    const maxEntriesToRead = Math.min(metadataKvCount, 120);

    for (let i = 0; i < maxEntriesToRead; i++) {
      if (this.offset >= this.view.byteLength - 8) break;

      try {
        const key = this.readString();
        const valueType = this.view.getUint32(this.offset, this.isLittleEndian);
        this.offset += 4;
        const value = this.readValue(valueType);
        rawMetadata[key] = value;
      } catch {
        // Safe exit if buffer limit is reached while streaming headers
        break;
      }
    }

    const architecture = rawMetadata['general.architecture'] || 'llama';
    const modelName = rawMetadata['general.name'] || rawMetadata[`${architecture}.name`] || 'Custom GGUF Model';
    const quantization = rawMetadata['general.file_type_name'] || rawMetadata['general.quantization_version'] || 'Q4_K_M';
    const contextLength = rawMetadata[`${architecture}.context_length`] || rawMetadata['context_length'] || 4096;
    const embeddingLength = rawMetadata[`${architecture}.embedding_length`] || rawMetadata['embedding_length'];
    const blockCount = rawMetadata[`${architecture}.block_count`] || rawMetadata['block_count'];

    return {
      magic,
      version,
      tensorCount,
      metadataKvCount,
      architecture,
      modelName,
      quantization: String(quantization),
      contextLength: Number(contextLength),
      embeddingLength: embeddingLength ? Number(embeddingLength) : undefined,
      blockCount: blockCount ? Number(blockCount) : undefined,
      rawMetadata,
    };
  }

  private readUint64(): bigint {
    const low = BigInt(this.view.getUint32(this.offset, this.isLittleEndian));
    const high = BigInt(this.view.getUint32(this.offset + 4, this.isLittleEndian));
    this.offset += 8;
    return (high << 32n) | low;
  }

  private readString(): string {
    const len = Number(this.readUint64());
    if (len < 0 || len > 5000) {
      throw new Error(`Suspicious string length: ${len}`);
    }
    const bytes = new Uint8Array(this.view.buffer, this.offset, Math.min(len, this.view.byteLength - this.offset));
    this.offset += len;
    return new TextDecoder().decode(bytes);
  }

  private readValue(type: number): any {
    switch (type) {
      case 0: { // UINT8
        const v = this.view.getUint8(this.offset);
        this.offset += 1;
        return v;
      }
      case 1: { // INT8
        const v = this.view.getInt8(this.offset);
        this.offset += 1;
        return v;
      }
      case 2: { // UINT16
        const v = this.view.getUint16(this.offset, this.isLittleEndian);
        this.offset += 2;
        return v;
      }
      case 3: { // INT16
        const v = this.view.getInt16(this.offset, this.isLittleEndian);
        this.offset += 2;
        return v;
      }
      case 4: { // UINT32
        const v = this.view.getUint32(this.offset, this.isLittleEndian);
        this.offset += 4;
        return v;
      }
      case 5: { // INT32
        const v = this.view.getInt32(this.offset, this.isLittleEndian);
        this.offset += 4;
        return v;
      }
      case 6: { // FLOAT32
        const v = this.view.getFloat32(this.offset, this.isLittleEndian);
        this.offset += 4;
        return Number(v.toFixed(4));
      }
      case 7: { // BOOL
        const v = this.view.getUint8(this.offset) !== 0;
        this.offset += 1;
        return v;
      }
      case 8: { // STRING
        return this.readString();
      }
      case 9: { // ARRAY
        const itemType = this.view.getUint32(this.offset, this.isLittleEndian);
        this.offset += 4;
        const arrayLen = Number(this.readUint64());
        const items: any[] = [];
        const maxItems = Math.min(arrayLen, 10);
        for (let j = 0; j < maxItems; j++) {
          items.push(this.readValue(itemType));
        }
        if (arrayLen > maxItems) {
          items.push(`... (+${arrayLen - maxItems} more)`);
        }
        return items;
      }
      case 10: { // UINT64
        return Number(this.readUint64());
      }
      case 11: { // INT64
        return Number(this.readUint64());
      }
      case 12: { // FLOAT64
        const v = this.view.getFloat64(this.offset, this.isLittleEndian);
        this.offset += 8;
        return Number(v.toFixed(4));
      }
      default:
        return `<Unknown Type ${type}>`;
    }
  }
}

export function parseGgufFromBuffer(buffer: ArrayBuffer): GgufHeaderMetadata {
  const parser = new GgufParser(buffer);
  return parser.parse();
}
