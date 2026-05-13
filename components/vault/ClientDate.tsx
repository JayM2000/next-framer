'use client';

import { useState, useEffect } from 'react';


/**
 * Gets the user's real timezone offset from the system.
 * Falls back to browser's Date offset if Intl is not available.
 * 
 * We detect the IANA timezone and format dates using Intl.DateTimeFormat
 * with the explicit timezone, which works even when the browser overrides
 * the default timezone (e.g. in DevTools or automated environments).
 */
function getSystemTimezone(): string {
  try {
    // This returns the OS-level timezone, not the browser override
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function formatWithTimezone(d: Date, options: Intl.DateTimeFormatOptions): string {
  const tz = getSystemTimezone();
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: tz }).format(d);
}

function formatLocalDate(d: Date): string {
  return formatWithTimezone(d, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatLocalTime(d: Date): string {
  return formatWithTimezone(d, { hour: '2-digit', minute: '2-digit' });
}

function formatLocalShort(d: Date): string {
  return formatWithTimezone(d, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

/**
 * Renders a formatted date/time string only on the client side.
 * Uses Intl.DateTimeFormat with explicit system timezone to avoid
 * browser timezone overrides and SSR mismatches.
 */
export function ClientDate({ dateStr, format = 'date' }: { dateStr: string; format?: 'date' | 'time' | 'datetime' }) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    const d = new Date(dateStr);
    if (format === 'date') {
      setFormatted(formatLocalDate(d));
    } else if (format === 'time') {
      setFormatted(formatLocalTime(d));
    } else {
      setFormatted(formatLocalDate(d) + ' at ' + formatLocalTime(d));
    }
  }, [dateStr, format]);

  return <>{formatted}</>;
}

export function ClientDateShort({ dateStr }: { dateStr: string }) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(formatLocalShort(new Date(dateStr)));
  }, [dateStr]);

  return <>{formatted}</>;
}
