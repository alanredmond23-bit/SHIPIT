# Joanna Component Showcase

## UI Component Library

### Button Variants
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
```

### Badge Variants
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="todo">Todo</Badge>
<Badge variant="in_progress" dot>In Progress</Badge>
<Badge variant="completed" dot>Completed</Badge>
```

### Card Composition
```tsx
<Card hoverable>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Supporting description text</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    <Button variant="primary">Action</Button>
  </CardFooter>
</Card>
```

### Input Types
```tsx
<Input 
  label="Email" 
  type="email" 
  placeholder="you@example.com"
  leftIcon={<Mail />}
/>

<Input 
  label="Password" 
  type="password"
  error="Invalid password"
  leftIcon={<Lock />}
/>

<Input 
  label="Search" 
  leftIcon={<Search />}
  rightIcon={<X />}
/>
```

---

## Page Layouts

### Authentication Layout
```
┌─────────────────────────────────────────┐
│                                         │
│              [J] Joanna                 │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Welcome back               │     │
│    │  Sign in to continue        │     │
│    │                             │     │
│    │  Email    [_______________] │     │
│    │  Password [_______________] │     │
│    │                             │     │
│    │  [x] Remember  Forgot?      │     │
│    │                             │     │
│    │  [Sign in ────────────]     │     │
│    │                             │     │
│    │  ─── Or continue with ───   │     │
│    │  [Google]  [GitHub]         │     │
│    │                             │     │
│    │  Don't have account? Sign up│     │
│    └─────────────────────────────┘     │
│                                         │
│         © 2025 Joanna                   │
└─────────────────────────────────────────┘
```

### Dashboard Layout
```
┌────────┬──────────────────────────────────────────┐
│   [J]  │  [Search..._______________] 🔔 👤       │
│ Joanna ├──────────────────────────────────────────┤
│        │                                          │
│ 📊 Dash│  Dashboard                               │
│ ✅ Task│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ 🔄 Flow│  │ 24   │ │  8   │ │  5   │ │ 87%  │   │
│ 🤖 Agen│  │Tasks │ │Flows │ │Agents│ │Rate  │   │
│ ⚙️ Sett│  └──────┘ └──────┘ └──────┘ └──────┘   │
│        │                                          │
│  [<]   │  Quick Actions                          │
│        │  [+ Task] [+ Flow] [+ Agent]            │
│        │                                          │
│        │  Recent Tasks        Activity            │
│        │  ┌─────────────┐    ┌─────────────┐    │
│        │  │ Review...   │    │ Started... │     │
│        │  │ Update...   │    │ Complete...│     │
│        │  └─────────────┘    └─────────────┘    │
└────────┴──────────────────────────────────────────┘
```

---

## Color Palette

### Primary (Blue)
- 50-950 scale for sky blue tones
- Used for: Primary actions, links, focus states

### Secondary (Purple)  
- 50-950 scale for purple tones
- Used for: Secondary actions, accents

### Success (Green)
- 50-950 scale for green tones
- Used for: Completed states, positive feedback

### Warning (Amber)
- 50-950 scale for amber tones
- Used for: Warnings, medium priority

### Danger (Red)
- 50-950 scale for red tones
- Used for: Errors, destructive actions

### Neutral (Gray)
- 50-950 scale for gray tones
- Used for: Text, borders, backgrounds

---

## Accessibility Features

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ ARIA labels and roles
- ✅ Focus visible states
- ✅ Screen reader friendly
- ✅ Color contrast WCAG AA
- ✅ Semantic HTML
- ✅ Form error announcements

---

## Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px
- **Wide**: > 1280px

All components are mobile-first and fully responsive!

---

## Dark Mode

Toggle dark mode with the moon/sun icon in the header.
All components automatically adapt to dark mode.

CSS Variables used:
- `--background` / `--foreground`
- `--primary` / `--secondary`
- `--muted` / `--accent`
- `--border` / `--ring`

---

**Component library ready for production use!**
