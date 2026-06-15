import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { TimePicker } from '../src/components/ui/TimePicker';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../src/constants/theme';
import { supabase } from '../src/supabase/client';
import { db } from '../src/db/db';
import { useAlert } from '../src/components/ui/AlertProvider';
import { scheduleDailyNotifications, sendTestNotification } from '../src/services/notification/notificationScheduler';

const MODES = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'coach', label: 'Coach' },
  { id: 'military', label: 'Military' },
  { id: 'savage', label: 'Savage' },
  { id: 'iron_discipline', label: 'Iron Discipline' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRec, setUserRec] = useState<any>(null);

  // Form State
  const [mode, setMode] = useState('coach');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [age, setAge] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u: any = await db.getFirstAsync('SELECT * FROM users LIMIT 1');
        if (u) {
          setUserRec(u);
          setMode(u.accountability_mode || 'coach');
          setWakeTime(u.wake_time || '07:00');
          setSleepTime(u.sleep_time || '23:00');
          setAge(u.age ? String(u.age) : '');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    if (!userRec) return;
    setSaving(true);
    try {
      const ageNum = parseInt(age) || null;

      // Update Local SQLite
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'UPDATE users SET accountability_mode = ?, wake_time = ?, sleep_time = ?, age = ? WHERE id = ?',
          [mode, wakeTime, sleepTime, ageNum, userRec.id]
        );
      });

      // Update Supabase
      const { error } = await supabase
        .from('users')
        .update({
          accountability_mode: mode,
          wake_time: wakeTime,
          sleep_time: sleepTime,
          age: ageNum
        })
        .eq('id', userRec.id);

      if (error) throw error;

      // Reschedule notifications with the new preferences
      await scheduleDailyNotifications({
        userId: userRec.id,
        accountabilityMode: mode as any,
        wakeTime,
        sleepTime,
      }).catch(err => console.error('Failed to reschedule notifications:', err));

      showAlert('Success', 'Profile updated successfully.');
      router.back();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.txt} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Preferences</Text>

        {/* Accountability Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Mode</Text>
          <View style={{ position: 'relative' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modesScroll}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modeCard, mode === m.id && styles.modeCardSelected]}
                  onPress={() => setMode(m.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modeName, mode === m.id && styles.modeNameSelected]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Left Fade */}
            <LinearGradient
              colors={[COLORS.bg, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeLeft}
              pointerEvents="none"
            />
            {/* Right Fade */}
            <LinearGradient
              colors={['transparent', COLORS.bg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeRight}
              pointerEvents="none"
            />
          </View>
        </View>

        {/* Schedule */}
        <FloatingCard style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>

          <Text style={styles.label}>Wake Time</Text>
          <TimePicker value={wakeTime} onChange={setWakeTime} />

          <View style={{ height: 24 }} />

          <Text style={styles.label}>Sleep Time</Text>
          <TimePicker value={sleepTime} onChange={setSleepTime} />
        </FloatingCard>

        {/* Personal Info */}
        <FloatingCard style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <Input
            label="Age"
            placeholder="e.g. 24"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
          />
        </FloatingCard>

        {/* Notification Settings */}
        <TouchableOpacity 
          style={styles.notificationBtn} 
          onPress={() => {
            if (Platform.OS === 'android') {
              IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
                {
                  extra: {
                    'android.provider.extra.APP_PACKAGE': Application.applicationId || 'com.akshatprj.grindmind',
                  },
                }
              );
            } else {
              Linking.openSettings();
            }
          }} 
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.notificationText}>Change Notification Sound</Text>
            <Text style={styles.notificationSubtext}>Manage audio in app settings</Text>
          </View>
          <ArrowRight color={COLORS.txt} size={20} />
        </TouchableOpacity>

        {/* Test Notification Settings */}
        <TouchableOpacity 
          style={styles.testNotificationBtn} 
          onPress={async () => {
             try {
               await sendTestNotification();
               showAlert('Test Sent', 'Notification scheduled for 2 seconds. You may need to minimize the app to see the system banner.');
             } catch (error: any) {
               showAlert('Test Failed', `Error: ${error.message || 'Unknown error'}`);
             }
          }} 
          activeOpacity={0.5}
        >
          <Text style={styles.testNotificationText}>Send Test Notification</Text>
        </TouchableOpacity>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          style={{ marginBottom: 40 }}
        />

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
          <ArrowRight color={COLORS.white} size={20} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
  backText: { ...TYPOGRAPHY.bodyBold, color: COLORS.txt2 },
  title: { ...TYPOGRAPHY.display, fontSize: 32, marginBottom: 32 },

  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: 16,
    color: COLORS.txt,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
    marginBottom: 8,
    fontWeight: '600',
  },

  modesScroll: {
    paddingRight: 24,
    gap: 12,
  },
  modeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...SHADOWS.floating,
  },
  modeCardSelected: {
    backgroundColor: COLORS.txt,
    borderColor: COLORS.darkEmerald,
    ...SHADOWS.active,
  },
  modeName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt,
  },
  modeNameSelected: {
    color: COLORS.white,
  },
  fadeLeft: {
    position: 'absolute',
    left: -24,
    top: 0,
    bottom: 0,
    width: 32,
    zIndex: 1,
  },
  fadeRight: {
    position: 'absolute',
    right: -24,
    top: 0,
    bottom: 0,
    width: 32,
    zIndex: 1,
  },

  notificationBtn: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  notificationText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt,
    marginBottom: 4,
  },
  notificationSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
  },

  testNotificationBtn: {
    alignSelf: 'center',
    padding: 8,
    marginTop: -16,
    marginBottom: 32,
    opacity: 0.3,
  },
  testNotificationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
    fontSize: 10,
  },

  signOutBtn: {
    backgroundColor: COLORS.txt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 40,
    ...SHADOWS.floating,
  },
  signOutText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
});
