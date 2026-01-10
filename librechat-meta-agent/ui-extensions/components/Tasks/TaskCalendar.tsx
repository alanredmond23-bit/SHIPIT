'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  LayoutGrid,
  List,
  Play,
  Pause,
} from 'lucide-react';
import type { Task, CalendarTask, CalendarView, TaskStatus } from '@/types/tasks';

// ============================================================================
// Types
// ============================================================================

interface TaskCalendarProps {
  tasks: Task[];
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  onTaskClick?: (task: Task) => void;
  onTaskReschedule?: (taskId: string, newDate: Date) => void;
  onRunTask?: (taskId: string) => void;
}

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  tasks: Task[];
}

// ============================================================================
// Color Helpers
// ============================================================================

const taskTypeColors: Record<string, string> = {
  'one-time': 'bg-blue-500',
  recurring: 'bg-purple-500',
  trigger: 'bg-amber-500',
  chain: 'bg-teal-500',
};

const taskStatusDot: Record<TaskStatus, string> = {
  pending: 'bg-stone-400',
  active: 'bg-emerald-500',
  paused: 'bg-amber-500',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-400',
};

// ============================================================================
// Date Helpers
// ============================================================================

function getMonthDays(year: number, month: number): DayCell[] {
  const days: DayCell[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  // Days from previous month to fill the first week
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      tasks: [],
    });
  }

  // Days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday:
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      tasks: [],
    });
  }

  // Days from next month to fill the last week
  const endPadding = 42 - days.length; // 6 weeks x 7 days
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      tasks: [],
    });
  }

  return days;
}

function getWeekDays(date: Date): DayCell[] {
  const days: DayCell[] = [];
  const today = new Date();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    days.push({
      date: dayDate,
      isCurrentMonth: dayDate.getMonth() === date.getMonth(),
      isToday:
        dayDate.getDate() === today.getDate() &&
        dayDate.getMonth() === today.getMonth() &&
        dayDate.getFullYear() === today.getFullYear(),
      isWeekend: i === 0 || i === 6,
      tasks: [],
    });
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

// ============================================================================
// Task Badge Component
// ============================================================================

interface TaskBadgeProps {
  task: Task;
  onClick?: () => void;
  compact?: boolean;
}

function TaskBadge({ task, onClick, compact = false }: TaskBadgeProps) {
  const typeColor = taskTypeColors[task.type] || 'bg-gray-500';
  const statusDot = taskStatusDot[task.status];

  if (compact) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`w-2 h-2 rounded-full ${typeColor} cursor-pointer hover:scale-125 transition`}
        title={task.name}
      />
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        px-2 py-1 rounded text-xs text-white truncate cursor-pointer
        hover:opacity-80 transition flex items-center gap-1.5
        ${typeColor}
      `}
      title={task.name}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
      <span className="truncate">{task.name}</span>
    </div>
  );
}

// ============================================================================
// Month View Component
// ============================================================================

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskReschedule?: (taskId: string, newDate: Date) => void;
  onDayClick?: (date: Date) => void;
}

function MonthView({ currentDate, tasks, onTaskClick, onTaskReschedule, onDayClick }: MonthViewProps) {
  const days = useMemo(() => {
    const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    
    // Add tasks to their respective days
    return monthDays.map(day => {
      const dayTasks = tasks.filter(task => {
        if (task.nextRun) {
          return isSameDay(new Date(task.nextRun), day.date);
        }
        return false;
      });
      return { ...day, tasks: dayTasks };
    });
  }, [currentDate, tasks]);

  const handleDrop = useCallback((e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onTaskReschedule) {
      onTaskReschedule(taskId, targetDate);
    }
  }, [onTaskReschedule]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-600 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 h-[calc(100%-2.5rem)]">
        {days.map((day, index) => (
          <div
            key={index}
            onClick={() => onDayClick?.(day.date)}
            onDrop={(e) => handleDrop(e, day.date)}
            onDragOver={handleDragOver}
            className={`
              border-b border-r border-gray-200 p-1 min-h-[100px] cursor-pointer
              transition hover:bg-gray-50
              ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${day.isToday ? 'ring-2 ring-inset ring-teal-500' : ''}
              ${day.isWeekend && day.isCurrentMonth ? 'bg-gray-50/50' : ''}
            `}
          >
            {/* Day number */}
            <div
              className={`
                text-sm font-medium mb-1
                ${day.isToday ? 'w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center' : ''}
                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              `}
            >
              {day.date.getDate()}
            </div>

            {/* Task badges */}
            <div className="space-y-1 overflow-hidden">
              {day.tasks.slice(0, 3).map(task => (
                <TaskBadge
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}
              {day.tasks.length > 3 && (
                <div className="text-xs text-gray-500 px-1">
                  +{day.tasks.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Week View Component
// ============================================================================

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskReschedule?: (taskId: string, newDate: Date) => void;
}

function WeekView({ currentDate, tasks, onTaskClick, onTaskReschedule }: WeekViewProps) {
  const days = useMemo(() => {
    const weekDays = getWeekDays(currentDate);
    
    return weekDays.map(day => {
      const dayTasks = tasks.filter(task => {
        if (task.nextRun) {
          return isSameDay(new Date(task.nextRun), day.date);
        }
        return false;
      });
      return { ...day, tasks: dayTasks };
    });
  }, [currentDate, tasks]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDrop = useCallback((e: React.DragEvent, targetDate: Date, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onTaskReschedule) {
      const newDate = new Date(targetDate);
      newDate.setHours(hour, 0, 0, 0);
      onTaskReschedule(taskId, newDate);
    }
  }, [onTaskReschedule]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="w-16 border-r border-gray-200 bg-gray-50" />
        {days.map((day, index) => (
          <div
            key={index}
            className={`
              py-3 text-center border-r border-gray-200
              ${day.isToday ? 'bg-teal-50' : 'bg-gray-50'}
            `}
          >
            <div className="text-xs text-gray-500">
              {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div
              className={`
                text-lg font-semibold
                ${day.isToday ? 'text-teal-600' : 'text-gray-900'}
              `}
            >
              {day.date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8">
        {hours.map(hour => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="w-16 h-16 border-r border-b border-gray-200 text-xs text-gray-500 text-right pr-2 pt-1">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
            
            {/* Day cells */}
            {days.map((day, dayIndex) => {
              const hourTasks = day.tasks.filter(task => {
                if (task.nextRun) {
                  const taskDate = new Date(task.nextRun);
                  return taskDate.getHours() === hour;
                }
                return false;
              });

              return (
                <div
                  key={dayIndex}
                  onDrop={(e) => handleDrop(e, day.date, hour)}
                  onDragOver={handleDragOver}
                  className={`
                    h-16 border-r border-b border-gray-200 p-0.5
                    ${day.isToday ? 'bg-teal-50/30' : ''}
                    hover:bg-gray-50 transition
                  `}
                >
                  {hourTasks.map(task => (
                    <TaskBadge
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                    />
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Day View Component
// ============================================================================

interface DayViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskReschedule?: (taskId: string, newDate: Date) => void;
  onRunTask?: (taskId: string) => void;
}

function DayView({ currentDate, tasks, onTaskClick, onTaskReschedule, onRunTask }: DayViewProps) {
  const dayTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.nextRun) {
        return isSameDay(new Date(task.nextRun), currentDate);
      }
      return false;
    }).sort((a, b) => {
      const aTime = a.nextRun ? new Date(a.nextRun).getTime() : 0;
      const bTime = b.nextRun ? new Date(b.nextRun).getTime() : 0;
      return aTime - bTime;
    });
  }, [currentDate, tasks]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDrop = useCallback((e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onTaskReschedule) {
      const newDate = new Date(currentDate);
      newDate.setHours(hour, 0, 0, 0);
      onTaskReschedule(taskId, newDate);
    }
  }, [currentDate, onTaskReschedule]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex-1 overflow-auto flex">
      {/* Time column */}
      <div className="flex-1">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b border-gray-200 ${isToday ? 'bg-teal-50' : 'bg-gray-50'}`}>
          <div className="text-sm text-gray-500">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={`text-2xl font-bold ${isToday ? 'text-teal-600' : 'text-gray-900'}`}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {isToday && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full">
              Today
            </span>
          )}
        </div>

        {/* Hour slots */}
        <div>
          {hours.map(hour => {
            const hourTasks = dayTasks.filter(task => {
              if (task.nextRun) {
                return new Date(task.nextRun).getHours() === hour;
              }
              return false;
            });

            return (
              <div
                key={hour}
                onDrop={(e) => handleDrop(e, hour)}
                onDragOver={handleDragOver}
                className="flex border-b border-gray-200 min-h-[4rem] hover:bg-gray-50 transition"
              >
                <div className="w-20 flex-shrink-0 text-xs text-gray-500 text-right pr-3 pt-1 border-r border-gray-200">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition
                        ${taskTypeColors[task.type]} text-white
                        hover:opacity-90 hover:shadow
                      `}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('taskId', task.id);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{task.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${taskStatusDot[task.status]}`} />
                          {onRunTask && task.status === 'active' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRunTask(task.id);
                              }}
                              className="p-1 rounded hover:bg-white/20 transition"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/80 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-white/70">
                        <Clock className="w-3 h-3" />
                        {task.nextRun && new Date(task.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="capitalize">{task.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task summary sidebar */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Tasks Today</h3>
        
        {dayTasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks scheduled for this day</p>
        ) : (
          <div className="space-y-2">
            {dayTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${taskStatusDot[task.status]}`} />
                  <span className="font-medium text-sm text-gray-900 truncate">{task.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {task.nextRun && new Date(task.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${taskTypeColors[task.type]}`}>
                    {task.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Statistics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total tasks</span>
              <span className="font-medium text-gray-900">{dayTasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active</span>
              <span className="font-medium text-emerald-600">
                {dayTasks.filter(t => t.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paused</span>
              <span className="font-medium text-amber-600">
                {dayTasks.filter(t => t.status === 'paused').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Calendar Component
// ============================================================================

export function TaskCalendar({
  tasks,
  view: initialView = 'month',
  onViewChange,
  onTaskClick,
  onTaskReschedule,
  onRunTask,
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(initialView);

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
    onViewChange?.(newView);
  }, [onViewChange]);

  const navigateBack = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  const navigateForward = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    handleViewChange('day');
  }, [handleViewChange]);

  const getHeaderTitle = () => {
    switch (view) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'week': {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'day':
        return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Today
          </button>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={navigateBack}
              className="p-2 hover:bg-gray-100 transition"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={navigateForward}
              className="p-2 hover:bg-gray-100 transition border-l border-gray-200"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 ml-2">{getHeaderTitle()}</h2>
        </div>

        {/* View switcher */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleViewChange('month')}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1.5
              ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}
            `}
          >
            <LayoutGrid className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => handleViewChange('week')}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1.5
              ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}
            `}
          >
            <List className="w-4 h-4" />
            Week
          </button>
          <button
            onClick={() => handleViewChange('day')}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1.5
              ${view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}
            `}
          >
            <CalendarIcon className="w-4 h-4" />
            Day
          </button>
        </div>
      </div>

      {/* Calendar content */}
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          tasks={tasks}
          onTaskClick={onTaskClick}
          onTaskReschedule={onTaskReschedule}
          onDayClick={handleDayClick}
        />
      )}

      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          tasks={tasks}
          onTaskClick={onTaskClick}
          onTaskReschedule={onTaskReschedule}
        />
      )}

      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          tasks={tasks}
          onTaskClick={onTaskClick}
          onTaskReschedule={onTaskReschedule}
          onRunTask={onRunTask}
        />
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-4 text-xs text-gray-600">
        <span className="font-medium">Task types:</span>
        {Object.entries(taskTypeColors).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${color}`} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

export default TaskCalendar;
