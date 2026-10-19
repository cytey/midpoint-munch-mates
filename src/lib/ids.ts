export const SESSION_ID_LENGTH = 20;
export const CREATOR_KEY_LENGTH = 40;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // excludes i, l, o, 0, 1 for readability

function randomId(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function generateSessionId(): string {
  return randomId(SESSION_ID_LENGTH);
}

export function generateCreatorKey(): string {
  return randomId(CREATOR_KEY_LENGTH);
}

export function isValidSessionId(id: string): boolean {
  return id.length === SESSION_ID_LENGTH && /^[a-z0-9]+$/.test(id);
}
