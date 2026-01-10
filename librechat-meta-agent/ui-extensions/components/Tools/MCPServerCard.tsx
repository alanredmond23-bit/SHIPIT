'use client';

import { useState } from 'react';
import {
  Server,
  Power,
  PowerOff,
  Settings,
  Wrench,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  ExternalLink,
  Github,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import type { MCPServerWithTools } from '@/hooks/useMCPServers';

// ============================================================================
// Types
// ============================================================================

interface MCPServerCardProps {
  server: MCPServerWithTools;
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
  onToggleConnection?: () => Promise<void>;
  onSettings?: () => void;
}

// ============================================================================
// Category & Status Config
// ============================================================================

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  productivity: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  development: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  data: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  communication: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ai: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  utility: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  running: { color: 'text-green-500', icon: CheckCircle, label: 'Connected' },
  installed: { color: 'text-stone-400', icon: Circle, label: 'Installed' },
  available: { color: 'text-stone-300', icon: Circle, label: 'Available' },
  error: { color: 'text-red-500', icon: AlertCircle, label: 'Error' },
  updating: { color: 'text-amber-500', icon: Loader2, label: 'Updating' },
};

// ============================================================================
// MCPServerCard Component
// ============================================================================

export function MCPServerCard({
  server,
  viewMode = 'grid',
  onClick,
  onToggleConnection,
  onSettings,
}: MCPServerCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const categoryStyle = CATEGORY_COLORS[server.category] || CATEGORY_COLORS.utility;
  const statusConfig = STATUS_CONFIG[server.status] || STATUS_CONFIG.available;
  const StatusIcon = statusConfig.icon;

  const handleToggleConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleConnection || isConnecting) return;

    setIsConnecting(true);
    try {
      await onToggleConnection();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSettings?.();
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Grid View
  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={clsx(
          'bg-white rounded-xl border border-stone-200 p-4 transition-all cursor-pointer',
          'hover:shadow-md hover:border-stone-300',
          server.status === 'running' && 'ring-1 ring-green-500/20 border-green-200',
          server.status === 'error' && 'ring-1 ring-red-500/20 border-red-200'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Server Icon */}
            <div
              className={clsx(
                'p-2.5 rounded-lg',
                server.status === 'running' ? 'bg-green-100' : 'bg-stone-100'
              )}
            >
              <Server
                className={clsx(
                  'w-5 h-5',
                  server.status === 'running' ? 'text-green-600' : 'text-stone-500'
                )}
              />
            </div>

            {/* Status Indicator */}
            <StatusIcon
              className={clsx(
                'w-4 h-4',
                statusConfig.color,
                server.status === 'updating' && 'animate-spin'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleConnection}
              disabled={isConnecting}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                server.status === 'running'
                  ? 'hover:bg-red-50 text-red-500'
                  : 'hover:bg-green-50 text-green-500'
              )}
              title={server.status === 'running' ? 'Disconnect' : 'Connect'}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : server.status === 'running' ? (
                <PowerOff className="w-4 h-4" />
              ) : (
                <Power className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleSettingsClick}
              className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Name & Description */}
        <h3 className="font-semibold text-stone-900 mb-1">{server.name}</h3>
        <p className="text-sm text-stone-500 line-clamp-2 mb-3">{server.description}</p>

        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
              categoryStyle.bg,
              categoryStyle.text
            )}
          >
            {server.category}
          </span>
          <span className="text-xs text-stone-400">{server.provider}</span>
        </div>

        {/* Tools Count */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Wrench className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {server.tools?.length || 0} tools
            </span>
          </div>

          {/* Last Sync */}
          <div className="flex items-center gap-1.5 text-stone-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{formatLastSync(server.lastHealthCheck)}</span>
          </div>
        </div>

        {/* Features Preview */}
        {server.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {server.features.slice(0, 3).map((feature, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-stone-100 rounded text-xs text-stone-500"
              >
                {feature}
              </span>
            ))}
            {server.features.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-stone-400">
                +{server.features.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-stone-200 p-4 transition-all cursor-pointer',
        'hover:shadow-md hover:border-stone-300',
        server.status === 'running' && 'ring-1 ring-green-500/20 border-green-200',
        server.status === 'error' && 'ring-1 ring-red-500/20 border-red-200'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={clsx(
            'p-3 rounded-lg shrink-0',
            server.status === 'running' ? 'bg-green-100' : 'bg-stone-100'
          )}
        >
          <Server
            className={clsx(
              'w-6 h-6',
              server.status === 'running' ? 'text-green-600' : 'text-stone-500'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-stone-900">{server.name}</h3>
            <StatusIcon
              className={clsx(
                'w-4 h-4 shrink-0',
                statusConfig.color,
                server.status === 'updating' && 'animate-spin'
              )}
            />
            <span
              className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0',
                categoryStyle.bg,
                categoryStyle.text
              )}
            >
              {server.category}
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1 line-clamp-1">{server.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-stone-500">
              <Wrench className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{server.tools?.length || 0} tools</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{formatLastSync(server.lastHealthCheck)}</span>
            </div>
            <span className="text-xs text-stone-400">{server.provider}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {server.githubUrl && (
            <a
              href={server.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={handleToggleConnection}
            disabled={isConnecting}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              server.status === 'running'
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            )}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : server.status === 'running' ? (
              <>
                <PowerOff className="w-4 h-4" />
                Disconnect
              </>
            ) : (
              <>
                <Power className="w-4 h-4" />
                Connect
              </>
            )}
          </button>
          <button
            onClick={handleSettingsClick}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MCPServerCard;
