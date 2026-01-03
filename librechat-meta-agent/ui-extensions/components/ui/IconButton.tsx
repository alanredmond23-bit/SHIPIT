'use client';

import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'teal';
  label: string;
  className?: string;
}

export function IconButton({
  icon,
  onClick,
  disabled = false,
  size = 'md',
  variant = 'default',
  label,
  className = '',
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    default: 'bg-warm-100 hover:bg-warm-200 text-warm-600',
    ghost: 'bg-transparent hover:bg-warm-100 text-warm-500',
    teal: 'bg-teal-500 hover:bg-teal-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full
        flex items-center justify-center
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </button>
  );
}

export default IconButton;
