const MAX_REGEX_LENGTH = 500;

export function validateRegex(pattern: string): { valid: boolean; error?: string } {
  if (!pattern) return { valid: false, error: 'Empty pattern' };
  if (pattern.length > MAX_REGEX_LENGTH)
    return { valid: false, error: `Pattern exceeds ${MAX_REGEX_LENGTH} characters` };

  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid regex' };
  }
}

export function safeRegexTest(pattern: string, input: string): boolean {
  const validation = validateRegex(pattern);
  if (!validation.valid) return false;

  try {
    const re = new RegExp(pattern);
    return re.test(input);
  } catch {
    return false;
  }
}

export function extractCaptureGroup(
  pattern: string,
  input: string,
  groupIndex: number,
): string | null {
  const validation = validateRegex(pattern);
  if (!validation.valid) return null;

  try {
    const re = new RegExp(pattern);
    const match = re.exec(input);
    if (!match) return null;
    if (groupIndex < 0 || groupIndex >= match.length) return null;
    return match[groupIndex] ?? null;
  } catch {
    return null;
  }
}

export function applyTransform(value: string, transform: string): string {
  switch (transform) {
    case 'lowercase':
      return value.toLowerCase();
    case 'uppercase':
      return value.toUpperCase();
    case 'title_case':
      return value.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'trim':
      return value.trim();
    default:
      return value;
  }
}
