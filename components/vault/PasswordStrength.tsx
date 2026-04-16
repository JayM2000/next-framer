'use client';

import { evaluateStrength } from '@/lib/vault/passwordUtils';
import { motion } from 'framer-motion';

export default function PasswordStrength({ password }: { password: string }) {
  const result = evaluateStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--vault-glass)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: result.color }}
          initial={{ width: 0 }}
          animate={{ width: `${result.percent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs font-medium" style={{ color: result.color }}>
        {result.label}
      </p>
    </div>
  );
}
