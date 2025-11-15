'use client'

import * as React from 'react'
import { Plus, Search, Play, Pause, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dropdown, type DropdownMenuItem } from '@/components/ui/Dropdown'

/**
 * Workflows page
 * View and manage automation workflows
 */
export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')

  // TODO: Fetch real workflows from API
  const workflows = [
    {
      id: '1',
      name: 'Content Creation Pipeline',
      description: 'Automated content generation and publishing workflow',
      status: 'active' as const,
      triggers: 3,
      actions: 7,
      lastRun: '2025-11-15T10:30:00',
      successRate: 95,
    },
    {
      id: '2',
      name: 'Email Processing',
      description: 'Classify and respond to incoming emails',
      status: 'active' as const,
      triggers: 1,
      actions: 4,
      lastRun: '2025-11-15T14:20:00',
      successRate: 98,
    },
    {
      id: '3',
      name: 'Social Media Scheduler',
      description: 'Schedule and post content across platforms',
      status: 'paused' as const,
      triggers: 2,
      actions: 5,
      lastRun: '2025-11-10T09:00:00',
      successRate: 92,
    },
  ]

  const workflowActions: DropdownMenuItem[] = [
    { id: 'edit', label: 'Edit', onClick: () => console.log('Edit') },
    { id: 'duplicate', label: 'Duplicate', onClick: () => console.log('Duplicate') },
    { id: 'view-logs', label: 'View Logs', onClick: () => console.log('View Logs') },
    { id: 'separator', label: '', separator: true },
    { id: 'delete', label: 'Delete', onClick: () => console.log('Delete') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Workflows
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Automate your work with intelligent workflows
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
          New Workflow
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search workflows..."
          leftIcon={<Search className="h-4 w-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />
      </div>

      {/* Workflows Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {workflows.map((workflow) => (
          <Card key={workflow.id} hoverable>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle>{workflow.name}</CardTitle>
                    <Badge variant={workflow.status === 'active' ? 'success' : 'default'} dot>
                      {workflow.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">{workflow.description}</CardDescription>
                </div>
                <Dropdown
                  trigger={
                    <button className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  }
                  items={workflowActions}
                  align="right"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Triggers</p>
                    <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {workflow.triggers}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Actions</p>
                    <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {workflow.actions}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Success</p>
                    <p className="mt-1 text-2xl font-bold text-success-600">
                      {workflow.successRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Last run: {new Date(workflow.lastRun).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    {workflow.status === 'active' ? (
                      <Button variant="outline" size="sm" leftIcon={<Pause className="h-4 w-4" />}>
                        Pause
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" leftIcon={<Play className="h-4 w-4" />}>
                        Resume
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (if no workflows) */}
      {workflows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
              <Plus className="h-12 w-12 text-neutral-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              No workflows yet
            </h3>
            <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
              Create your first workflow to automate your tasks
            </p>
            <Button variant="primary" className="mt-6" leftIcon={<Plus className="h-5 w-5" />}>
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
