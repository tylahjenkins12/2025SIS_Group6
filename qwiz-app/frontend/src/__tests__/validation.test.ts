// Basic validation tests for common patterns

describe('Session Code Validation', () => {
  const isValidCode = (code: string) => {
    return /^[A-Z0-9]{6}$/.test(code);
  };

  it('validates 6-character alphanumeric codes', () => {
    expect(isValidCode('ABC123')).toBe(true);
    expect(isValidCode('XYZ789')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidCode('abc123')).toBe(false); // lowercase
    expect(isValidCode('ABC12')).toBe(false);  // too short
    expect(isValidCode('ABC1234')).toBe(false); // too long
    expect(isValidCode('ABC-12')).toBe(false); // special chars
  });
});

describe('Name Validation', () => {
  const isValidName = (name: string) => {
    return name.trim().length > 0 && name.trim().length <= 50;
  };

  it('accepts valid names', () => {
    expect(isValidName('John')).toBe(true);
    expect(isValidName('Alice Smith')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('a'.repeat(51))).toBe(false);
  });
});

describe('Score Calculation', () => {
  const calculateScore = (isCorrect: boolean, timeMs: number, maxTimeMs: number) => {
    if (!isCorrect) return 0;
    const baseScore = 100;
    const timeFactor = Math.max(0, 1 - timeMs / maxTimeMs);
    return Math.round(baseScore * timeFactor);
  };

  it('calculates score for correct answer', () => {
    // Fast answer (5 seconds out of 30)
    expect(calculateScore(true, 5000, 30000)).toBeGreaterThan(80);

    // Slow answer (25 seconds out of 30)
    expect(calculateScore(true, 25000, 30000)).toBeLessThan(20);

    // At deadline
    expect(calculateScore(true, 30000, 30000)).toBe(0);
  });

  it('returns zero for incorrect answer', () => {
    expect(calculateScore(false, 5000, 30000)).toBe(0);
    expect(calculateScore(false, 15000, 30000)).toBe(0);
  });

  it('handles edge cases', () => {
    // Instant answer
    expect(calculateScore(true, 0, 30000)).toBe(100);

    // Over time (shouldn't happen but handle gracefully)
    expect(calculateScore(true, 35000, 30000)).toBe(0);
  });
});
