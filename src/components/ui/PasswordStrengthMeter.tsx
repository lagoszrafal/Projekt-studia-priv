import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

const LOWERCASE_POOL = 26; // a-z
const UPPERCASE_POOL = 26; // A-Z
const DIGITS_POOL = 10;    // 0-9
const SPECIAL_POOL = 26;   // typowe znaki specjalne ASCII

const ASCII_SPECIAL_CHARS = new Set(
  '!@#$%^&*()-_=+[]{};:,.<>/?'.split('')
);

export function calculatePasswordEntropy(password: string): {
  length: number;
  poolSize: number;
  entropyBits: number;
} {
  const length = password.length;

  if (length === 0) {
    return { length: 0, poolSize: 0, entropyBits: 0 };
  }

  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSpecial = false;

  for (const char of password) {
    if (char >= 'a' && char <= 'z') {
      hasLower = true;
    } else if (char >= 'A' && char <= 'Z') {
      hasUpper = true;
    } else if (char >= '0' && char <= '9') {
      hasDigit = true;
    } else if (ASCII_SPECIAL_CHARS.has(char)) {
      hasSpecial = true;
    }
  }

  let poolSize = 0;
  if (hasLower) poolSize += LOWERCASE_POOL;
  if (hasUpper) poolSize += UPPERCASE_POOL;
  if (hasDigit) poolSize += DIGITS_POOL;
  if (hasSpecial) poolSize += SPECIAL_POOL;

  if (poolSize === 0) {
    poolSize = LOWERCASE_POOL + UPPERCASE_POOL + DIGITS_POOL + SPECIAL_POOL;
  }

  const entropyBits = length * Math.log2(poolSize);

  return {
    length,
    poolSize,
    entropyBits,
  };
}

export function entropyToScore(entropyBits: number, length: number): number {
  if (length === 0) return 0;
  if (entropyBits < 40) return 1;
  if (entropyBits < 60) return 2;
  if (entropyBits < 80) return 3;
  if (entropyBits < 120) return 4;
  return 5;
}

function scoreToStrengthLabel(score: number): string {
  if (score <= 0) return 'Brak hasła';
  if (score === 1) return 'Bardzo słabe';
  if (score === 2) return 'Słabe';
  if (score === 3) return 'Dobre';
  if (score === 4) return 'Silne';
  return 'Bardzo silne';
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { colors, spacing, typography } = useTheme();
  const passwordScore = calculatePasswordEntropy(password);
  const score = entropyToScore(passwordScore.entropyBits, passwordScore.length);
  const label = 'Entropia hasła: ' + passwordScore.entropyBits.toFixed(2) + ' bitów';
  return <View style={{ gap: spacing.sm }}><View style={styles.row}>{[1, 2, 3, 4, 5].map((item) => <View key={item} style={[styles.bar, { backgroundColor: item <= score ? colors.accent : colors.border }]} />)}</View><Text style={[typography.caption, { color: colors.textSecondary }]}>Siła hasła: {scoreToStrengthLabel(score)}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 6 }, bar: { flex: 1, height: 4, borderRadius: 4 } });