'use client'

import * as React from 'react'
import { Plus, Search, Bot, Zap, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, type DropdownMenuItem } from '@/components/ui/Dropdown'

/**
 * AI Agents page
 * Manage and configure AI agents
 */
export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')

  // TODO: Fetch real agents from API
  const agents = [
    {
      id: '1',
      name: 'Content Classifier',
      description: 'Automatically categorizes and tags incoming content',
      model: 'GPT-4',
      status: 'active' as const,
      tasks: 156,
      accuracy: 96,
      avatar: '🏷️',
    },
    {
      id: '2',
      name: 'Email Responder',
      description: 'Drafts personalized email responses based on context',
      model: 'Claude 3.5',
      status: 'active' as const,
      tasks: 89,
      accuracy: 94,
      avatar: '📧',
    },
    {
      id: '3',
      name: 'Task Prioritizer',
      description: 'Analyzes and prioritizes tasks based on urgency and importance',
      model: 'GPT-4',
      status: 'active' as const,
      tasks: 234,
      accuracy: 98,
      avatar: '🎯',
    },
    {
      id: '4',
      name: 'Meeting Summarizer',
      description: 'Generates concise summaries from meeting transcripts',
      model: 'Claude 3.5',
      status: 'inactive' as const,
      tasks: 45,
      accuracy: 92,
      avatar: '📝',
    },
  ]

  const agentActions: DropdownMenuItem[] = [
    { id: 'configure', label: 'Configure', onClick: () => console.log('Configure') },
    { id: 'view-logs', label: 'View Logs', onClick: () => console.log('View Logs') },
    { id: 'duplicate', label: 'Duplicate', onClick: () => console.log('Duplicate') },
    { id: 'separator', label: '', separator: true },
    { id: 'delete', label: 'Delete', onClick: () => console.log('Delete') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            AI Agents
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Deploy and manage intelligent AI assistants
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
          New Agent
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search agents..."
          leftIcon={<Search className="h-4 w-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />
      </div>

      {/* Agents Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {agents.map((agent) => (
          <Card key={agent.id} hoverable>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar fallback={agent.avatar} size="lg" shape="square" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{agent.name}</CardTitle>
                      <Badge variant={agent.status === 'active' ? 'success' : 'default'} dot>
                        {agent.status}
                      </Badge>
                    </div>
                    <Dropdown
                      trigger={
                        <button className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      }
                      items={agentActions}
                      align="right"
                    />
                  </div>
                  <CardDescription className="mt-2">{agent.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-secondary-500" />
                  <span className="text-neutral-600 dark:text-neutral-400">Model:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {agent.model}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Tasks Run</p>
                    <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {agent.tasks}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Accuracy</p>
                    <p className="mt-1 text-2xl font-bold text-success-600">
                      {agent.accuracy}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" fullWidth>
                    Configure
                  </Button>
                  <Button variant="outline" size="sm" fullWidth>
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (if no agents) */}
      {agents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
              <Bot className="h-12 w-12 text-neutral-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              No AI agents yet
            </h3>
            <p className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
              Deploy your first AI agent to automate intelligent tasks
            </p>
            <Button variant="primary" className="mt-6" leftIcon={<Plus className="h-5 w-5" />}>
              Create Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
