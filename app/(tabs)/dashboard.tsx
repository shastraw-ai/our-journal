import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Chip,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, subDays, parseISO } from 'date-fns';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useEntriesStore } from '../../src/stores/entriesStore';
import { FamilyMember, Section, Task, DailyEntry } from '../../src/types';

const screenWidth = Dimensions.get('window').width;

type DateRange = '7' | '14' | '30';

export default function DashboardScreen() {
  const theme = useTheme();
  const { members, loadSettings } = useSettingsStore();
  const { getEntriesForRange, loadEntriesForMonth } = useEntriesStore();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('7');

  useEffect(() => {
    loadSettings();
    // Load entries for current and previous months
    const today = new Date();
    loadEntriesForMonth(format(today, 'yyyy-MM'));
    loadEntriesForMonth(format(subDays(today, 30), 'yyyy-MM'));
  }, []);

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
      {/* Member Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.selector}
        contentContainerStyle={styles.selectorContent}
      >
        {members.map((member) => (
          <Chip
            key={member.id}
            selected={selectedMemberId === member.id}
            onPress={() => setSelectedMemberId(member.id)}
            style={[
              styles.chip,
              selectedMemberId === member.id && { backgroundColor: member.color + '40' },
            ]}
            textStyle={selectedMemberId === member.id ? { color: member.color } : undefined}
          >
            {member.name}
          </Chip>
        ))}
      </ScrollView>

      {/* Section Selector */}
      {selectedMember && selectedMember.sections.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selector}
          contentContainerStyle={styles.selectorContent}
        >
          {selectedMember.sections.map((section) => (
            <Chip
              key={section.id}
              selected={selectedSectionId === section.id}
              onPress={() => setSelectedSectionId(section.id)}
              style={styles.chip}
              mode={selectedSectionId === section.id ? 'flat' : 'outlined'}
            >
              {section.name}
            </Chip>
          ))}
        </ScrollView>
      )}

      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        <SegmentedButtons
          value={dateRange}
          onValueChange={(value) => setDateRange(value as DateRange)}
          buttons={[
            { value: '7', label: '7 Days' },
            { value: '14', label: '14 Days' },
            { value: '30', label: '30 Days' },
          ]}
          style={styles.segmentedButtons}
        />
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
  selector: {
    maxHeight: 56,
  },
  selectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    marginRight: 4,
  },
  dateRangeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedButtons: {
    maxWidth: 300,
    alignSelf: 'center',
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
