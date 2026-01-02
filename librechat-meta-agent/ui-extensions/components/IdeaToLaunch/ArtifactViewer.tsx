'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Download,
  Edit3,
  History,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  RefreshCw,
} from 'lucide-react';

interface ArtifactRevision {
  version: number;
  content: string;
  change_summary?: string;
  revised_by: string;
  created_at: string;
}

interface PhaseArtifact {
  id: string;
  output_id: string;
  name: string;
  content: string;
  format: string;
  version: number;
  generated_by: string;
  ai_model?: string;
  revisions?: ArtifactRevision[];
  created_at: string;
  updated_at: string;
}

interface ArtifactViewerProps {
  artifact: PhaseArtifact;
  isEditing?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onSave?: (content: string) => void;
  onRegenerate?: () => void;
}

export function ArtifactViewer({
  artifact,
  isEditing = false,
  onClose,
  onEdit,
  onSave,
  onRegenerate,
}: ArtifactViewerProps) {
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extension =
      artifact.format === 'markdown'
        ? 'md'
        : artifact.format === 'typescript'
        ? 'ts'
        : artifact.format === 'json'
        ? 'json'
        : 'txt';

    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.name.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    onSave?.(editedContent);
  };

  const formatContent = (content: string, format: string) => {
    if (format === 'mermaid') {
      // In production, render Mermaid diagram
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      );
    }

    if (format === 'markdown') {
      // In production, render Markdown
      return (
        <div className="prose dark:prose-invert max-w-none">
          <pre className="text-sm whitespace-pre-wrap">{content}</pre>
        </div>
      );
    }

    if (format === 'json') {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return (
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content}
          </pre>
        );
      }
    }

    return (
      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
        {content}
      </pre>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {artifact.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                {artifact.generated_by === 'ai' ? (
                  <Sparkles className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                {artifact.generated_by === 'ai' ? 'AI Generated' : 'User Created'}
              </span>
              <span>v{artifact.version}</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {artifact.format}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            {artifact.revisions && artifact.revisions.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 transition-colors ${
                  showHistory
                    ? 'text-indigo-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="History"
              >
                <History className="w-5 h-5" />
              </button>
            )}
            {!isEditing && onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          ) : (
            formatContent(artifact.content, artifact.format)
          )}
        </div>

        {/* History Panel */}
        {showHistory && artifact.revisions && artifact.revisions.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-auto">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Revision History
            </h4>
            <div className="space-y-2">
              {artifact.revisions.map((revision) => (
                <div
                  key={revision.version}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      v{revision.version}
                    </span>
                    <span className="text-xs text-gray-500">
                      {revision.change_summary || 'No summary'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="capitalize">{revision.revised_by}</span>
                    <span>
                      {new Date(revision.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArtifactViewer;
