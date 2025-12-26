import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform, ScrollView, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Text,
  Card,
  useTheme,
  Switch,
  TextInput,
  IconButton,
  ActivityIndicator,
  Surface,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
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
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const richEditorRef = useRef<RichEditor>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

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

  useEffect(() => {
    // Auto-select first section when member changes
    if (selectedMemberId) {
      const member = members.find(m => m.id === selectedMemberId);
      if (member && member.sections.length > 0) {
        setSelectedSectionId(member.sections[0].id);
      } else {
        setSelectedSectionId(null);
      }
    }
  }, [selectedMemberId, members]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const selectedSection = selectedMember?.sections.find((s) => s.id === selectedSectionId);
  const entry = selectedMemberId ? getEntry(selectedMemberId, currentDate) : undefined;

  const handleDateChange = (days: number) => {
    const newDate = days > 0
      ? addDays(parseISO(currentDate), days)
      : subDays(parseISO(currentDate), Math.abs(days));
    setCurrentDate(format(newDate, 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    setCurrentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCurrentDate(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
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

  const getCompletionCount = (section: Section): { completed: number; total: number } => {
    const checkboxTasks = section.tasks.filter(t => t.type === 'checkbox');
    if (checkboxTasks.length === 0) return { completed: 0, total: 0 };

    let completed = 0;
    checkboxTasks.forEach(task => {
      const value = getTaskValue(section.id, task.id);
      if (value === true) completed++;
    });

    return { completed, total: checkboxTasks.length };
  };

  const renderTaskInput = (task: Task) => {
    if (!selectedSectionId) return null;
    const value = getTaskValue(selectedSectionId, task.id);

    switch (task.type) {
      case 'checkbox':
        return (
          <Surface key={task.id} style={styles.taskCard} elevation={1}>
            <View style={styles.checkboxTask}>
              <View style={styles.taskLabelRow}>
                <MaterialCommunityIcons
                  name={value === true ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={24}
                  color={value === true ? selectedMember?.color || theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.taskLabel,
                    value === true && styles.taskCompleted
                  ]}
                >
                  {task.name}
                </Text>
              </View>
              <Switch
                value={value === true}
                onValueChange={(checked) => handleTaskChange(selectedSectionId, task.id, checked)}
                color={selectedMember?.color}
              />
            </View>
          </Surface>
        );

      case 'text':
        return (
          <Surface key={task.id} style={styles.taskCard} elevation={1}>
            <Text variant="labelLarge" style={styles.taskInputLabel}>{task.name}</Text>
            <TextInput
              value={(value as string) || ''}
              onChangeText={(text) => handleTaskChange(selectedSectionId, task.id, text)}
              mode="outlined"
              placeholder="Enter text..."
              style={styles.textInput}
              outlineColor={theme.colors.outline}
              activeOutlineColor={selectedMember?.color}
            />
          </Surface>
        );

      case 'numeric':
        return (
          <Surface key={task.id} style={styles.taskCard} elevation={1}>
            <View style={styles.numericTask}>
              <View style={styles.numericInfo}>
                <Text variant="bodyLarge">{task.name}</Text>
                {task.unit && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    ({task.unit})
                  </Text>
                )}
              </View>
              <TextInput
                value={value !== undefined && value !== 0 ? String(value) : ''}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  if (!isNaN(num) || text === '') {
                    handleTaskChange(selectedSectionId, task.id, text === '' ? 0 : num);
                  }
                }}
                mode="outlined"
                keyboardType="numeric"
                placeholder="0"
                style={styles.numericInput}
                outlineColor={theme.colors.outline}
                activeOutlineColor={selectedMember?.color}
              />
            </View>
          </Surface>
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
        <MaterialCommunityIcons name="book-open-page-variant-outline" size={64} color={theme.colors.onSurfaceVariant} />
        <Text variant="headlineSmall" style={styles.emptyTitle}>Welcome to Our Journal!</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          Get started by adding family members in Settings.
        </Text>
        <Pressable
          style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <MaterialCommunityIcons name="cog" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Go to Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Date Header */}
      <Surface style={styles.dateHeader} elevation={2}>
        <IconButton icon="chevron-left" onPress={() => handleDateChange(-1)} size={28} />
        <Pressable onPress={openDatePicker} style={styles.dateCenter}>
          <View style={styles.dateTouchable}>
            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
            <Text variant="titleLarge" style={styles.dateText}>
              {format(parseISO(currentDate), 'EEE, MMM d')}
            </Text>
          </View>
          {isToday(parseISO(currentDate)) ? (
            <View style={[styles.todayBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.todayText}>TODAY</Text>
            </View>
          ) : (
            <Pressable onPress={goToToday}>
              <Text variant="bodySmall" style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}>
                {format(parseISO(currentDate), 'yyyy')} • Go to today
              </Text>
            </Pressable>
          )}
        </Pressable>
        <IconButton icon="chevron-right" onPress={() => handleDateChange(1)} size={28} />
      </Surface>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISO(currentDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDatePickerChange}
        />
      )}

      {/* Member Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {members.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <Pressable
                key={member.id}
                onPress={() => setSelectedMemberId(member.id)}
                style={[
                  styles.memberTab,
                  isSelected && { backgroundColor: member.color + '20', borderColor: member.color },
                ]}
              >
                <View style={[styles.memberDot, { backgroundColor: member.color }]} />
                <Text
                  variant="labelLarge"
                  style={[
                    styles.memberTabText,
                    isSelected && { color: member.color, fontWeight: '600' }
                  ]}
                >
                  {member.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Tabs */}
      {selectedMember && selectedMember.sections.length > 0 && (
        <View style={styles.sectionTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionTabsContent}
          >
            {selectedMember.sections.map((section) => {
              const isSelected = selectedSectionId === section.id;
              const { completed, total } = getCompletionCount(section);
              return (
                <Pressable
                  key={section.id}
                  onPress={() => setSelectedSectionId(section.id)}
                  style={[
                    styles.sectionTab,
                    isSelected && {
                      backgroundColor: selectedMember.color + '10',
                      borderBottomColor: selectedMember.color,
                      borderBottomWidth: 3,
                    },
                  ]}
                >
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.sectionTabText,
                      isSelected && { color: selectedMember.color, fontWeight: '600' }
                    ]}
                  >
                    {section.name}
                  </Text>
                  {total > 0 && (
                    <View style={[
                      styles.completionBadge,
                      { backgroundColor: completed === total ? selectedMember.color : theme.colors.surfaceVariant }
                    ]}>
                      <Text style={[
                        styles.completionText,
                        { color: completed === total ? '#fff' : theme.colors.onSurfaceVariant }
                      ]}>
                        {completed}/{total}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={150}
        showsVerticalScrollIndicator={true}
      >
        {selectedMember?.sections.length === 0 && (
          <Surface style={styles.emptySection} elevation={0}>
            <MaterialCommunityIcons name="folder-plus-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={styles.emptySectionTitle}>No sections yet</Text>
            <Text variant="bodyMedium" style={styles.emptySectionText}>
              Add sections for {selectedMember.name} in Settings
            </Text>
          </Surface>
        )}

        {selectedSection && (
          <>
            {/* Tasks */}
            {selectedSection.tasks.length === 0 ? (
              <Surface style={styles.emptyTasks} elevation={0}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={styles.emptyTasksText}>
                  No tasks in this section
                </Text>
              </Surface>
            ) : (
              <View style={styles.tasksList}>
                {selectedSection.tasks.map((task) => renderTaskInput(task))}
              </View>
            )}

            {/* Notes */}
            <Surface style={styles.notesCard} elevation={1}>
              <View style={styles.notesHeader}>
                <MaterialCommunityIcons name="note-text-outline" size={20} color={selectedMember?.color} />
                <Text variant="labelLarge" style={{ color: selectedMember?.color }}>Notes</Text>
              </View>
              <RichToolbar
                editor={richEditorRef}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                  actions.indent,
                  actions.outdent,
                ]}
                iconTint={theme.colors.onSurface}
                selectedIconTint={selectedMember?.color || theme.colors.primary}
                style={[styles.richToolbar, { backgroundColor: theme.colors.surfaceVariant }]}
              />
              <View style={[styles.editorContainer, { borderColor: theme.colors.outline }]}>
                <RichEditor
                  key={`${selectedSection.id}-${currentDate}`}
                  ref={richEditorRef}
                  initialContentHTML={getSectionNotes(selectedSection.id)}
                  onChange={(html) => handleNotesChange(selectedSection.id, html)}
                  onFocus={() => {
                    // Scroll to show the notes editor when focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd(true);
                    }, 300);
                  }}
                  placeholder="Add notes for today..."
                  style={styles.richEditor}
                  editorStyle={{
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.onSurface,
                    placeholderColor: theme.colors.onSurfaceVariant,
                    contentCSSText: 'font-size: 16px; padding: 8px;',
                  }}
                />
              </View>
            </Surface>
          </>
        )}
      </KeyboardAwareScrollView>
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
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  todayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  memberTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  memberDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberTabText: {
    color: '#666',
  },
  sectionTabsContainer: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sectionTabsContent: {
    paddingHorizontal: 12,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  sectionTabText: {
    color: '#666',
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptySection: {
    alignItems: 'center',
    padding: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  emptySectionTitle: {
    marginTop: 16,
    marginBottom: 4,
  },
  emptySectionText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  emptyTasks: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  emptyTasksText: {
    marginTop: 12,
    opacity: 0.6,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    padding: 18,
    borderRadius: 16,
  },
  checkboxTask: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  taskLabel: {
    flex: 1,
  },
  taskCompleted: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  taskInputLabel: {
    marginBottom: 10,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: 'transparent',
  },
  numericTask: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numericInfo: {
    flex: 1,
    gap: 4,
  },
  numericInput: {
    width: 100,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  notesCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  richToolbar: {
    borderRadius: 8,
    marginBottom: 8,
  },
  editorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 120,
  },
  richEditor: {
    minHeight: 120,
  },
});
