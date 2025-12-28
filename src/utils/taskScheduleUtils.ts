import { getDay, parseISO } from 'date-fns';
import { Task, Section, DayOfWeek } from '../types';

/**
 * Check if a task should be visible on a given date
 */
export const isTaskVisibleOnDate = (task: Task, date: string): boolean => {
  // No schedule or schedule disabled = always visible
  if (!task.schedule?.enabled || task.schedule.days.length === 0) {
    return true;
  }

  const dayOfWeek = getDay(parseISO(date)) as DayOfWeek;
  return task.schedule.days.includes(dayOfWeek);
};

/**
 * Filter tasks in a section to only those visible on the given date
 */
export const getVisibleTasks = (section: Section, date: string): Task[] => {
  return section.tasks.filter((task) => isTaskVisibleOnDate(task, date));
};

/**
 * Get all scheduled days for a task (returns all days if no schedule)
 */
export const getTaskScheduledDays = (task: Task): DayOfWeek[] => {
  if (!task.schedule?.enabled || task.schedule.days.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6]; // All days
  }
  return task.schedule.days;
};

/**
 * Count checkbox tasks that are scheduled for a specific date
 */
export const countScheduledCheckboxTasks = (
  section: Section,
  date: string
): number => {
  return getVisibleTasks(section, date).filter((task) => task.type === 'checkbox')
    .length;
};

const arraysEqual = (a: number[], b: number[]): boolean => {
  return a.length === b.length && a.every((v, i) => v === b[i]);
};

/**
 * Human-readable schedule description
 */
export const getScheduleDescription = (task: Task): string => {
  if (!task.schedule?.enabled || task.schedule.days.length === 0) {
    return 'Daily';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [...task.schedule.days].sort((a, b) => a - b);

  // Check for common patterns
  if (days.length === 7) return 'Daily';
  if (arraysEqual(days, [1, 2, 3, 4, 5])) return 'Weekdays';
  if (arraysEqual(days, [0, 6])) return 'Weekends';

  return days.map((d) => dayNames[d]).join(', ');
};
