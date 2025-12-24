import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date: string | Date, formatStr: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, formatStr) : '';
};

export const getMonthKey = (date: string): string => {
  return format(parseISO(date), 'yyyy-MM');
};

export const getTodayISO = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const isValidDateString = (date: string): boolean => {
  return isValid(parseISO(date));
};
