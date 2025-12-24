import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Chip,
  Switch,
  TextInput,
  IconButton,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useEntriesStore } from '../../src/stores/entriesStore';
import { useAuthStore } from '../../src/stores/authStore';
import { FamilyMember, Section, Task } from '../../src/types';
import { router } from 'expo-router';

export default function HomeScreen() {
  const theme = useTheme();
  const { members, loadSettings, isLoading: settingsLoading } = useSettingsStore();
  const {
    currentDate,
    setCurrentDate,
    getEntry,
    updateTaskResponse,
    updateSectionNotes,
    loadEntriesForMonth,
  } = useEntriesStore();
  const { isAuthenticated } = useAuthStore();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadEntriesForMonth(format(parseISO(currentDate), 'yyyy-MM'));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Auto-select first member if none selected
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const entry = selectedMemberId ? getEntry(selectedMemberId, currentDate) : undefined;

  const handleDateChange = (days: number) => {
    const newDate = days > 0
      ? addDays(parseISO(currentDate), days)
      : subDays(parseISO(currentDate), Math.abs(days));
    setCurrentDate(format(newDate, 'yyyy-MM-dd'));
  };

  const getTaskValue = (sectionId: string, taskId: string): boolean | string | number | undefined => {
    if (!entry) return undefined;
    const sectionEntry = entry.sectionEntries.find((se) => se.sectionId === sectionId);
    if (!sectionEntry) return undefined;
    const taskResponse = sectionEntry.taskResponses.find((tr) => tr.taskId === taskId);
    return taskResponse?.value;
  };

  const getSectionNotes = (sectionId: string): string => {
    if (!entry) return '';
    const sectionEntry = entry.sectionEntries.find((se) => se.sectionId === sectionId);
    return sectionEntry?.notes || '';
  };

  const handleTaskChange = (sectionId: string, taskId: string, value: boolean | string | number) => {
    if (selectedMemberId) {
      updateTaskResponse(selectedMemberId, currentDate, sectionId, taskId, value);
    }
  };

  const handleNotesChange = (sectionId: string, notes: string) => {
    if (selectedMemberId) {
      updateSectionNotes(selectedMemberId, currentDate, sectionId, notes);
    }
  };

  const renderTaskInput = (section: Section, task: Task) => {
    const value = getTaskValue(section.id, task.id);

    switch (task.type) {
      case 'checkbox':
        return (
          <View style={styles.taskRow} key={task.id}>
            <Text variant="bodyMedium" style={styles.taskName}>{task.name}</Text>
            <Switch
              value={value === true}
              onValueChange={(checked) => handleTaskChange(section.id, task.id, checked)}
            />
          </View>
        );

      case 'text':
        return (
          <View style={styles.taskColumn} key={task.id}>
            <Text variant="bodyMedium">{task.name}</Text>
            <TextInput
              value={(value as string) || ''}
              onChangeText={(text) => handleTaskChange(section.id, task.id, text)}
              mode="outlined"
              dense
              style={styles.textInput}
            />
          </View>
        );

      case 'numeric':
        return (
          <View style={styles.taskRow} key={task.id}>
            <Text variant="bodyMedium" style={styles.taskName}>
              {task.name} {task.unit ? `(${task.unit})` : ''}
            </Text>
            <TextInput
              value={value !== undefined ? String(value) : ''}
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!isNaN(num) || text === '') {
                  handleTaskChange(section.id, task.id, text === '' ? 0 : num);
                }
              }}
              mode="outlined"
              dense
              keyboardType="numeric"
              style={styles.numericInput}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (settingsLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text variant="headlineSmall" style={styles.emptyTitle}>Welcome to Our Journal!</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          Get started by adding family members in Settings.
        </Text>
        <Chip icon="cog" onPress={() => router.push('/(tabs)/settings')}>
          Go to Settings
        </Chip>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Date Header */}
      <Surface style={styles.dateHeader} elevation={1}>
        <IconButton icon="chevron-left" onPress={() => handleDateChange(-1)} />
        <Pressable onPress={() => setCurrentDate(format(new Date(), 'yyyy-MM-dd'))}>
          <View style={styles.dateInfo}>
            <Text variant="titleMedium">
              {format(parseISO(currentDate), 'EEEE, MMM d, yyyy')}
            </Text>
            {isToday(parseISO(currentDate)) && (
              <Chip compact style={styles.todayChip}>Today</Chip>
            )}
          </View>
        </Pressable>
        <IconButton icon="chevron-right" onPress={() => handleDateChange(1)} />
      </Surface>

      {/* Member Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.memberSelector}
        contentContainerStyle={styles.memberSelectorContent}
      >
        {members.map((member) => (
          <Chip
            key={member.id}
            selected={selectedMemberId === member.id}
            onPress={() => setSelectedMemberId(member.id)}
            style={[
              styles.memberChip,
              selectedMemberId === member.id && { backgroundColor: member.color + '40' },
            ]}
            textStyle={selectedMemberId === member.id ? { color: member.color } : undefined}
          >
            {member.name}
          </Chip>
        ))}
      </ScrollView>

      {/* Sections and Tasks */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedMember?.sections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <Card.Title
              title={section.name}
              titleStyle={{ color: selectedMember.color }}
            />
            <Card.Content>
              {section.tasks.length === 0 ? (
                <Text variant="bodySmall" style={styles.noTasks}>
                  No tasks in this section
                </Text>
              ) : (
                section.tasks.map((task) => renderTaskInput(section, task))
              )}

              {/* Notes */}
              <View style={styles.notesContainer}>
                <Text variant="labelMedium" style={styles.notesLabel}>Notes</Text>
                <TextInput
                  value={getSectionNotes(section.id)}
                  onChangeText={(text) => handleNotesChange(section.id, text)}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  placeholder="Add notes for this section..."
                  style={styles.notesInput}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {selectedMember?.sections.length === 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.noSections}>
                No sections configured for {selectedMember.name}.{'\n'}
                Add sections in Settings.
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  todayChip: {
    height: 24,
  },
  memberSelector: {
    maxHeight: 56,
  },
  memberSelectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  memberChip: {
    marginRight: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    marginBottom: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  taskColumn: {
    paddingVertical: 8,
  },
  taskName: {
    flex: 1,
    marginRight: 16,
  },
  textInput: {
    marginTop: 4,
  },
  numericInput: {
    width: 80,
    textAlign: 'center',
  },
  noTasks: {
    fontStyle: 'italic',
    opacity: 0.6,
    paddingVertical: 8,
  },
  noSections: {
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 16,
  },
  notesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  notesLabel: {
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 80,
  },
});
