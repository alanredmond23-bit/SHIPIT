'use client';

import React from 'react';
import { Download, X, Trash2 } from 'lucide-react';
import { AccentButton } from './AccentButton';
import { IconButton } from './IconButton';

interface SelectionBarProps {
  count: number;
  onDownload?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  downloadLabel?: string;
  visible: boolean;
}

export function SelectionBar({
  count,
  onDownload,
  onDelete,
  onClear,
  downloadLabel = 'Download Selected',
  visible,
}: SelectionBarProps) {
  if (!visible || count === 0) return null;

  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2
        bg-white border border-warm-200
        rounded-full px-4 py-2
        shadow-lg
        flex items-center gap-4
        z-50
        animate-slideUp
      `}
    >
      {/* Selection count */}
      <span className="text-sm text-warm-600 font-medium">
        {count} selected
      </span>

      {/* Divider */}
      <div className="w-px h-6 bg-warm-200" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onDownload && (
          <AccentButton
            onClick={onDownload}
            size="sm"
            icon={<Download className="w-4 h-4" />}
          >
            {downloadLabel} ({count})
          </AccentButton>
        )}

        {onDelete && (
          <IconButton
            icon={<Trash2 />}
            onClick={onDelete}
            label="Delete selected"
            variant="ghost"
            size="sm"
          />
        )}

        <IconButton
          icon={<X />}
          onClick={onClear}
          label="Clear selection"
          variant="ghost"
          size="sm"
        />
      </div>
    </div>
  );
}

export default SelectionBar;
