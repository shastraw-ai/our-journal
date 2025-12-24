import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Chip,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, subDays, subMonths, subYears, parseISO } from 'date-fns';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useEntriesStore } from '../../src/stores/entriesStore';
import { FamilyMember, Section, Task, DailyEntry } from '../../src/types';

const screenWidth = Dimensions.get('window').width;

type DateRange = '7' | '30' | '90' | '365';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Week', icon: 'calendar-week' },
  { value: '30', label: 'Month', icon: 'calendar-month' },
  { value: '90', label: '3 Months', icon: 'calendar-range' },
  { value: '365', label: 'Year', icon: 'calendar' },
];

export default function DashboardScreen() {
  const theme = useTheme();
  const { members, loadSettings } = useSettingsStore();
  const { getEntriesForRange, loadEntriesForMonth } = useEntriesStore();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('7');

  useEffect(() => {
    loadSettings();
    // Load entries for current and previous months based on date range
    const today = new Date();
    const months = new Set<string>();
    const daysToLoad = parseInt(dateRange);
    for (let i = 0; i <= daysToLoad; i += 15) {
      months.add(format(subDays(today, i), 'yyyy-MM'));
    }
    months.forEach((month) => loadEntriesForMonth(month));
  }, [dateRange]);

  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members]);

  useEffect(() => {
    if (selectedMemberId) {
      const member = members.find((m) => m.id === selectedMemberId);
      if (member && member.sections.length > 0 && !selectedSectionId) {
        setSelectedSectionId(member.sections[0].id);
      } else if (member && !member.sections.find((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(member.sections[0]?.id || null);
      }
    }
  }, [selectedMemberId, members]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const selectedSection = selectedMember?.sections.find((s) => s.id === selectedSectionId);

  // Get entries for the selected date range
  const entries = useMemo(() => {
    if (!selectedMemberId) return [];
    const today = new Date();
    const startDate = format(subDays(today, parseInt(dateRange) - 1), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');
    return getEntriesForRange(selectedMemberId, startDate, endDate);
  }, [selectedMemberId, dateRange, getEntriesForRange]);

  // Calculate checkbox task completion data
  const checkboxData = useMemo(() => {
    if (!selectedSection) return null;

    const checkboxTasks = selectedSection.tasks.filter((t) => t.type === 'checkbox');
    if (checkboxTasks.length === 0) return null;

    const days = parseInt(dateRange);
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      labels.push(format(parseISO(date), 'M/d'));

      const entry = entries.find((e) => e.date === date);
      const sectionEntry = entry?.sectionEntries.find((se) => se.sectionId === selectedSection.id);

      if (sectionEntry) {
        let completed = 0;
        checkboxTasks.forEach((task) => {
          const response = sectionEntry.taskResponses.find((tr) => tr.taskId === task.id);
          if (response?.value === true) completed++;
        });
        data.push(Math.round((completed / checkboxTasks.length) * 100));
      } else {
        data.push(0);
      }
    }

    return { labels, data, taskCount: checkboxTasks.length };
  }, [selectedSection, entries, dateRange]);

  // Calculate numeric task data
  const numericData = useMemo(() => {
    if (!selectedSection) return [];

    const numericTasks = selectedSection.tasks.filter((t) => t.type === 'numeric');
    if (numericTasks.length === 0) return [];

    return numericTasks.map((task) => {
      const days = parseInt(dateRange);
      const labels: string[] = [];
      const data: number[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        labels.push(format(parseISO(date), 'M/d'));

        const entry = entries.find((e) => e.date === date);
        const sectionEntry = entry?.sectionEntries.find((se) => se.sectionId === selectedSection.id);
        const response = sectionEntry?.taskResponses.find((tr) => tr.taskId === task.id);

        data.push(typeof response?.value === 'number' ? response.value : 0);
      }

      return { task, labels, data };
    });
  }, [selectedSection, entries, dateRange]);

  // Calculate streak for checkbox tasks
  const streak = useMemo(() => {
    if (!selectedSection || !checkboxData) return 0;

    const checkboxTasks = selectedSection.tasks.filter((t) => t.type === 'checkbox');
    if (checkboxTasks.length === 0) return 0;

    let currentStreak = 0;
    for (let i = 0; i < 30; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === date);
      const sectionEntry = entry?.sectionEntries.find((se) => se.sectionId === selectedSection.id);

      if (sectionEntry) {
        let allCompleted = true;
        checkboxTasks.forEach((task) => {
          const response = sectionEntry.taskResponses.find((tr) => tr.taskId === task.id);
          if (response?.value !== true) allCompleted = false;
        });
        if (allCompleted) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return currentStreak;
  }, [selectedSection, entries]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => selectedMember?.color || theme.colors.primary,
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: selectedMember?.color || theme.colors.primary,
    },
  };

  if (members.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">No family members configured yet.</Text>
        <Text variant="bodyMedium" style={styles.hint}>Add members in Settings to see dashboard.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
              return (
                <Pressable
                  key={section.id}
                  onPress={() => setSelectedSectionId(section.id)}
                  style={[
                    styles.sectionTab,
                    isSelected && {
                      backgroundColor: selectedMember.color + '15',
                      borderBottomColor: selectedMember.color,
                      borderBottomWidth: 2,
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
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRangeContent}
        >
          {DATE_RANGE_OPTIONS.map((option) => {
            const isSelected = dateRange === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDateRange(option.value as DateRange)}
                style={[
                  styles.dateRangeTab,
                  isSelected && {
                    backgroundColor: (selectedMember?.color || theme.colors.primary) + '20',
                    borderColor: selectedMember?.color || theme.colors.primary,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={18}
                  color={isSelected ? selectedMember?.color || theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelMedium"
                  style={[
                    styles.dateRangeText,
                    isSelected && { color: selectedMember?.color || theme.colors.primary, fontWeight: '600' }
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!selectedSection && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.noData}>
                No sections configured for this member.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Stats Summary */}
        {selectedSection && (
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text variant="displaySmall" style={{ color: selectedMember?.color }}>
                  {streak}
                </Text>
                <Text variant="labelMedium">Day Streak</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Text variant="displaySmall" style={{ color: selectedMember?.color }}>
                  {entries.length}
                </Text>
                <Text variant="labelMedium">Entries</Text>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Checkbox Completion Chart */}
        {checkboxData && checkboxData.data.some((d) => d > 0) && (
          <Card style={styles.card}>
            <Card.Title title="Task Completion %" />
            <Card.Content>
              <LineChart
                data={{
                  labels: checkboxData.labels.filter((_, i) => i % Math.ceil(checkboxData.labels.length / 7) === 0),
                  datasets: [{ data: checkboxData.data.length > 0 ? checkboxData.data : [0] }],
                }}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                yAxisSuffix="%"
                fromZero
              />
              <Text variant="bodySmall" style={styles.chartHint}>
                Based on {checkboxData.taskCount} checkbox task(s)
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Numeric Task Charts */}
        {numericData.map(({ task, labels, data }) => (
          data.some((d) => d > 0) && (
            <Card key={task.id} style={styles.card}>
              <Card.Title
                title={task.name}
                subtitle={task.unit ? `Unit: ${task.unit}` : undefined}
              />
              <Card.Content>
                <BarChart
                  data={{
                    labels: labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0),
                    datasets: [{ data: data.length > 0 ? data : [0] }],
                  }}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix={task.unit ? ` ${task.unit}` : ''}
                />
              </Card.Content>
            </Card>
          )
        ))}

        {selectedSection &&
          !checkboxData?.data.some((d) => d > 0) &&
          !numericData.some(({ data }) => data.some((d) => d > 0)) && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.noData}>
                  No data recorded for this period.{'\n'}
                  Start logging entries in the Journal tab!
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
  hint: {
    marginTop: 8,
    opacity: 0.7,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  memberTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
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
  },
  sectionTabsContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionTabText: {
    color: '#666',
  },
  dateRangeContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  dateRangeContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateRangeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  dateRangeText: {
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartHint: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
  },
  noData: {
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 24,
  },
});
