'use client';

interface AvatarCircleProps {
  displayName: string;
  color: string;
  size?: number;
  isEditing?: boolean;
  isStacked?: boolean;
}

export default function AvatarCircle({ 
  displayName, 
  color, 
  size = 24, 
  isEditing = false,
  isStacked = false 
}: AvatarCircleProps) {
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="relative shrink-0 flex items-center justify-center rounded-full font-semibold select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
        color: '#0d0d0d',
        border: '1.5px solid #0d0d0d',
        marginLeft: isStacked ? -6 : 0,
        zIndex: isStacked ? 1 : 'auto',
      }}
      title={`${displayName}${isEditing ? ' (editing)' : ''}`}
    >
      {initials}
      {isEditing && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#22C55E] border border-[#0d0d0d]"
          title="Editing"
        />
      )}
    </div>
  );
}
