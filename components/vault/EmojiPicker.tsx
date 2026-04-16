'use client';

const EMOJIS = [
  '😊', '😂', '🥰', '😎', '🤔', '😢', '😡', '🥳', '😴', '🤯',
  '👍', '👎', '👋', '🙏', '💪', '🤝', '✌️', '🤞', '👏', '🫡',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💖',
  '⭐', '🌟', '✨', '💫', '🔥', '💥', '⚡', '🌈', '☀️', '🌙',
  '🚀', '✅', '❌', '⚠️', '💡', '🐛', '🎯', '📦', '🔐', '🔑',
  '🌐', '💻', '🧪', '🛠️', '📝', '🎨', '♻️', '🗑️', '📌', '🔖',
  '📋', '📊', '📈', '📉', '🗂️', '📁', '🏷️', '🔍', '🔗', '💾',
  '🎉', '🎊', '🎁', '🏆', '🥇', '🎵', '🎶', '☕', '🍕', '🍝',
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-[280px] rounded-xl border border-[var(--vault-border)] bg-[var(--vault-panel)] p-2 shadow-xl">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-[var(--vault-muted)]">Emoji</span>
        <button onClick={onClose} className="text-xs text-[var(--vault-muted)] hover:text-[var(--vault-text)]">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((emoji, i) => (
          <button
            type="button"
            key={i}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-[var(--vault-glass-hover)] transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
