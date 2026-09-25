export async function createSha256DecisionId(canonicalPayload: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalPayload);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}
