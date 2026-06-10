import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { signInWithGoogle } from '../../src/supabase/oauth';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      const session = await signInWithGoogle();
      if (session) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sign in failed', 'Please try again');
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message || 'Please try again');
    }
  };

  const handleEmailSignIn = () => {
    // Placeholder
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.orb} />
        
        <View style={styles.branding}>
          <Text style={styles.title}>GrindMind</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>No excuses. Only execution.</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            style={styles.googleBtn}
            textStyle={{ color: COLORS.bg }}
          />
          <Button
            title="Sign in with email"
            variant="outline-dark"
            onPress={handleEmailSignIn}
          />
        </View>

        <View style={styles.gradientOrb} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 60,
    zIndex: 1,
  },
  title: {
    ...TYPOGRAPHY.display,
    fontSize: 42,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.grn,
    marginVertical: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    letterSpacing: 1,
  },
  actions: {
    width: '100%',
    gap: 16,
    zIndex: 1,
  },
  googleBtn: {
    backgroundColor: COLORS.txt,
  },
  orb: {
    position: 'absolute',
    width: 250,
    height: 250,
    backgroundColor: COLORS.grnPill,
    borderRadius: 125,
    top: 100,
    zIndex: 0,
    opacity: 0.5,
  },
  gradientOrb: {
    position: 'absolute',
    width: '100%',
    height: 150,
    backgroundColor: COLORS.grnLo,
    bottom: 0,
    zIndex: 0,
    opacity: 0.3,
  },
});
