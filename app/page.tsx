import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to dashboard (will redirect to login if not authenticated)
  redirect('/dashboard')
}
