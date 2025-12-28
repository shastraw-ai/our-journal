import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { Task, FamilyMember, Section, DayOfWeek } from '../types';
import { useEntriesStore } from '../stores/entriesStore';

// Notification identifier pattern: task-{memberId}-{sectionId}-{taskId}-{dayOfWeek}
const getNotificationId = (
  memberId: string,
  sectionId: string,
  taskId: string,
  day: DayOfWeek
): string => {
  return `task-${memberId}-${sectionId}-${taskId}-${day}`;
};

// Category for interactive checkbox notifications
const CHECKBOX_CATEGORY = 'CHECKBOX_TASK';

export const notificationService = {
  // Initialize notification categories (call once at app startup)
  async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync(CHECKBOX_CATEGORY, [
      {
        identifier: 'YES',
        buttonTitle: 'Yes, Done!',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'NO',
        buttonTitle: 'Not Yet',
        options: { opensAppToForeground: false },
      },
    ]);
  },

  // Schedule notifications for a single task
  async scheduleTaskReminder(
    member: FamilyMember,
    section: Section,
    task: Task
  ): Promise<void> {
    if (!task.reminder?.enabled) return;

    // Cancel existing notifications for this task
    await this.cancelTaskReminders(member.id, section.id, task.id);

    // Determine which days to schedule
    const days: DayOfWeek[] =
      task.schedule?.enabled && task.schedule.days.length > 0
        ? task.schedule.days
        : [0, 1, 2, 3, 4, 5, 6]; // All days if no schedule

    for (const day of days) {
      const notificationId = getNotificationId(member.id, section.id, task.id, day);

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: `${member.name} - ${section.name}`,
          body: task.name,
          data: {
            memberId: member.id,
            sectionId: section.id,
            taskId: task.id,
            taskType: task.type,
          },
          categoryIdentifier: task.type === 'checkbox' ? CHECKBOX_CATEGORY : undefined,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: ((day + 1) % 7) + 1, // expo uses 1-7 (Sunday=1)
          hour: task.reminder.hour,
          minute: task.reminder.minute,
        },
      });
    }
  },

  // Cancel all reminders for a specific task
  async cancelTaskReminders(
    memberId: string,
    sectionId: string,
    taskId: string
  ): Promise<void> {
    for (let day = 0; day <= 6; day++) {
      const notificationId = getNotificationId(
        memberId,
        sectionId,
        taskId,
        day as DayOfWeek
      );
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // Notification might not exist, ignore
      }
    }
  },

  // Cancel all reminders for a member
  async cancelMemberReminders(memberId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) =>
      n.identifier.startsWith(`task-${memberId}-`)
    );
    await Promise.all(
      toCancel.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier)
      )
    );
  },

  // Reschedule all task reminders (call after settings change)
  async rescheduleAllReminders(members: FamilyMember[]): Promise<void> {
    // Cancel all task notifications first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const taskNotifications = scheduled.filter((n) =>
      n.identifier.startsWith('task-')
    );
    await Promise.all(
      taskNotifications.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier)
      )
    );

    // Schedule new notifications
    for (const member of members) {
      for (const section of member.sections) {
        for (const task of section.tasks) {
          if (task.reminder?.enabled) {
            await this.scheduleTaskReminder(member, section, task);
          }
        }
      }
    }
  },

  // Handle notification response (for interactive Yes/No)
  handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as {
      memberId: string;
      sectionId: string;
      taskId: string;
      taskType: string;
    };

    // Only handle checkbox tasks with Yes/No actions
    if (
      data?.taskType === 'checkbox' &&
      (actionIdentifier === 'YES' || actionIdentifier === 'NO')
    ) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const entriesStore = useEntriesStore.getState();

      entriesStore.updateTaskResponse(
        data.memberId,
        today,
        data.sectionId,
        data.taskId,
        actionIdentifier === 'YES'
      );
    }
  },
};
