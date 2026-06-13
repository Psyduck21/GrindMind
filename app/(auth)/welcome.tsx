import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { supabase } from '../../src/supabase/client';
import { runFullSync } from '../../src/services/sync/syncEngine';
import { db } from '../../src/db/db';

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }

    setLoading(true);
    setLoadingMsg(isSignUp ? 'Creating account...' : 'Signing in...');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setErrorMsg(error.message);
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          setLoadingMsg('Syncing your profile...');
          await runFullSync();
          
          const user = db.getFirstSync('SELECT id FROM users LIMIT 1');
          if (!user) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setLoadingMsg(null);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.txt, COLORS.darkEmerald]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
          >
            <View style={styles.branding}>
              <Text style={styles.title}>GrindMind</Text>
              <Text style={styles.subtitle}>No excuses. Only execution.</Text>
            </View>

            <FloatingCard style={styles.authCard}>
              <Text style={styles.cardTitle}>{isSignUp ? "Create an account" : "Welcome back"}</Text>
              
              {errorMsg && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.txt2}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.txt2}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              
              <Button
                title={isSignUp ? "Sign Up" : "Sign In"}
                loading={loading}
                onPress={handleAuth}
                style={styles.loginBtn}
              />

              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleContainer} activeOpacity={0.7}>
                <Text style={styles.toggleText}>
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </FloatingCard>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      {loadingMsg && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...TYPOGRAPHY.display,
    fontSize: 42,
    color: COLORS.white,
    letterSpacing: -1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.lightMint,
    marginTop: 8,
    letterSpacing: 1,
  },
  authCard: {
    padding: 32,
    ...SHADOWS.active,
  },
  cardTitle: {
    ...TYPOGRAPHY.h1,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...TYPOGRAPHY.body,
  },
  loginBtn: {
    marginTop: 16,
    backgroundColor: COLORS.txt,
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt2,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    marginTop: 16,
  },
});
