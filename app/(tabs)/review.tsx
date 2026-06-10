import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { useUser, useActiveRoutine, useWeeklyReport } from '../../src/hooks/useQueries';
import { generateWeeklyReport } from '../../src/services/behavior/weeklyReportGenerator';

export default function ReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { data: routine } = useActiveRoutine(user?.id);
  const { data: report, isLoading: reportLoading } = useWeeklyReport(user?.id);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!user?.id || !routine?.id) return;
    setIsGenerating(true);
    try {
      generateWeeklyReport(user.id, routine.id);
      queryClient.invalidateQueries({ queryKey: ['weekly_report'] });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRebuild = () => {
    Alert.alert(
      'Rebuild Routine',
      'This will archive your current routine and walk you through generating a new one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rebuild', 
          style: 'destructive',
          onPress: () => {
            // Future: Archive routine logic, then route to onboarding generator
            router.push('/(auth)/onboarding');
          }
        }
      ]
    );
  };

  if (reportLoading) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Review</Text>
          <Button 
            title={report ? "Refresh" : "Run Analysis"} 
            onPress={handleGenerate} 
            loading={isGenerating}
            variant="outline-dark"
          />
        </View>

        {!report ? (
          <View style={styles.empty}>
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.emptyText}>No report generated yet. Tap to run analysis on your recent behavior.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.dateRange}>Week of {new Date(report.weekStart).toLocaleDateString()} – {new Date(report.weekEnd).toLocaleDateString()}</Text>

            {/* ─── Stats ─── */}
            <View style={styles.statsGrid}>
              <StatCard label="Consistency" value={`${report.consistencyScore}%`} />
              <StatCard label="Tasks Done" value={`${report.tasksCompleted}`} />
              <StatCard label="Tasks Missed" value={`${report.tasksMissed}`} />
              <StatCard label="Recovery" value={`${report.recoveryCompleted}`} />
            </View>

            {/* ─── Pattern Analysis ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Behavior Patterns</Text>
              <View style={styles.card}>
                <PatternRow label="Worst Day" value={report.pattern.worstDayOfWeek || 'None'} />
                <PatternRow label="Worst Time" value={report.pattern.worstTimeOfDay ? report.pattern.worstTimeOfDay.toUpperCase() : 'None'} />
                <PatternRow label="Most Skipped" value={report.pattern.mostSkippedCategory || 'None'} />
                <PatternRow label="Consecutive Misses" value={`${report.pattern.consecutiveMissDays} days`} />
                <PatternRow label="Critical Tasks Missed" value={`${report.pattern.missedCriticalCount}`} noBorder />
              </View>
            </View>

            {/* ─── Suggestions ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Actionable Suggestions</Text>
              {report.suggestions.length === 0 ? (
                <Text style={styles.bodyText}>Keep up the good work! No major issues detected.</Text>
              ) : (
                report.suggestions.map((s: any, idx: number) => (
                  <View key={idx} style={[styles.suggestionCard, s.severity === 'critical' && styles.criticalCard]}>
                    <View style={styles.suggestionHeader}>
                      <Text style={[styles.suggestionType, s.severity === 'critical' && { color: COLORS.danger }]}>
                        {s.type.toUpperCase().replace('_', ' ')}
                      </Text>
                      {s.severity === 'critical' && <Text style={{ fontSize: 16 }}>⚠️</Text>}
                    </View>
                    <Text style={styles.suggestionTitle}>{s.title}</Text>
                    <Text style={styles.suggestionDesc}>{s.description}</Text>
                    
                    {s.type === 'rebuild' && (
                      <Button 
                        title="Rebuild Routine" 
                        onPress={handleRebuild} 
                        style={{ marginTop: 12, backgroundColor: COLORS.danger }}
                        textStyle={{ color: '#fff' }}
                      />
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PatternRow({ label, value, noBorder = false }: { label: string; value: string; noBorder?: boolean }) {
  return (
    <View style={[styles.patternRow, !noBorder && styles.patternRowBorder]}>
      <Text style={styles.patternLabel}>{label}</Text>
      <Text style={styles.patternValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { ...TYPOGRAPHY.display, fontSize: 28 },
  dateRange: { ...TYPOGRAPHY.small, color: COLORS.txt2, marginBottom: 20, marginTop: -16 },
  
  empty: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 32,
    gap: 16,
  },
  icon: { fontSize: 48 },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.txt3, textAlign: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 16, alignItems: 'center'
  },
  statValue: { ...TYPOGRAPHY.display, fontSize: 24, marginBottom: 4 },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.txt3 },

  section: { marginBottom: 24 },
  sectionHead: { ...TYPOGRAPHY.small, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, color: COLORS.txt2 },
  card: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16,
  },
  patternRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  patternRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border2 },
  patternLabel: { ...TYPOGRAPHY.body, color: COLORS.txt2 },
  patternValue: { ...TYPOGRAPHY.bodyBold },

  suggestionCard: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  criticalCard: { borderColor: COLORS.danger, borderWidth: 2 },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  suggestionType: { ...TYPOGRAPHY.small, color: COLORS.txt3, fontWeight: '700', letterSpacing: 1 },
  suggestionTitle: { ...TYPOGRAPHY.title, fontSize: 16, marginBottom: 8 },
  suggestionDesc: { ...TYPOGRAPHY.body, color: COLORS.txt2, lineHeight: 20 },
  bodyText: { ...TYPOGRAPHY.body, color: COLORS.txt2 },
});
