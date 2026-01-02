'use client';

import React from 'react';
import { UserPresence } from '../../lib/realtime/use-realtime';

/**
 * Props for PresenceAvatars component
 */
export interface PresenceAvatarsProps {
  members: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
  onMemberClick?: (member: UserPresence) => void;
}

/**
 * Get initials from name
 */
function getInitials(name?: string): string {
  if (!name) return '?';

  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Get color for user based on userId
 */
function getUserColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-violet-500',
  ];

  // Generate consistent color index from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get status color
 */
function getStatusColor(status?: string): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Get size classes
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        avatar: 'w-8 h-8 text-xs',
        status: 'w-2 h-2',
        overlap: '-ml-2',
      };
    case 'lg':
      return {
        avatar: 'w-12 h-12 text-base',
        status: 'w-3.5 h-3.5',
        overlap: '-ml-3',
      };
    case 'md':
    default:
      return {
        avatar: 'w-10 h-10 text-sm',
        status: 'w-3 h-3',
        overlap: '-ml-2.5',
      };
  }
}

/**
 * Single avatar component
 */
function Avatar({
  member,
  size,
  showStatus,
  onClick,
}: {
  member: UserPresence;
  size: 'sm' | 'md' | 'lg';
  showStatus: boolean;
  onClick?: () => void;
}) {
  const sizeClasses = getSizeClasses(size);
  const color = getUserColor(member.userId);
  const name = member.metadata?.name || member.userId;
  const initials = getInitials(name);
  const statusColor = getStatusColor(member.status);

  return (
    <div
      className={`relative inline-block ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      title={`${name} (${member.status || 'online'})`}
    >
      <div
        className={`
          ${sizeClasses.avatar}
          ${color}
          rounded-full
          flex items-center justify-center
          text-white font-semibold
          border-2 border-white
          shadow-sm
          transition-transform hover:scale-110
        `}
      >
        {member.metadata?.avatar ? (
          <img
            src={member.metadata.avatar}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showStatus && (
        <div
          className={`
            absolute bottom-0 right-0
            ${sizeClasses.status}
            ${statusColor}
            rounded-full
            border-2 border-white
          `}
          aria-label={member.status || 'online'}
        />
      )}
    </div>
  );
}

/**
 * PresenceAvatars Component
 *
 * Displays online users with their avatars in a horizontal row.
 * Shows status indicators and handles overflow with a "+N" counter.
 */
export function PresenceAvatars({
  members,
  maxVisible = 5,
  size = 'md',
  showStatus = true,
  className = '',
  onMemberClick,
}: PresenceAvatarsProps) {
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = Math.max(0, members.length - maxVisible);
  const sizeClasses = getSizeClasses(size);

  if (members.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        {visibleMembers.map((member, index) => (
          <div
            key={member.clientId}
            className={index > 0 ? sizeClasses.overlap : ''}
            style={{ zIndex: visibleMembers.length - index }}
          >
            <Avatar
              member={member}
              size={size}
              showStatus={showStatus}
              onClick={onMemberClick ? () => onMemberClick(member) : undefined}
            />
          </div>
        ))}

        {remainingCount > 0 && (
          <div
            className={`
              ${sizeClasses.avatar}
              ${sizeClasses.overlap}
              bg-gray-300
              rounded-full
              flex items-center justify-center
              text-gray-700 font-semibold
              border-2 border-white
              shadow-sm
            `}
            title={`${remainingCount} more ${remainingCount === 1 ? 'person' : 'people'}`}
          >
            <span>+{remainingCount}</span>
          </div>
        )}
      </div>

      <div className="ml-3 text-sm text-gray-600">
        {members.length === 1 ? '1 person' : `${members.length} people`} online
      </div>
    </div>
  );
}

/**
 * PresenceList Component
 *
 * Alternative vertical list view of online users
 */
export function PresenceList({
  members,
  className = '',
  onMemberClick,
}: {
  members: UserPresence[];
  className?: string;
  onMemberClick?: (member: UserPresence) => void;
}) {
  if (members.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No one else is here
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {members.map((member) => {
        const name = member.metadata?.name || member.userId;
        const color = getUserColor(member.userId);
        const initials = getInitials(name);
        const statusColor = getStatusColor(member.status);

        return (
          <div
            key={member.clientId}
            className={`
              flex items-center gap-3 p-2 rounded-lg
              ${onMemberClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            `}
            onClick={onMemberClick ? () => onMemberClick(member) : undefined}
          >
            <div className="relative">
              <div
                className={`
                  w-10 h-10
                  ${color}
                  rounded-full
                  flex items-center justify-center
                  text-white font-semibold text-sm
                `}
              >
                {member.metadata?.avatar ? (
                  <img
                    src={member.metadata.avatar}
                    alt={name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div
                className={`
                  absolute bottom-0 right-0
                  w-3 h-3
                  ${statusColor}
                  rounded-full
                  border-2 border-white
                `}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {name}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {member.status || 'online'}
                {member.metadata?.currentView && (
                  <span className="ml-1">
                    · {member.metadata.currentView.name || member.metadata.currentView.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PresenceAvatars;
