'use client';

import { ChevronRight } from 'lucide-react';

interface BreadcrumbNavProps {
  items: { label: string; onClick?: () => void }[];
}

export default function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-[var(--vault-muted)] mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-[var(--vault-text)] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[var(--vault-text)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
