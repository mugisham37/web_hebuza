// Minimal STORE-only (no compression) zip writer: PDFs/images are already compressed, so deflate buys little.
// shortcut: no ZIP64, so total < 4 GB and < 65k files; switch to a server-side bundle if that ever matters.

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;
    // flag 0x0800 = UTF-8 file names
    const local = new DataView(new ArrayBuffer(30));
    [
      [0, 0x04034b50, 4],
      [4, 20, 2],
      [6, 0x0800, 2],
      [14, crc, 4],
      [18, size, 4],
      [22, size, 4],
      [26, name.length, 2],
    ].forEach(([o, v, w]) =>
      w === 4 ? local.setUint32(o, v, true) : local.setUint16(o, v, true),
    );
    const cen = new DataView(new ArrayBuffer(46));
    [
      [0, 0x02014b50, 4],
      [4, 20, 2],
      [6, 20, 2],
      [8, 0x0800, 2],
      [16, crc, 4],
      [20, size, 4],
      [24, size, 4],
      [28, name.length, 2],
      [42, offset, 4],
    ].forEach(([o, v, w]) =>
      w === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true),
    );
    parts.push(local.buffer, name, f.data as Uint8Array<ArrayBuffer>);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + size;
  }
  const cenSize = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  return new Blob(
    [...parts, ...(central as Uint8Array<ArrayBuffer>[]), end.buffer],
    { type: "application/zip" },
  );
}

/** Save a Blob via a temporary object URL. */
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
