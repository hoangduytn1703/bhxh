import type { User } from '@supabase/supabase-js';
import { User as UserIcon } from 'lucide-react';
import { getAvatarUrl, getDisplayName } from '../lib/userProfile';
import { cn } from '../lib/utils';

type UserAvatarProps = {
  user: User | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-xl',
  lg: 'w-24 h-24 text-3xl',
};

export function UserAvatar({ user, size = 'sm', className }: UserAvatarProps) {
  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);
  const initial = displayName.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={cn(
          'rounded-full object-cover border-2 border-blue-100 shadow-sm',
          sizeMap[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border-2 border-blue-100 shadow-sm',
        sizeMap[size],
        className
      )}
    >
      {initial || <UserIcon className="w-1/2 h-1/2" />}
    </div>
  );
}
