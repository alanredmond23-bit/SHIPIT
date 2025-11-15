'use client'

import * as React from 'react'
import {
  CheckSquare,
  Workflow,
  Bot,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

/**
 * Dashboard home page
 * Overview with stats, quick actions, and recent activity
 */
export default function DashboardPage() {
  // TODO: Fetch real stats from API
  const stats = [
    {
      title: 'Total Tasks',
      value: '24',
      change: '+12%',
      trend: 'up',
      icon: CheckSquare,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      title: 'Active Workflows',
      value: '8',
      change: '+3',
      trend: 'up',
      icon: Workflow,
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50 dark:bg-secondary-900/20',
    },
    {
      title: 'AI Agents',
      value: '5',
      change: 'Stable',
      trend: 'neutral',
      icon: Bot,
      color: 'text-success-600',
      bgColor: 'bg-success-50 dark:bg-success-900/20',
    },
    {
      title: 'Completion Rate',
      value: '87%',
      change: '+5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
    },
  ]

  const recentTasks = [
    {
      id: '1',
      title: 'Review Q4 marketing strategy',
      status: 'in_progress' as const,
      dueDate: '2025-11-20',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Update client proposal',
      status: 'todo' as const,
      dueDate: '2025-11-18',
      priority: 'medium',
    },
    {
      id: '3',
      title: 'Prepare monthly report',
      status: 'completed' as const,
      dueDate: '2025-11-15',
      priority: 'low',
    },
  ]

  const quickActions = [
    { label: 'Create Task', icon: CheckSquare, href: '/dashboard/tasks' },
    { label: 'New Workflow', icon: Workflow, href: '/dashboard/workflows' },
    { label: 'Add AI Agent', icon: Bot, href: '/dashboard/agents' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Dashboard
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Welcome back! Here&apos;s what&apos;s happening with your work today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} hoverable>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                      {stat.value}
                    </p>
                    <p
                      className={`mt-2 flex items-center gap-1 text-sm ${
                        stat.trend === 'up' ? 'text-success-600' : 'text-neutral-500'
                      }`}
                    >
                      {stat.trend === 'up' && <TrendingUp className="h-4 w-4" />}
                      {stat.change}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  size="lg"
                  leftIcon={<Icon className="h-5 w-5" />}
                  className="justify-start"
                  onClick={() => {
                    window.location.href = action.href
                  }}
                >
                  {action.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Tasks</CardTitle>
                <CardDescription>Your latest task activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-success-600" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="h-5 w-5 text-primary-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {task.title}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={task.status}>{task.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary-600" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    <span className="font-medium">Workflow started:</span> Content Creation
                    Pipeline
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-success-600" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    <span className="font-medium">Task completed:</span> Review Q3 analytics
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    5 hours ago
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-secondary-600" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    <span className="font-medium">AI Agent deployed:</span> Email Classifier
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Yesterday
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-warning-600" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    <span className="font-medium">Workflow updated:</span> Social Media
                    Scheduler
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    2 days ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
