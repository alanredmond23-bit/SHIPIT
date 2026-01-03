'use client';

import React from 'react';

interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  label,
  title,
  subtitle,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          {label && (
            <span className="inline-flex items-center gap-2 text-teal-600 text-sm font-medium uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              {label}
            </span>
          )}

          <h2 className="text-4xl font-light text-warm-900 tracking-tight leading-tight">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-3 text-warm-500 text-lg max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <div className="flex items-center gap-3 mt-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export default SectionHeader;
