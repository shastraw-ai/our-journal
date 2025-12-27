import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Surface,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, subDays, parseISO, differenceInDays, startOfMonth, endOfMonth, subMonths, getDaysInMonth } from 'date-fns';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useEntriesStore } from '../../src/stores/entriesStore';
import { Task, FamilyMember } from '../../src/types';

const screenWidth = Dimensions.get('window').width;

type DashboardView = 'charts' | 'rewards';
type DateRange = '7' | '30' | '90' | '365';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Week', icon: 'calendar-week' },
  { value: '30', label: 'Month', icon: 'calendar-month' },
  { value: '90', label: '3 Months', icon: 'calendar-range' },
  { value: '365', label: 'Year', icon: 'calendar' },
];

// Coin component for rewards display
const CoinDisplay = ({ completed, total, color }: { completed: number; total: number; color: string }) => {
  const theme = useTheme();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const coinsToShow = Math.min(total, 10); // Show max 10 coins for visual
  const completedCoins = Math.round((completed / total) * coinsToShow);

  return (
    <View style={styles.coinContainer}>
      <View style={styles.coinsRow}>
        {Array.from({ length: coinsToShow }).map((_, index) => (
          <View key={index} style={styles.coinWrapper}>
            <MaterialCommunityIcons
              name="circle"
              size={32}
              color={index < completedCoins ? '#FFD700' : '#E0E0E0'}
            />
            <MaterialCommunityIcons
              name="star-four-points"
              size={14}
              color={index < completedCoins ? '#FFA000' : '#BDBDBD'}
              style={styles.coinInner}
            />
          </View>
        ))}
      </View>
      <View style={styles.coinStats}>
        <Text variant="headlineMedium" style={[styles.coinCount, { color }]}>
          {completed}
        </Text>
        <Text variant="bodyMedium" style={styles.coinLabel}>
          / {total} coins earned
        </Text>
      </View>
      <View style={[styles.percentageBadge, { backgroundColor: color + '20' }]}>
        <Text variant="titleMedium" style={{ color, fontWeight: '700' }}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const theme = useTheme();
  const { members, loadSettings } = useSettingsStore();
  const { getEntriesForRange, loadEntriesForMonth } = useEntriesStore();

  const [dashboardView, setDashboardView] = useState<DashboardView>('charts');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('7');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
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

  // Load current and previous month entries for rewards
  useEffect(() => {
    const today = new Date();
    const prevMonth = subMonths(today, 1);
    loadEntriesForMonth(format(today, 'yyyy-MM'));
    loadEntriesForMonth(format(prevMonth, 'yyyy-MM'));
  }, []);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Calculate rewards for all members
  const calculateMonthRewards = (targetMonth: Date, daysToCount?: number) => {
    const daysInMonth = daysToCount ?? getDaysInMonth(targetMonth);
    const startDate = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
    const endDate = daysToCount
      ? format(targetMonth, 'yyyy-MM-dd') // Current month: up to today
      : format(endOfMonth(targetMonth), 'yyyy-MM-dd'); // Previous month: full month

    return members.map((member) => {
      const entries = getEntriesForRange(member.id, startDate, endDate);

      // Count total checkbox tasks across all sections
      let totalCheckboxTasks = 0;
      member.sections.forEach((section) => {
        totalCheckboxTasks += section.tasks.filter((t) => t.type === 'checkbox').length;
      });

      // Total possible coins = checkbox tasks * days
      const totalPossibleCoins = totalCheckboxTasks * daysInMonth;

      // Count completed tasks
      let completedCoins = 0;
      entries.forEach((entry) => {
        entry.sectionEntries.forEach((sectionEntry) => {
          const section = member.sections.find((s) => s.id === sectionEntry.sectionId);
          if (section) {
            const checkboxTasks = section.tasks.filter((t) => t.type === 'checkbox');
            checkboxTasks.forEach((task) => {
              const response = sectionEntry.taskResponses.find((tr) => tr.taskId === task.id);
              if (response?.value === true) {
                completedCoins++;
              }
            });
          }
        });
      });

      return {
        member,
        completedCoins,
        totalPossibleCoins,
        entriesCount: entries.length,
      };
    });
  };

  // Previous month rewards
  const prevMonthRewardsData = useMemo(() => {
    const prevMonth = subMonths(new Date(), 1);
    return {
      month: format(prevMonth, 'MMMM yyyy'),
      data: calculateMonthRewards(prevMonth),
    };
  }, [members, getEntriesForRange]);

  // Current month rewards (so far)
  const currentMonthRewardsData = useMemo(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return {
      month: format(today, 'MMMM yyyy'),
      daysElapsed: dayOfMonth,
      totalDays: getDaysInMonth(today),
      data: calculateMonthRewards(today, dayOfMonth),
    };
  }, [members, getEntriesForRange]);
  const selectedSection = selectedMember?.sections.find((s) => s.id === selectedSectionId);

  // Get all entries for the selected member (to find first entry date)
  const allEntries = useMemo(() => {
    if (!selectedMemberId) return [];
    const today = new Date();
    const startDate = format(subDays(today, 365), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');
    return getEntriesForRange(selectedMemberId, startDate, endDate);
  }, [selectedMemberId, getEntriesForRange]);

  // Find the first entry date for this section
  const firstEntryDate = useMemo(() => {
    if (!selectedSection || allEntries.length === 0) return null;

    const entriesWithSection = allEntries.filter((entry) =>
      entry.sectionEntries.some((se) => se.sectionId === selectedSection.id)
    );

    if (entriesWithSection.length === 0) return null;

    const sortedEntries = [...entriesWithSection].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return sortedEntries[0].date;
  }, [allEntries, selectedSection]);

  // Get entries for the selected date range, but limited to first entry date
  const entries = useMemo(() => {
    if (!selectedMemberId) return [];
    const today = new Date();
    let startDate = format(subDays(today, parseInt(dateRange) - 1), 'yyyy-MM-dd');

    // If we have a first entry date and it's after our calculated start date, use it
    if (firstEntryDate && firstEntryDate > startDate) {
      startDate = firstEntryDate;
    }

    const endDate = format(today, 'yyyy-MM-dd');
    return getEntriesForRange(selectedMemberId, startDate, endDate);
  }, [selectedMemberId, dateRange, firstEntryDate, getEntriesForRange]);

  // Calculate the effective date range (from first entry to today)
  const effectiveDays = useMemo(() => {
    if (!firstEntryDate) return 0;
    const today = new Date();
    const requestedDays = parseInt(dateRange);
    const daysSinceFirstEntry = differenceInDays(today, parseISO(firstEntryDate)) + 1;
    return Math.min(requestedDays, daysSinceFirstEntry);
  }, [firstEntryDate, dateRange]);

  // Calculate checkbox task completion data - only from first entry date
  const checkboxData = useMemo(() => {
    if (!selectedSection || !firstEntryDate || effectiveDays === 0) return null;

    const checkboxTasks = selectedSection.tasks.filter((t) => t.type === 'checkbox');
    if (checkboxTasks.length === 0) return null;

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = effectiveDays - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (date < firstEntryDate) continue;

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

    if (data.length === 0) return null;

    // Calculate average completion
    const average = Math.round(data.reduce((a, b) => a + b, 0) / data.length);

    return { labels, data, taskCount: checkboxTasks.length, average };
  }, [selectedSection, entries, effectiveDays, firstEntryDate]);

  // Calculate numeric task data - only from first entry date
  const numericData = useMemo(() => {
    if (!selectedSection || !firstEntryDate || effectiveDays === 0) return [];

    const numericTasks = selectedSection.tasks.filter((t) => t.type === 'numeric');
    if (numericTasks.length === 0) return [];

    return numericTasks.map((task) => {
      const labels: string[] = [];
      const data: number[] = [];

      for (let i = effectiveDays - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        if (date < firstEntryDate) continue;

        labels.push(format(parseISO(date), 'M/d'));

        const entry = entries.find((e) => e.date === date);
        const sectionEntry = entry?.sectionEntries.find((se) => se.sectionId === selectedSection.id);
        const response = sectionEntry?.taskResponses.find((tr) => tr.taskId === task.id);

        data.push(typeof response?.value === 'number' ? response.value : 0);
      }

      // Calculate average and total
      const total = data.reduce((a, b) => a + b, 0);
      const average = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0;

      return { task, labels, data, average, total };
    });
  }, [selectedSection, entries, effectiveDays, firstEntryDate]);

  // Calculate streak for checkbox tasks
  const streak = useMemo(() => {
    if (!selectedSection) return 0;

    const checkboxTasks = selectedSection.tasks.filter((t) => t.type === 'checkbox');
    if (checkboxTasks.length === 0) return 0;

    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = allEntries.find((e) => e.date === date);
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
  }, [selectedSection, allEntries]);

  const memberColor = selectedMember?.color || theme.colors.primary;

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => `${memberColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: () => theme.colors.onSurfaceVariant,
    strokeWidth: 3,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    propsForBackgroundLines: {
      strokeDasharray: '4 4',
      stroke: theme.colors.outlineVariant,
      strokeWidth: 1,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: theme.colors.surface,
      fill: memberColor,
    },
    propsForLabels: {
      fontSize: 11,
    },
    fillShadowGradientFrom: memberColor,
    fillShadowGradientTo: memberColor,
    fillShadowGradientFromOpacity: 0.3,
    fillShadowGradientToOpacity: 0.05,
  };

  const getSmartLabels = (labels: string[], maxLabels: number = 6) => {
    if (labels.length <= maxLabels) return labels;
    const step = Math.ceil(labels.length / maxLabels);
    return labels.map((label, i) => (i % step === 0 || i === labels.length - 1) ? label : '');
  };

  if (members.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Surface style={styles.emptyCard} elevation={0}>
          <MaterialCommunityIcons name="chart-line" size={64} color={theme.colors.onSurfaceVariant} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>No Data Yet</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add family members in Settings to start tracking and see charts here.
          </Text>
        </Surface>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* View Toggle - Charts vs Rewards */}
      <View style={styles.viewToggleContainer}>
        <Pressable
          onPress={() => setDashboardView('charts')}
          style={[
            styles.viewToggleTab,
            dashboardView === 'charts' && { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-line"
            size={20}
            color={dashboardView === 'charts' ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelLarge"
            style={{ color: dashboardView === 'charts' ? theme.colors.primary : theme.colors.onSurfaceVariant }}
          >
            Charts
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDashboardView('rewards')}
          style={[
            styles.viewToggleTab,
            dashboardView === 'rewards' && { backgroundColor: '#FFF8E1' },
          ]}
        >
          <MaterialCommunityIcons
            name="star-circle"
            size={20}
            color={dashboardView === 'rewards' ? '#FFA000' : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelLarge"
            style={{ color: dashboardView === 'rewards' ? '#FFA000' : theme.colors.onSurfaceVariant }}
          >
            Rewards
          </Text>
        </Pressable>
      </View>

      {/* Member Tabs - Only show for Charts view */}
      {dashboardView === 'charts' && (
        <Surface style={styles.tabsContainer} elevation={1}>
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
        </Surface>
      )}

      {/* Section Tabs - Only show for Charts view */}
      {dashboardView === 'charts' && selectedMember && selectedMember.sections.length > 0 && (
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
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Date Range Selector - Only show for Charts view */}
      {dashboardView === 'charts' && (
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
                    backgroundColor: memberColor + '15',
                    borderColor: memberColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={16}
                  color={isSelected ? memberColor : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelMedium"
                  style={[
                    styles.dateRangeText,
                    isSelected && { color: memberColor, fontWeight: '600' }
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      )}

      {/* Charts View Content */}
      {dashboardView === 'charts' && (
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!selectedSection && (
          <Surface style={styles.emptySection} elevation={0}>
            <MaterialCommunityIcons name="folder-open-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={styles.emptySectionTitle}>No Sections</Text>
            <Text variant="bodyMedium" style={styles.emptySectionText}>
              Add sections for this member in Settings.
            </Text>
          </Surface>
        )}

        {/* Stats Summary */}
        {selectedSection && (
          <View style={styles.statsRow}>
            <Surface style={[styles.statCard, { borderLeftColor: memberColor }]} elevation={1}>
              <MaterialCommunityIcons name="fire" size={24} color={memberColor} />
              <Text variant="headlineMedium" style={[styles.statValue, { color: memberColor }]}>
                {streak}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Day Streak</Text>
            </Surface>
            <Surface style={[styles.statCard, { borderLeftColor: memberColor }]} elevation={1}>
              <MaterialCommunityIcons name="calendar-check" size={24} color={memberColor} />
              <Text variant="headlineMedium" style={[styles.statValue, { color: memberColor }]}>
                {entries.length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Entries</Text>
            </Surface>
            {checkboxData && (
              <Surface style={[styles.statCard, { borderLeftColor: memberColor }]} elevation={1}>
                <MaterialCommunityIcons name="percent" size={24} color={memberColor} />
                <Text variant="headlineMedium" style={[styles.statValue, { color: memberColor }]}>
                  {checkboxData.average}
                </Text>
                <Text variant="labelSmall" style={styles.statLabel}>Avg Done</Text>
              </Surface>
            )}
          </View>
        )}

        {/* Checkbox Completion Chart */}
        {checkboxData && checkboxData.data.length > 1 && (
          <Surface style={styles.chartCard} elevation={1}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color={memberColor} />
                <Text variant="titleMedium" style={styles.chartTitle}>Task Completion</Text>
              </View>
              <View style={[styles.chartBadge, { backgroundColor: memberColor + '20' }]}>
                <Text variant="labelSmall" style={{ color: memberColor }}>
                  {checkboxData.taskCount} task{checkboxData.taskCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Divider style={styles.chartDivider} />
            <LineChart
              data={{
                labels: getSmartLabels(checkboxData.labels),
                datasets: [{ data: checkboxData.data, strokeWidth: 3 }],
              }}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisSuffix="%"
              fromZero
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLabels={true}
              segments={4}
            />
          </Surface>
        )}

        {/* Numeric Task Charts */}
        {numericData.map(({ task, labels, data, average, total }) => (
          data.length > 1 && data.some((d) => d > 0) && (
            <Surface key={task.id} style={styles.chartCard} elevation={1}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <MaterialCommunityIcons name="numeric" size={20} color={memberColor} />
                  <Text variant="titleMedium" style={styles.chartTitle}>{task.name}</Text>
                </View>
                {task.unit && (
                  <View style={[styles.chartBadge, { backgroundColor: memberColor + '20' }]}>
                    <Text variant="labelSmall" style={{ color: memberColor }}>{task.unit}</Text>
                  </View>
                )}
              </View>
              <View style={styles.numericStats}>
                <View style={styles.numericStat}>
                  <Text variant="labelSmall" style={styles.numericStatLabel}>Average</Text>
                  <Text variant="titleMedium" style={{ color: memberColor }}>{average}</Text>
                </View>
                <View style={styles.numericStat}>
                  <Text variant="labelSmall" style={styles.numericStatLabel}>Total</Text>
                  <Text variant="titleMedium" style={{ color: memberColor }}>{total}</Text>
                </View>
              </View>
              <Divider style={styles.chartDivider} />
              <BarChart
                data={{
                  labels: getSmartLabels(labels),
                  datasets: [{ data: data.length > 0 ? data : [0] }],
                }}
                width={screenWidth - 48}
                height={180}
                chartConfig={{
                  ...chartConfig,
                  barPercentage: Math.min(0.8, 6 / data.length),
                }}
                style={styles.chart}
                fromZero
                showValuesOnTopOfBars={data.length <= 14}
                withInnerLines={true}
                showBarTops={false}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </Surface>
          )
        ))}

        {selectedSection && !firstEntryDate && (
          <Surface style={styles.noDataCard} elevation={0}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={56} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={styles.noDataTitle}>No Data Yet</Text>
            <Text variant="bodyMedium" style={styles.noDataText}>
              Start logging entries in the Journal tab to see your progress charts here.
            </Text>
          </Surface>
        )}

        {selectedSection && firstEntryDate && effectiveDays === 1 && (
          <Surface style={styles.noDataCard} elevation={0}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={56} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={styles.noDataTitle}>Keep Going!</Text>
            <Text variant="bodyMedium" style={styles.noDataText}>
              You have 1 day of data. Charts will appear after you log more entries.
            </Text>
          </Surface>
        )}
      </ScrollView>
      )}

      {/* Rewards View Content */}
      {dashboardView === 'rewards' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Current Month Section */}
          <Surface style={[styles.rewardsHeader, { backgroundColor: '#E3F2FD' }]} elevation={1}>
            <MaterialCommunityIcons name="calendar-clock" size={32} color="#1976D2" />
            <Text variant="headlineSmall" style={[styles.rewardsTitle, { color: '#1565C0' }]}>
              {currentMonthRewardsData.month}
            </Text>
            <Text variant="bodyMedium" style={styles.rewardsSubtitle}>
              Day {currentMonthRewardsData.daysElapsed} of {currentMonthRewardsData.totalDays} • In Progress
            </Text>
          </Surface>

          {/* Current Month Member Cards */}
          {currentMonthRewardsData.data.map(({ member, completedCoins, totalPossibleCoins, entriesCount }) => (
            <Surface key={`current-${member.id}`} style={styles.rewardCard} elevation={2}>
              <View style={styles.rewardCardHeader}>
                <View style={[styles.memberDot, { backgroundColor: member.color, width: 14, height: 14, borderRadius: 7 }]} />
                <Text variant="titleMedium" style={styles.rewardMemberName}>{member.name}</Text>
                <View style={[styles.inProgressBadge]}>
                  <Text variant="labelSmall" style={styles.inProgressText}>In Progress</Text>
                </View>
              </View>

              {totalPossibleCoins > 0 ? (
                <CoinDisplay
                  completed={completedCoins}
                  total={totalPossibleCoins}
                  color={member.color}
                />
              ) : (
                <View style={styles.noRewardsContainer}>
                  <MaterialCommunityIcons name="star-off-outline" size={40} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={styles.noRewardsText}>
                    No checkbox tasks configured
                  </Text>
                </View>
              )}

              <View style={styles.rewardMeta}>
                <View style={styles.rewardMetaItem}>
                  <MaterialCommunityIcons name="calendar-check" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.rewardMetaText}>
                    {entriesCount} of {currentMonthRewardsData.daysElapsed} days logged
                  </Text>
                </View>
              </View>
            </Surface>
          ))}

          {/* Previous Month Section */}
          <Surface style={styles.rewardsHeader} elevation={1}>
            <MaterialCommunityIcons name="trophy" size={32} color="#FFD700" />
            <Text variant="headlineSmall" style={styles.rewardsTitle}>
              {prevMonthRewardsData.month}
            </Text>
            <Text variant="bodyMedium" style={styles.rewardsSubtitle}>
              Final Results
            </Text>
          </Surface>

          {/* Previous Month Member Cards */}
          {prevMonthRewardsData.data.map(({ member, completedCoins, totalPossibleCoins, entriesCount }) => (
            <Surface key={`prev-${member.id}`} style={styles.rewardCard} elevation={2}>
              <View style={styles.rewardCardHeader}>
                <View style={[styles.memberDot, { backgroundColor: member.color, width: 14, height: 14, borderRadius: 7 }]} />
                <Text variant="titleMedium" style={styles.rewardMemberName}>{member.name}</Text>
              </View>

              {totalPossibleCoins > 0 ? (
                <CoinDisplay
                  completed={completedCoins}
                  total={totalPossibleCoins}
                  color={member.color}
                />
              ) : (
                <View style={styles.noRewardsContainer}>
                  <MaterialCommunityIcons name="star-off-outline" size={40} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={styles.noRewardsText}>
                    No checkbox tasks configured
                  </Text>
                </View>
              )}

              <View style={styles.rewardMeta}>
                <View style={styles.rewardMetaItem}>
                  <MaterialCommunityIcons name="calendar-check" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.rewardMetaText}>
                    {entriesCount} days logged
                  </Text>
                </View>
              </View>
            </Surface>
          ))}

          {members.length === 0 && (
            <Surface style={styles.noDataCard} elevation={0}>
              <MaterialCommunityIcons name="account-group-outline" size={56} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={styles.noDataTitle}>No Members</Text>
              <Text variant="bodyMedium" style={styles.noDataText}>
                Add family members in Settings to track rewards.
              </Text>
            </Surface>
          )}
        </ScrollView>
      )}
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
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  tabsContainer: {
    borderBottomWidth: 0,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  sectionTabText: {
    color: '#666',
  },
  dateRangeContainer: {
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dateRangeContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dateRangeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'transparent',
  },
  dateRangeText: {
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  emptySection: {
    alignItems: 'center',
    padding: 40,
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  statValue: {
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    opacity: 0.6,
    marginTop: 2,
  },
  chartCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontWeight: '600',
  },
  chartBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chartDivider: {
    marginHorizontal: 16,
  },
  chart: {
    marginVertical: 12,
    marginLeft: -8,
  },
  numericStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
    marginBottom: 8,
  },
  numericStat: {
    alignItems: 'center',
  },
  numericStatLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  noDataCard: {
    alignItems: 'center',
    padding: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  noDataTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
  // View Toggle Styles
  viewToggleContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  viewToggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  // Coin Display Styles
  coinContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  coinsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  coinWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinInner: {
    position: 'absolute',
  },
  coinStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  coinCount: {
    fontWeight: '700',
  },
  coinLabel: {
    opacity: 0.6,
  },
  percentageBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  // Rewards Styles
  rewardsHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#FFFDE7',
  },
  rewardsTitle: {
    marginTop: 8,
    fontWeight: '700',
    color: '#F57F17',
  },
  rewardsSubtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  rewardCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#fff',
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  rewardMemberName: {
    fontWeight: '600',
  },
  noRewardsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noRewardsText: {
    marginTop: 8,
    opacity: 0.6,
  },
  rewardMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  rewardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardMetaText: {
    opacity: 0.6,
  },
  inProgressBadge: {
    marginLeft: 'auto',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inProgressText: {
    color: '#1976D2',
    fontWeight: '600',
  },
});
