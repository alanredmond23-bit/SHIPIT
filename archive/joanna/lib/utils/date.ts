// Date utility functions

import { formatDistanceToNow, format, parseISO } from 'date-fns';

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy');
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function isOverdue(dueDate: string | Date): boolean {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return dateObj < new Date();
}

export function getDaysUntilDue(dueDate: string | Date): number {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
