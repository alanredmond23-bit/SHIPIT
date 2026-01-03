'use client';

import React from 'react';
import Link from 'next/link';

interface MinimalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  underline?: boolean;
  className?: string;
}

export function MinimalButton({
  children,
  onClick,
  href,
  disabled = false,
  icon,
  iconPosition = 'right',
  underline = true,
  className = '',
}: MinimalButtonProps) {
  const buttonClasses = `
    inline-flex items-center gap-2
    text-warm-800 font-medium text-sm
    transition-all duration-200
    hover:text-warm-900
    focus:outline-none focus:text-teal-600
    disabled:opacity-50 disabled:cursor-not-allowed
    group
    ${className}
  `;

  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <span className="transition-transform group-hover:-translate-x-0.5">
          {icon}
        </span>
      )}

      <span className={`relative ${underline ? 'pb-0.5' : ''}`}>
        {children}
        {underline && (
          <span
            className="
              absolute bottom-0 left-0 right-0 h-px
              bg-current
              transition-transform duration-200 origin-left
              group-hover:scale-x-0
            "
          />
        )}
      </span>

      {icon && iconPosition === 'right' && (
        <span className="transition-transform group-hover:translate-x-0.5">
          {icon}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {content}
    </button>
  );
}

export default MinimalButton;
