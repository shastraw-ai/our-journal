import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Text,
  Button,
  Card,
  IconButton,
  Portal,
  Modal,
  TextInput,
  useTheme,
  Chip,
  SegmentedButtons,
  Divider,
  Surface,
  Avatar,
  Switch,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { TaskType, FamilyMember, Section } from '../../src/types';
import { router } from 'expo-router';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
  '#00897B', '#43A047', '#7CB342', '#C0CA33',
  '#FDD835', '#FFB300', '#FB8C00', '#F4511E',
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { members, loadSettings, addMember, updateMember, deleteMember, addSection, updateSection, deleteSection, addTask, updateTask, deleteTask } = useSettingsStore();
  const { isGuest, userEmail, logout } = useAuthStore();

  // Modal states
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  // Form states
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberColor, setMemberColor] = useState(COLORS[0]);

  const [editingSection, setEditingSection] = useState<{ memberId: string; sectionId: string | null } | null>(null);
  const [sectionName, setSectionName] = useState('');

  const [editingTask, setEditingTask] = useState<{ memberId: string; sectionId: string; taskId: string | null } | null>(null);
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('checkbox');
  const [taskUnit, setTaskUnit] = useState('');

  // Expanded states
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  // Reminder states
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(20, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
    loadReminderSettings();
    requestNotificationPermissions();
  }, []);

  // Auto-expand first member if exists
  useEffect(() => {
    if (members.length > 0 && !expandedMemberId) {
      setExpandedMemberId(members[0].id);
    }
  }, [members]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
    }
  };

  const loadReminderSettings = async () => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const journalReminder = scheduledNotifications.find(n => n.identifier === 'journal-reminder');
    if (journalReminder) {
      setReminderEnabled(true);
      const trigger = journalReminder.trigger as any;
      if (trigger?.hour !== undefined && trigger?.minute !== undefined) {
        const time = new Date();
        time.setHours(trigger.hour, trigger.minute, 0, 0);
        setReminderTime(time);
      }
    }
  };

  const scheduleReminder = async (time: Date) => {
    // Cancel existing reminder
    await Notifications.cancelScheduledNotificationAsync('journal-reminder');

    // Schedule new daily reminder
    await Notifications.scheduleNotificationAsync({
      identifier: 'journal-reminder',
      content: {
        title: 'Our Journal',
        body: "Time to complete today's journal entries!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.getHours(),
        minute: time.getMinutes(),
      },
    });
  };

  const cancelReminder = async () => {
    await Notifications.cancelScheduledNotificationAsync('journal-reminder');
  };

  const handleReminderToggle = async (enabled: boolean) => {
    setReminderEnabled(enabled);
    if (enabled) {
      await scheduleReminder(reminderTime);
    } else {
      await cancelReminder();
    }
  };

  const handleTimeChange = async (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setReminderTime(selectedTime);
      if (reminderEnabled) {
        await scheduleReminder(selectedTime);
      }
    }
  };

  // Member handlers
  const openMemberModal = (memberId?: string) => {
    if (memberId) {
      const member = members.find(m => m.id === memberId);
      if (member) {
        setEditingMember(memberId);
        setMemberName(member.name);
        setMemberColor(member.color);
      }
    } else {
      setEditingMember(null);
      setMemberName('');
      setMemberColor(COLORS[members.length % COLORS.length]);
    }
    setMemberModalVisible(true);
  };

  const saveMember = () => {
    if (!memberName.trim()) return;
    if (editingMember) {
      updateMember(editingMember, { name: memberName.trim(), color: memberColor });
    } else {
      addMember(memberName.trim(), memberColor);
      setTimeout(() => {
        const newMember = members[members.length];
        if (newMember) {
          setExpandedMemberId(newMember.id);
        }
      }, 100);
    }
    setMemberModalVisible(false);
  };

  const handleAddMember = () => {
    if (!memberName.trim()) return;
    const prevLength = members.length;
    addMember(memberName.trim(), memberColor);
    setMemberModalVisible(false);
    setTimeout(() => {
      const store = useSettingsStore.getState();
      if (store.members.length > prevLength) {
        const newMember = store.members[store.members.length - 1];
        setExpandedMemberId(newMember.id);
        setExpandedSectionId(null);
      }
    }, 50);
  };

  // Section handlers
  const openSectionModal = (memberId: string, sectionId?: string) => {
    if (sectionId) {
      const member = members.find(m => m.id === memberId);
      const section = member?.sections.find(s => s.id === sectionId);
      if (section) {
        setEditingSection({ memberId, sectionId });
        setSectionName(section.name);
      }
    } else {
      setEditingSection({ memberId, sectionId: null });
      setSectionName('');
    }
    setSectionModalVisible(true);
  };

  const handleAddSection = () => {
    if (!editingSection || !sectionName.trim()) return;
    const memberId = editingSection.memberId;
    const member = members.find(m => m.id === memberId);
    const prevSectionCount = member?.sections.length || 0;

    if (editingSection.sectionId) {
      updateSection(editingSection.memberId, editingSection.sectionId, sectionName.trim());
    } else {
      addSection(editingSection.memberId, sectionName.trim());
    }
    setSectionModalVisible(false);

    if (!editingSection.sectionId) {
      setTimeout(() => {
        const store = useSettingsStore.getState();
        const updatedMember = store.members.find(m => m.id === memberId);
        if (updatedMember && updatedMember.sections.length > prevSectionCount) {
          const newSection = updatedMember.sections[updatedMember.sections.length - 1];
          setExpandedSectionId(newSection.id);
        }
      }, 50);
    }
  };

  // Task handlers
  const openTaskModal = (memberId: string, sectionId: string, taskId?: string) => {
    if (taskId) {
      const member = members.find(m => m.id === memberId);
      const section = member?.sections.find(s => s.id === sectionId);
      const task = section?.tasks.find(t => t.id === taskId);
      if (task) {
        setEditingTask({ memberId, sectionId, taskId });
        setTaskName(task.name);
        setTaskType(task.type);
        setTaskUnit(task.unit || '');
      }
    } else {
      setEditingTask({ memberId, sectionId, taskId: null });
      setTaskName('');
      setTaskType('checkbox');
      setTaskUnit('');
    }
    setTaskModalVisible(true);
  };

  const saveTask = () => {
    if (!editingTask || !taskName.trim()) return;
    if (editingTask.taskId) {
      updateTask(editingTask.memberId, editingTask.sectionId, editingTask.taskId, {
        name: taskName.trim(),
        type: taskType,
        unit: taskType === 'numeric' ? taskUnit.trim() || undefined : undefined,
      });
    } else {
      addTask(editingTask.memberId, editingTask.sectionId, taskName.trim(), taskType,
        taskType === 'numeric' ? taskUnit.trim() || undefined : undefined);
    }
    setTaskModalVisible(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/auth');
  };

  const getTaskTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'checkbox': return 'checkbox-marked-outline';
      case 'text': return 'text';
      case 'numeric': return 'numeric';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMember = (member: FamilyMember) => {
    const isExpanded = expandedMemberId === member.id;

    return (
      <Card key={member.id} style={[styles.memberCard, { borderLeftColor: member.color, borderLeftWidth: 4 }]}>
        <Pressable onPress={() => setExpandedMemberId(isExpanded ? null : member.id)}>
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              <Avatar.Text
                size={40}
                label={member.name.charAt(0).toUpperCase()}
                style={{ backgroundColor: member.color }}
              />
              <View style={styles.memberText}>
                <Text variant="titleMedium">{member.name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.sections.length} section{member.sections.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.memberActions}>
              <IconButton icon="pencil" size={20} onPress={() => openMemberModal(member.id)} />
              <IconButton icon="delete-outline" size={20} onPress={() => deleteMember(member.id)} />
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.memberContent}>
            <Divider style={styles.divider} />
            <View style={styles.sectionsList}>
              <View style={styles.sectionHeader}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>SECTIONS</Text>
                <Button mode="text" compact icon="plus" onPress={() => openSectionModal(member.id)}>
                  Add Section
                </Button>
              </View>

              {member.sections.length === 0 ? (
                <Surface style={styles.emptyState} elevation={0}>
                  <MaterialCommunityIcons name="folder-plus-outline" size={32} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={styles.emptyText}>No sections yet</Text>
                  <Text variant="bodySmall" style={styles.emptyHint}>Add sections to organize tasks</Text>
                </Surface>
              ) : (
                member.sections.map((section) => renderSection(member, section))
              )}
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderSection = (member: FamilyMember, section: Section) => {
    const isExpanded = expandedSectionId === section.id;

    return (
      <Surface key={section.id} style={styles.sectionCard} elevation={1}>
        <Pressable onPress={() => setExpandedSectionId(isExpanded ? null : section.id)}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionInfo}>
              <MaterialCommunityIcons name="folder-outline" size={20} color={member.color} />
              <Text variant="titleSmall" style={styles.sectionName}>{section.name}</Text>
              <Chip compact style={styles.taskCountChip} textStyle={styles.chipText}>
                {section.tasks.length} task{section.tasks.length !== 1 ? 's' : ''}
              </Chip>
            </View>
            <View style={styles.sectionActions}>
              <IconButton icon="pencil" size={18} onPress={() => openSectionModal(member.id, section.id)} />
              <IconButton icon="delete-outline" size={18} onPress={() => deleteSection(member.id, section.id)} />
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.tasksContainer}>
            <Divider style={styles.taskDivider} />
            <View style={styles.tasksHeader}>
              <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>TASKS</Text>
              <Button mode="text" compact icon="plus" onPress={() => openTaskModal(member.id, section.id)}>
                Add Task
              </Button>
            </View>

            {section.tasks.length === 0 ? (
              <View style={styles.emptyTaskState}>
                <Text variant="bodySmall" style={styles.emptyHint}>Add daily tasks to track</Text>
              </View>
            ) : (
              section.tasks.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <View style={styles.taskInfo}>
                    <MaterialCommunityIcons name={getTaskTypeIcon(task.type)} size={18} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={styles.taskName}>{task.name}</Text>
                    {task.unit && <Chip compact style={styles.unitChip} textStyle={styles.chipText}>{task.unit}</Chip>}
                  </View>
                  <View style={styles.taskActions}>
                    <IconButton icon="pencil" size={16} onPress={() => openTaskModal(member.id, section.id, task.id)} />
                    <IconButton icon="delete-outline" size={16} onPress={() => deleteTask(member.id, section.id, task.id)} />
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={100}
      >
        {/* Account Card */}
        <Card style={styles.accountCard}>
          <View style={styles.accountContent}>
            <View style={styles.accountInfo}>
              <MaterialCommunityIcons
                name={isGuest ? 'account-outline' : 'google'}
                size={24}
                color={theme.colors.primary}
              />
              <View>
                <Text variant="titleSmall">{isGuest ? 'Guest Mode' : userEmail}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isGuest ? 'Data stored locally only' : 'Synced with Google Drive'}
                </Text>
              </View>
            </View>
            <Button mode="outlined" compact onPress={handleLogout}>Sign Out</Button>
          </View>
        </Card>

        {/* Daily Reminder Card */}
        <Card style={styles.reminderCard}>
          <View style={styles.reminderContent}>
            <View style={styles.reminderHeader}>
              <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.primary} />
              <View style={styles.reminderInfo}>
                <Text variant="titleSmall">Daily Reminder</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Get reminded to complete your journal
                </Text>
              </View>
              <Switch value={reminderEnabled} onValueChange={handleReminderToggle} />
            </View>

            {reminderEnabled && (
              <Pressable onPress={() => setShowTimePicker(true)} style={styles.timeSelector}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyLarge" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {formatTime(reminderTime)}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            )}
          </View>
        </Card>

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Members Section */}
        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text variant="titleLarge">Family Members</Text>
            <Button mode="contained" icon="plus" onPress={() => openMemberModal()}>Add Member</Button>
          </View>

          {members.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyCardContent}>
                <MaterialCommunityIcons name="account-group-outline" size={48} color={theme.colors.onSurfaceVariant} />
                <Text variant="titleMedium" style={styles.emptyTitle}>No family members yet</Text>
                <Text variant="bodyMedium" style={styles.emptyDescription}>
                  Add family members to start tracking their daily activities and journal entries.
                </Text>
                <Button mode="contained" icon="plus" onPress={() => openMemberModal()} style={styles.emptyButton}>
                  Add Your First Member
                </Button>
              </Card.Content>
            </Card>
          ) : (
            members.map(renderMember)
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Member Modal */}
      <Portal>
        <Modal visible={memberModalVisible} onDismiss={() => setMemberModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="headlineSmall" style={styles.modalTitle}>{editingMember ? 'Edit Member' : 'Add Family Member'}</Text>
          <TextInput label="Name" value={memberName} onChangeText={setMemberName} style={styles.input} mode="outlined" autoFocus />
          <Text variant="labelLarge" style={styles.colorLabel}>Choose Color</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((color) => (
              <Pressable key={color} onPress={() => setMemberColor(color)} style={[styles.colorOption, { backgroundColor: color }, memberColor === color && styles.colorOptionSelected]}>
                {memberColor === color && <MaterialCommunityIcons name="check" size={20} color="white" />}
              </Pressable>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Button onPress={() => setMemberModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={editingMember ? saveMember : handleAddMember}>{editingMember ? 'Save' : 'Add Member'}</Button>
          </View>
        </Modal>
      </Portal>

      {/* Section Modal */}
      <Portal>
        <Modal visible={sectionModalVisible} onDismiss={() => setSectionModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="headlineSmall" style={styles.modalTitle}>{editingSection?.sectionId ? 'Edit Section' : 'Add Section'}</Text>
          <TextInput label="Section Name" value={sectionName} onChangeText={setSectionName} placeholder="e.g., Morning Routine, Health, Learning" style={styles.input} mode="outlined" autoFocus />
          <View style={styles.modalActions}>
            <Button onPress={() => setSectionModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAddSection}>{editingSection?.sectionId ? 'Save' : 'Add Section'}</Button>
          </View>
        </Modal>
      </Portal>

      {/* Task Modal */}
      <Portal>
        <Modal visible={taskModalVisible} onDismiss={() => setTaskModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="headlineSmall" style={styles.modalTitle}>{editingTask?.taskId ? 'Edit Task' : 'Add Task'}</Text>
          <TextInput label="Task Name" value={taskName} onChangeText={setTaskName} placeholder="e.g., Brushed teeth, Read for 30 min" style={styles.input} mode="outlined" autoFocus />
          <Text variant="labelLarge" style={styles.typeLabel}>Task Type</Text>
          <SegmentedButtons value={taskType} onValueChange={(value) => setTaskType(value as TaskType)} buttons={[
            { value: 'checkbox', label: 'Yes/No', icon: 'checkbox-marked-outline' },
            { value: 'text', label: 'Text', icon: 'text' },
            { value: 'numeric', label: 'Number', icon: 'numeric' },
          ]} style={styles.segmentedButtons} />
          {taskType === 'numeric' && (
            <TextInput label="Unit (optional)" value={taskUnit} onChangeText={setTaskUnit} placeholder="e.g., minutes, glasses, pages" style={styles.input} mode="outlined" />
          )}
          <View style={styles.modalActions}>
            <Button onPress={() => setTaskModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={saveTask}>{editingTask?.taskId ? 'Save' : 'Add Task'}</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  accountCard: {
    marginBottom: 12,
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderCard: {
    marginBottom: 20,
  },
  reminderContent: {
    padding: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  membersSection: {
    gap: 12,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memberCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberText: {
    gap: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  divider: {
    marginBottom: 12,
  },
  sectionsList: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  sectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionName: {
    flex: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCountChip: {
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  tasksContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  taskDivider: {
    marginBottom: 8,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  taskName: {
    flex: 1,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitChip: {
    height: 22,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  emptyTaskState: {
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
  },
  emptyHint: {
    opacity: 0.5,
    textAlign: 'center',
  },
  emptyCard: {
    marginTop: 8,
  },
  emptyCardContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 8,
  },
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  colorLabel: {
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  typeLabel: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
