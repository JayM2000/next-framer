'use client';

import AvatarCircle from '@/components/shared/AvatarCircle';
import type { PresenceEntry } from '@/lib/vault/types';

interface PresenceBarProps {
  viewers: PresenceEntry[];
  currentUserId?: string | null;
}

export default function PresenceBar({ viewers, currentUserId }: PresenceBarProps) {
  if (viewers.length === 0) return null;

  const editing = viewers.filter(v => v.isEditing);
  const viewing = viewers.filter(v => !v.isEditing);

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--vault-muted)]">
      {/* Viewing avatars */}
      {viewing.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--vault-muted)]">👁</span>
          <div className="flex items-center">
            {viewing.slice(0, 5).map((v, i) => (
              <AvatarCircle
                key={v.viewerId}
                displayName={
                  v.userId === currentUserId
                    ? `${v.displayName} (you)`
                    : v.displayName
                }
                color={v.avatarColor}
                size={20}
                isStacked={i > 0}
              />
            ))}
          </div>
          {viewing.length > 5 && (
            <span className="text-[10px] text-[var(--vault-muted)] ml-1">
              +{viewing.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Editing indicator */}
      {editing.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span>✏️</span>
          <span className="text-[#22C55E]">
            {editing.map((v, i) => (
              <span key={v.viewerId}>
                {v.userId === currentUserId ? `${v.displayName} (you)` : v.displayName}
                {i < editing.length - 1 ? ', ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
