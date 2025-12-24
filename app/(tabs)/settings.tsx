import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Button,
  Card,
  IconButton,
  Portal,
  Modal,
  TextInput,
  useTheme,
  List,
  Chip,
  SegmentedButtons,
  FAB,
  Divider,
} from 'react-native-paper';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { TaskType } from '../../src/types';

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

  // Expanded sections
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();
  }, []);

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
    }
    setMemberModalVisible(false);
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

  const saveSection = () => {
    if (!editingSection || !sectionName.trim()) return;
    if (editingSection.sectionId) {
      updateSection(editingSection.memberId, editingSection.sectionId, sectionName.trim());
    } else {
      addSection(editingSection.memberId, sectionName.trim());
    }
    setSectionModalVisible(false);
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

  const toggleMemberExpanded = (memberId: string) => {
    const newSet = new Set(expandedMembers);
    if (newSet.has(memberId)) {
      newSet.delete(memberId);
    } else {
      newSet.add(memberId);
    }
    setExpandedMembers(newSet);
  };

  const toggleSectionExpanded = (sectionId: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    setExpandedSections(newSet);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <Card style={styles.card}>
          <Card.Title title="Account" />
          <Card.Content>
            <Text variant="bodyMedium">
              {isGuest ? 'Guest Mode (local storage only)' : userEmail}
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={logout}>Sign Out</Button>
          </Card.Actions>
        </Card>

        {/* Members Section */}
        <Card style={styles.card}>
          <Card.Title
            title="Family Members"
            right={(props) => (
              <IconButton {...props} icon="plus" onPress={() => openMemberModal()} />
            )}
          />
          <Card.Content>
            {members.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No members added yet. Tap + to add a family member.
              </Text>
            ) : (
              members.map((member) => (
                <View key={member.id}>
                  <List.Accordion
                    title={member.name}
                    expanded={expandedMembers.has(member.id)}
                    onPress={() => toggleMemberExpanded(member.id)}
                    left={(props) => (
                      <View style={[styles.colorDot, { backgroundColor: member.color }]} />
                    )}
                    right={(props) => (
                      <View style={styles.rowActions}>
                        <IconButton icon="pencil" size={20} onPress={() => openMemberModal(member.id)} />
                        <IconButton icon="delete" size={20} onPress={() => deleteMember(member.id)} />
                      </View>
                    )}
                  >
                    {/* Sections */}
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <Text variant="labelLarge">Sections</Text>
                        <IconButton icon="plus" size={18} onPress={() => openSectionModal(member.id)} />
                      </View>
                      {member.sections.length === 0 ? (
                        <Text variant="bodySmall" style={styles.emptyText}>No sections</Text>
                      ) : (
                        member.sections.map((section) => (
                          <View key={section.id}>
                            <List.Accordion
                              title={section.name}
                              expanded={expandedSections.has(section.id)}
                              onPress={() => toggleSectionExpanded(section.id)}
                              style={styles.nestedAccordion}
                              right={() => (
                                <View style={styles.rowActions}>
                                  <IconButton icon="pencil" size={18} onPress={() => openSectionModal(member.id, section.id)} />
                                  <IconButton icon="delete" size={18} onPress={() => deleteSection(member.id, section.id)} />
                                </View>
                              )}
                            >
                              {/* Tasks */}
                              <View style={styles.taskContainer}>
                                <View style={styles.sectionHeader}>
                                  <Text variant="labelMedium">Tasks</Text>
                                  <IconButton icon="plus" size={16} onPress={() => openTaskModal(member.id, section.id)} />
                                </View>
                                {section.tasks.length === 0 ? (
                                  <Text variant="bodySmall" style={styles.emptyText}>No tasks</Text>
                                ) : (
                                  section.tasks.map((task) => (
                                    <View key={task.id} style={styles.taskItem}>
                                      <View style={styles.taskInfo}>
                                        <Text variant="bodyMedium">{task.name}</Text>
                                        <Chip compact style={styles.typeChip}>
                                          {task.type}{task.unit ? ` (${task.unit})` : ''}
                                        </Chip>
                                      </View>
                                      <View style={styles.rowActions}>
                                        <IconButton icon="pencil" size={16} onPress={() => openTaskModal(member.id, section.id, task.id)} />
                                        <IconButton icon="delete" size={16} onPress={() => deleteTask(member.id, section.id, task.id)} />
                                      </View>
                                    </View>
                                  ))
                                )}
                              </View>
                            </List.Accordion>
                          </View>
                        ))
                      )}
                    </View>
                  </List.Accordion>
                  <Divider />
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Member Modal */}
      <Portal>
        <Modal
          visible={memberModalVisible}
          onDismiss={() => setMemberModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingMember ? 'Edit Member' : 'Add Member'}
          </Text>
          <TextInput
            label="Name"
            value={memberName}
            onChangeText={setMemberName}
            style={styles.input}
          />
          <Text variant="labelMedium" style={styles.colorLabel}>Color</Text>
          <View style={styles.colorPicker}>
            {COLORS.map((color) => (
              <IconButton
                key={color}
                icon={memberColor === color ? 'check-circle' : 'circle'}
                iconColor={color}
                size={32}
                onPress={() => setMemberColor(color)}
              />
            ))}
          </View>
          <View style={styles.modalActions}>
            <Button onPress={() => setMemberModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={saveMember}>Save</Button>
          </View>
        </Modal>
      </Portal>

      {/* Section Modal */}
      <Portal>
        <Modal
          visible={sectionModalVisible}
          onDismiss={() => setSectionModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingSection?.sectionId ? 'Edit Section' : 'Add Section'}
          </Text>
          <TextInput
            label="Section Name"
            value={sectionName}
            onChangeText={setSectionName}
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setSectionModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={saveSection}>Save</Button>
          </View>
        </Modal>
      </Portal>

      {/* Task Modal */}
      <Portal>
        <Modal
          visible={taskModalVisible}
          onDismiss={() => setTaskModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingTask?.taskId ? 'Edit Task' : 'Add Task'}
          </Text>
          <TextInput
            label="Task Name"
            value={taskName}
            onChangeText={setTaskName}
            style={styles.input}
          />
          <Text variant="labelMedium" style={styles.typeLabel}>Type</Text>
          <SegmentedButtons
            value={taskType}
            onValueChange={(value) => setTaskType(value as TaskType)}
            buttons={[
              { value: 'checkbox', label: 'Checkbox' },
              { value: 'text', label: 'Text' },
              { value: 'numeric', label: 'Numeric' },
            ]}
            style={styles.segmentedButtons}
          />
          {taskType === 'numeric' && (
            <TextInput
              label="Unit (optional)"
              value={taskUnit}
              onChangeText={setTaskUnit}
              placeholder="e.g., minutes, glasses, pages"
              style={styles.input}
            />
          )}
          <View style={styles.modalActions}>
            <Button onPress={() => setTaskModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={saveTask}>Save</Button>
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
  },
  card: {
    marginBottom: 16,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 8,
  },
  rowActions: {
    flexDirection: 'row',
  },
  sectionContainer: {
    paddingLeft: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nestedAccordion: {
    paddingLeft: 8,
  },
  taskContainer: {
    paddingLeft: 16,
    paddingBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    height: 24,
  },
  emptyText: {
    fontStyle: 'italic',
    opacity: 0.6,
    paddingVertical: 8,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  colorLabel: {
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeLabel: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
