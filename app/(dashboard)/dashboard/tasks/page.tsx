'use client'

import * as React from 'react'
import { Plus, Filter, Search, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dropdown, type DropdownMenuItem } from '@/components/ui/Dropdown'

/**
 * Tasks page
 * Manage and view all tasks
 */
export default function TasksPage() {
  const [searchQuery, setSearchQuery] = React.useState('')

  // TODO: Fetch real tasks from API
  const tasks = [
    {
      id: '1',
      title: 'Review Q4 marketing strategy',
      description: 'Analyze performance metrics and prepare recommendations',
      status: 'in_progress' as const,
      priority: 'high',
      dueDate: '2025-11-20',
      assignee: 'AI Agent',
    },
    {
      id: '2',
      title: 'Update client proposal',
      description: 'Incorporate feedback from last meeting',
      status: 'todo' as const,
      priority: 'medium',
      dueDate: '2025-11-18',
      assignee: 'You',
    },
    {
      id: '3',
      title: 'Prepare monthly report',
      description: 'Compile data and create presentation',
      status: 'completed' as const,
      priority: 'low',
      dueDate: '2025-11-15',
      assignee: 'You',
    },
  ]

  const taskActions: DropdownMenuItem[] = [
    { id: 'edit', label: 'Edit', onClick: () => console.log('Edit') },
    { id: 'duplicate', label: 'Duplicate', onClick: () => console.log('Duplicate') },
    { id: 'separator', label: '', separator: true },
    { id: 'delete', label: 'Delete', onClick: () => console.log('Delete') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Tasks</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Manage your tasks and track progress
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
          New Task
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search tasks..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" leftIcon={<Filter className="h-5 w-5" />}>
            Filter
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.id} hoverable>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {task.title}
                    </h3>
                    <Badge variant={task.status}>{task.status.replace('_', ' ')}</Badge>
                    <Badge
                      variant={
                        task.priority === 'high'
                          ? 'danger'
                          : task.priority === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {task.description}
                  </p>
                  <div className="mt-4 flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>Assignee: {task.assignee}</span>
                  </div>
                </div>
                <Dropdown
                  trigger={
                    <button className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  }
                  items={taskActions}
                  align="right"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (if no tasks) */}
      {tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
              <Plus className="h-12 w-12 text-neutral-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              No tasks yet
            </h3>
            <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
              Get started by creating your first task
            </p>
            <Button variant="primary" className="mt-6" leftIcon={<Plus className="h-5 w-5" />}>
              Create Task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
