import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser, useAllActiveRoutines } from '../../../src/hooks/useQueries';
import { COLORS, TYPOGRAPHY } from '../../../src/constants/theme';
import { Plus } from 'lucide-react-native';

export default function RoutinesHubScreen() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: routines, isLoading: routinesLoading } = useAllActiveRoutines(user?.id);

  if (userLoading || routinesLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.txt} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>My Hub</Text>
          <Text style={styles.subtitle}>Manage your active routines</Text>
        </View>

        <View style={styles.grid}>
          {routines && routines.map((r: any) => (
            <TouchableOpacity 
              key={r.id} 
              style={styles.routineCard}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/(tabs)/routine/[id]', params: { id: r.id } })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.routineTag}>{r.routine_type || '🗓️'}</Text>
                <Text style={styles.routineTitle}>{r.title}</Text>
              </View>
              <Text style={styles.routineGoal} numberOfLines={2}>{r.goal}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardAction}>View Plan →</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.addCard}
            activeOpacity={0.8}
            onPress={() => router.push('/import-routine')}
          >
            <View style={styles.addCircle}>
              <Plus color={COLORS.txt} size={32} />
            </View>
            <Text style={styles.addText}>Add New Routine</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 24,
    paddingBottom: 100, // For floating tab bar
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...TYPOGRAPHY.display,
    fontSize: 36,
    color: COLORS.txt,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  routineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.txt,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routineTag: {
    fontSize: 28,
    marginRight: 12,
  },
  routineTitle: {
    ...TYPOGRAPHY.h2,
    flex: 1,
  },
  routineGoal: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginBottom: 20,
    lineHeight: 22,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  cardAction: {
    ...TYPOGRAPHY.button,
    color: COLORS.txt,
  },
  addCard: {
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 32,
    borderWidth: 2,
    borderColor: COLORS.border2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.lightMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.txt2,
  },
});
