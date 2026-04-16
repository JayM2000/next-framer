import zxcvbn from 'zxcvbn';

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHAR_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export function generatePassword(options: PasswordOptions): string {
  let chars = '';
  const required: string[] = [];

  if (options.lowercase) {
    chars += CHAR_SETS.lowercase;
    required.push(CHAR_SETS.lowercase[Math.floor(Math.random() * CHAR_SETS.lowercase.length)]);
  }
  if (options.uppercase) {
    chars += CHAR_SETS.uppercase;
    required.push(CHAR_SETS.uppercase[Math.floor(Math.random() * CHAR_SETS.uppercase.length)]);
  }
  if (options.numbers) {
    chars += CHAR_SETS.numbers;
    required.push(CHAR_SETS.numbers[Math.floor(Math.random() * CHAR_SETS.numbers.length)]);
  }
  if (options.symbols) {
    chars += CHAR_SETS.symbols;
    required.push(CHAR_SETS.symbols[Math.floor(Math.random() * CHAR_SETS.symbols.length)]);
  }

  if (!chars) {
    chars = CHAR_SETS.lowercase + CHAR_SETS.uppercase + CHAR_SETS.numbers;
  }

  const remaining = options.length - required.length;
  const passArray = [...required];

  for (let i = 0; i < remaining; i++) {
    passArray.push(chars[Math.floor(Math.random() * chars.length)]);
  }

  // Shuffle
  for (let i = passArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passArray[i], passArray[j]] = [passArray[j], passArray[i]];
  }

  return passArray.join('');
}

export interface StrengthResult {
  score: number;       // 0-4
  label: string;
  color: string;
  percent: number;
}

export function evaluateStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: 'N/A', color: '#444', percent: 0 };

  const result = zxcvbn(password);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
  const percents = [10, 30, 55, 80, 100];

  return {
    score: result.score,
    label: labels[result.score],
    color: colors[result.score],
    percent: percents[result.score],
  };
}
