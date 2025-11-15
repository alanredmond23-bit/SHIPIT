'use client'

import * as React from 'react'
import { User, Bell, Lock, Palette, Zap, CreditCard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'

/**
 * Settings page
 * User preferences and account settings
 */
export default function SettingsPage() {
  const [formData, setFormData] = React.useState({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving settings...', formData)
  }

  const settingsSections = [
    {
      icon: User,
      title: 'Profile',
      description: 'Manage your personal information',
      color: 'text-primary-600',
      bgColor: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure your notification preferences',
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50 dark:bg-secondary-900/20',
    },
    {
      icon: Lock,
      title: 'Security',
      description: 'Manage passwords and authentication',
      color: 'text-danger-600',
      bgColor: 'bg-danger-50 dark:bg-danger-900/20',
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize the look and feel',
      color: 'text-warning-600',
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
    },
    {
      icon: Zap,
      title: 'Integrations',
      description: 'Connect third-party services',
      color: 'text-success-600',
      bgColor: 'bg-success-50 dark:bg-success-900/20',
    },
    {
      icon: CreditCard,
      title: 'Billing',
      description: 'Manage subscription and payments',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-50 dark:bg-neutral-900/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Settings</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details and avatar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <Avatar fallback="JD" size="xl" />
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm">
                  Upload Photo
                </Button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  JPG, PNG or GIF. Max 2MB.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
              />
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
              />
              <Input
                label="Company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                fullWidth
              />
              <Input label="Role" placeholder="e.g., Solo Entrepreneur" fullWidth />
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <Button variant="outline">Cancel</Button>
              <Button variant="primary" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} hoverable className="cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-3 ${section.bgColor}`}>
                    <Icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-danger-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-danger-200 p-4 dark:border-danger-800">
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Delete Account
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="danger" size="sm">
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
