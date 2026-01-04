'use client';

import React from 'react';
import {
  Settings,
  Power,
  Activity,
  Clock,
  BarChart2,
  ExternalLink,
  AlertCircle,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import type { MCPServer, MCPHealthStatus, MCPCategory } from './mcpServersData';
import { MCP_CATEGORIES } from './mcpServersData';

/**
 * MCPServerCard - Individual MCP server card component
 *
 * Features:
 * - Server icon/logo
 * - Name and description
 * - Category badge
 * - Enable/disable switch
 * - Health status dot
 * - Configure button
 * - Usage stats
 */

interface MCPServerCardProps {
  server: MCPServer;
  onToggle: (serverId: string, enabled: boolean) => void;
  onConfigure: (server: MCPServer) => void;
  onRefreshHealth: (serverId: string) => void;
  compact?: boolean;
}

// Health status colors and labels
const HEALTH_STATUS_CONFIG: Record<
  MCPHealthStatus,
  { color: string; bgColor: string; label: string }
> = {
  healthy: {
    color: 'bg-success',
    bgColor: 'bg-success/10',
    label: 'Healthy',
  },
  degraded: {
    color: 'bg-warning',
    bgColor: 'bg-warning/10',
    label: 'Degraded',
  },
  offline: {
    color: 'bg-error',
    bgColor: 'bg-error/10',
    label: 'Offline',
  },
  unknown: {
    color: 'bg-warm-400',
    bgColor: 'bg-warm-100',
    label: 'Unknown',
  },
};

// Category colors
const CATEGORY_COLORS: Record<MCPCategory, string> = {
  productivity: 'bg-teal-100 text-teal-700',
  development: 'bg-blue-100 text-blue-700',
  data: 'bg-purple-100 text-purple-700',
  ai: 'bg-pink-100 text-pink-700',
  web: 'bg-orange-100 text-orange-700',
  communication: 'bg-green-100 text-green-700',
  storage: 'bg-yellow-100 text-yellow-700',
  analytics: 'bg-red-100 text-red-700',
  security: 'bg-gray-100 text-gray-700',
  media: 'bg-indigo-100 text-indigo-700',
};

export default function MCPServerCard({
  server,
  onToggle,
  onConfigure,
  onRefreshHealth,
  compact = false,
}: MCPServerCardProps) {
  const healthConfig = HEALTH_STATUS_CONFIG[server.healthStatus];
  const categoryInfo = MCP_CATEGORIES[server.category];

  // Format time ago
  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Format number with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (compact) {
    // Compact list view
    return (
      <div
        className={clsx(
          'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
          server.enabled
            ? 'bg-teal-50/50 border-teal-200'
            : 'bg-white border-warm-200 hover:border-warm-300'
        )}
      >
        {/* Icon */}
        <div
          className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm',
            server.enabled ? 'bg-teal-500 text-white' : 'bg-warm-100 text-warm-600'
          )}
        >
          {server.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-warm-900 truncate">{server.name}</h4>
            <span
              className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                CATEGORY_COLORS[server.category]
              )}
            >
              {categoryInfo.label}
            </span>
          </div>
          <p className="text-sm text-warm-500 truncate">{server.description}</p>
        </div>

        {/* Health Status */}
        <div className="flex items-center gap-2">
          <div
            className={clsx('w-2 h-2 rounded-full', healthConfig.color)}
            title={healthConfig.label}
          />
          <span className="text-xs text-warm-500">
            {formatTimeAgo(server.lastHealthCheck)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {server.configRequired && (
            <button
              onClick={() => onConfigure(server)}
              className="p-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-600 transition-colors"
              title="Configure"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onToggle(server.id, !server.enabled)}
            className={clsx(
              'relative w-12 h-6 rounded-full transition-colors',
              server.enabled ? 'bg-teal-500' : 'bg-warm-300'
            )}
          >
            <div
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                server.enabled ? 'translate-x-7' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        server.enabled
          ? 'bg-white border-teal-200 shadow-soft'
          : 'bg-white border-warm-200 hover:border-warm-300'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-warm-100">
        <div className="flex items-start justify-between">
          {/* Icon and Name */}
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
                server.enabled
                  ? 'bg-teal-500 text-white'
                  : 'bg-warm-100 text-warm-600'
              )}
            >
              {server.icon}
            </div>
            <div>
              <h3 className="font-semibold text-warm-900">{server.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    CATEGORY_COLORS[server.category]
                  )}
                >
                  {categoryInfo.label}
                </span>
                <span className="text-xs text-warm-400">v{server.version}</span>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => onToggle(server.id, !server.enabled)}
            className={clsx(
              'relative w-14 h-7 rounded-full transition-colors',
              server.enabled ? 'bg-teal-500' : 'bg-warm-300'
            )}
          >
            <div
              className={clsx(
                'absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center',
                server.enabled ? 'translate-x-8' : 'translate-x-1'
              )}
            >
              {server.enabled ? (
                <Check className="w-3 h-3 text-teal-500" />
              ) : (
                <X className="w-3 h-3 text-warm-400" />
              )}
            </div>
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-warm-600 mt-3">{server.description}</p>
      </div>

      {/* Health Status */}
      <div className="px-4 py-3 bg-warm-50/50 border-b border-warm-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-warm-500" />
            <span className="text-sm text-warm-600">Health Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                healthConfig.bgColor,
                server.healthStatus === 'healthy' && 'text-success',
                server.healthStatus === 'degraded' && 'text-warning',
                server.healthStatus === 'offline' && 'text-error',
                server.healthStatus === 'unknown' && 'text-warm-500'
              )}
            >
              <div className={clsx('w-1.5 h-1.5 rounded-full', healthConfig.color)} />
              {healthConfig.label}
            </span>
            <button
              onClick={() => onRefreshHealth(server.id)}
              className="p-1 rounded hover:bg-warm-200 text-warm-500 transition-colors"
              title="Refresh health status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {server.lastHealthCheck && (
          <div className="flex items-center gap-1 mt-1 text-xs text-warm-400">
            <Clock className="w-3 h-3" />
            Last checked {formatTimeAgo(server.lastHealthCheck)}
          </div>
        )}
      </div>

      {/* Usage Stats (if available) */}
      {server.usageStats && server.enabled && (
        <div className="px-4 py-3 bg-warm-50/50 border-b border-warm-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-warm-500" />
            <span className="text-sm text-warm-600">Usage Stats</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-semibold text-warm-900">
                {formatNumber(server.usageStats.totalCalls)}
              </p>
              <p className="text-xs text-warm-500">Total Calls</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-success">
                {server.usageStats.successRate}%
              </p>
              <p className="text-xs text-warm-500">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-warm-900">
                {server.usageStats.avgLatency}ms
              </p>
              <p className="text-xs text-warm-500">Avg Latency</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex items-center gap-2">
        {server.configRequired && (
          <button
            onClick={() => onConfigure(server)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              server.enabled
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            )}
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        )}
        {server.documentation && (
          <a
            href={server.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-600 text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Docs
          </a>
        )}
      </div>

      {/* Config Required Warning */}
      {server.enabled && server.configRequired && !server.lastHealthCheck && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Configuration Required</p>
              <p className="text-xs text-warm-600 mt-0.5">
                Please configure API credentials to enable this integration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { MCPServerCard };
export type { MCPServerCardProps };
