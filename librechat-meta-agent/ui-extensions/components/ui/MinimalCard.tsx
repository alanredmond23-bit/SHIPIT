'use client';

import React from 'react';
import { Check, Download, ExternalLink } from 'lucide-react';

interface MinimalCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
  onDownload?: () => void;
  onView?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function MinimalCard({
  title,
  subtitle,
  meta,
  selected = false,
  selectable = false,
  onSelect,
  onDownload,
  onView,
  children,
  className = '',
}: MinimalCardProps) {
  return (
    <div
      className={`
        bg-white border rounded-xl p-5 transition-all duration-200
        ${selected
          ? 'border-teal-500 bg-teal-50/30'
          : 'border-warm-200 hover:border-warm-300'
        }
        ${selectable ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={selectable ? onSelect : undefined}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-medium text-warm-900 text-base leading-snug">
          {title}
        </h3>
        {subtitle && (
          <p className="text-warm-500 text-sm mt-1">{subtitle}</p>
        )}
        {meta && (
          <p className="text-warm-400 text-xs mt-2 uppercase tracking-wide">
            {meta}
          </p>
        )}
      </div>

      {/* Content */}
      {children && <div className="mb-4">{children}</div>}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-auto pt-4">
        {selectable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
              ${selected
                ? 'bg-teal-500 text-white'
                : 'bg-warm-100 text-warm-400 hover:bg-warm-200'
              }
            `}
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            <Check className="w-4 h-4" />
          </button>
        )}

        {onDownload && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="w-9 h-9 rounded-full bg-warm-100 hover:bg-warm-200 flex items-center justify-center transition-colors"
            aria-label="Download"
          >
            <Download className="w-4 h-4 text-warm-600" />
          </button>
        )}

        {onView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="w-9 h-9 rounded-full bg-warm-100 hover:bg-warm-200 flex items-center justify-center transition-colors"
            aria-label="View"
          >
            <ExternalLink className="w-4 h-4 text-warm-600" />
          </button>
        )}
      </div>
    </div>
  );
}

export default MinimalCard;
