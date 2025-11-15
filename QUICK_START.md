# Joanna Frontend - Quick Start Guide

## Getting Started in 3 Steps

### 1. Install & Run
```bash
npm install
npm run dev
```
Visit: http://localhost:3000

### 2. Navigate Pages
- **Auth**: `/login` or `/signup`
- **Dashboard**: `/dashboard`
- **Tasks**: `/dashboard/tasks`
- **Workflows**: `/dashboard/workflows`
- **Agents**: `/dashboard/agents`
- **Settings**: `/dashboard/settings`

### 3. Use Components
```tsx
import { Button, Card, Input, Badge } from '@/components/ui'
import { DashboardLayout } from '@/components/layout'

// In your page
export default function MyPage() {
  return (
    <div>
      <Button variant="primary">Click me</Button>
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    </div>
  )
}
```

---

## Component Quick Reference

### Buttons
```tsx
<Button variant="primary|secondary|outline|ghost|danger|success"
        size="sm|md|lg"
        isLoading={false}
        leftIcon={<Icon />}
        rightIcon={<Icon />}>
  Text
</Button>
```

### Inputs
```tsx
<Input label="Label"
       type="text|email|password"
       error="Error message"
       helperText="Helper text"
       leftIcon={<Icon />}
       rightIcon={<Icon />}
       required />
```

### Badges
```tsx
<Badge variant="default|primary|success|warning|danger|todo|in_progress|completed"
       size="sm|md|lg"
       dot>
  Text
</Badge>
```

### Cards
```tsx
<Card hoverable noPadding={false}>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Modals
```tsx
<Modal open={isOpen}
       onClose={() => setIsOpen(false)}
       title="Title"
       description="Description"
       size="sm|md|lg|xl|full"
       footer={<Button>Save</Button>}>
  Content
</Modal>
```

### Dropdowns
```tsx
<Dropdown trigger={<Button>Menu</Button>}
          items={[
            { id: '1', label: 'Item', icon: <Icon />, onClick: () => {} }
          ]}
          align="left|right" />
```

### Avatars
```tsx
<Avatar src="/image.jpg"
        fallback="JD"
        size="sm|md|lg|xl"
        shape="circle|square" />
```

---

## File Structure
```
app/
├── (auth)/              # Auth pages
├── (dashboard)/         # Dashboard pages
├── globals.css          # Global styles
└── layout.tsx           # Root layout

components/
├── ui/                  # UI components
└── layout/              # Layout components

lib/
└── utils/               # Utilities
```

---

## Next Steps

### Backend Integration
1. Connect Supabase auth in login/signup
2. Replace mock data with API calls
3. Add loading states
4. Handle errors

### Features to Add
- Task CRUD operations
- Workflow builder UI
- Agent configuration
- Real-time updates

### Improvements
- Add tests
- Optimize performance
- Improve accessibility
- Add Storybook

---

## Customization

### Change Colors
Edit `tailwind.config.ts`:
```ts
colors: {
  primary: { ... }  // Change to your brand color
}
```

### Add New Components
```bash
# Create in components/ui/
touch components/ui/NewComponent.tsx

# Export from index
echo "export * from './NewComponent'" >> components/ui/index.ts
```

### Dark Mode
Already configured! Toggle with theme button in header.

---

## Troubleshooting

**Issue**: TypeScript errors
- Run: `npm run type-check`
- Fix imports and type errors

**Issue**: Styles not applying
- Restart dev server
- Check Tailwind config
- Verify globals.css import

**Issue**: Components not found
- Check path aliases in tsconfig.json
- Verify @/ points to root

---

**Ready to build! Happy coding!** 🎨
