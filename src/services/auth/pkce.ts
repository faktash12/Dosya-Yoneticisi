const base64UrlEncodeBytes = (bytes: number[]): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const triplet = (first << 16) | (second << 8) | third;

    output += chars[(triplet >> 18) & 63];
    output += chars[(triplet >> 12) & 63];
    output += index + 1 < bytes.length ? chars[(triplet >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? chars[triplet & 63] : '=';
  }

  return output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const rightRotate = (value: number, amount: number): number =>
  (value >>> amount) | (value << (32 - amount));

const sha256 = (input: string): number[] => {
  const bytes = Array.from(unescape(encodeURIComponent(input))).map(character =>
    character.charCodeAt(0),
  );
  const bitLength = bytes.length * 8;
  bytes.push(0x80);

  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  for (let index = 7; index >= 0; index -= 1) {
    bytes.push((bitLength / Math.pow(2, index * 8)) & 0xff);
  }

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
    0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
    0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
    0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
    0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
    0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(64).fill(0);

    for (let index = 0; index < 16; index += 1) {
      words[index] =
        ((bytes[offset + index * 4] ?? 0) << 24) |
        ((bytes[offset + index * 4 + 1] ?? 0) << 16) |
        ((bytes[offset + index * 4 + 2] ?? 0) << 8) |
        (bytes[offset + index * 4 + 3] ?? 0);
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rightRotate(words[index - 15] ?? 0, 7) ^
        rightRotate(words[index - 15] ?? 0, 18) ^
        ((words[index - 15] ?? 0) >>> 3);
      const s1 =
        rightRotate(words[index - 2] ?? 0, 17) ^
        rightRotate(words[index - 2] ?? 0, 19) ^
        ((words[index - 2] ?? 0) >>> 10);
      words[index] =
        (((words[index - 16] ?? 0) + s0 + (words[index - 7] ?? 0) + s1) |
          0) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e ?? 0, 6) ^ rightRotate(e ?? 0, 11) ^ rightRotate(e ?? 0, 25);
      const ch = ((e ?? 0) & (f ?? 0)) ^ (~(e ?? 0) & (g ?? 0));
      const temp1 = (((h ?? 0) + s1 + ch + (constants[index] ?? 0) + (words[index] ?? 0)) | 0) >>> 0;
      const s0 = rightRotate(a ?? 0, 2) ^ rightRotate(a ?? 0, 13) ^ rightRotate(a ?? 0, 22);
      const maj = ((a ?? 0) & (b ?? 0)) ^ ((a ?? 0) & (c ?? 0)) ^ ((b ?? 0) & (c ?? 0));
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (((d ?? 0) + temp1) | 0) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    [a, b, c, d, e, f, g, h].forEach((value, index) => {
      hash[index] = (((hash[index] ?? 0) + (value ?? 0)) | 0) >>> 0;
    });
  }

  const digest: number[] = [];
  hash.forEach(value => {
    digest.push((value >>> 24) & 0xff);
    digest.push((value >>> 16) & 0xff);
    digest.push((value >>> 8) & 0xff);
    digest.push(value & 0xff);
  });

  return digest;
};

export const createCodeVerifier = (): string => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from({length: 64})
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('');
};

export const createPkceChallenge = (verifier: string): string =>
  base64UrlEncodeBytes(sha256(verifier));

export const createOAuthState = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
