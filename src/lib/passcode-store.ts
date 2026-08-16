// In-memory store for verification passcodes, attached to globalThis to persist during hot reload

interface PasscodeEntry {
  code: string;
  petId: string;
  petName: string;
  expiresAt: number;
}

const globalForPasscodes = globalThis as unknown as {
  passcodeStore?: Map<string, PasscodeEntry>;
};

export const passcodeStore = globalForPasscodes.passcodeStore ?? new Map<string, PasscodeEntry>();
globalForPasscodes.passcodeStore = passcodeStore;

export function generateAndSavePasscode(petId: string, petName: string): string {
  // 6-digit random number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 15 minutes expiration
  const expiresAt = Date.now() + 15 * 60 * 1000;

  passcodeStore.set(petId, {
    code,
    petId,
    petName,
    expiresAt,
  });

  return code;
}

export function verifyPasscode(petId: string, inputCode: string): boolean {
  const entry = passcodeStore.get(petId);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    passcodeStore.delete(petId);
    return false;
  }

  if (entry.code.trim() === inputCode.trim()) {
    passcodeStore.delete(petId); // Invalidate once used
    return true;
  }

  return false;
}
