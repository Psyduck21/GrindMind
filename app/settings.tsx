import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { COLORS, TYPOGRAPHY } from '../src/constants/theme';
import { supabase } from '../src/supabase/client';

const API_KEY_STORE_KEY = 'gemini_api_key';

export default function SettingsScreen() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(API_KEY_STORE_KEY).then((key) => {
      if (key) { setApiKey(key); setIsSaved(true); }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) { Alert.alert('Error', 'Please enter a valid API key'); return; }
    await SecureStore.setItemAsync(API_KEY_STORE_KEY, apiKey.trim());
    setIsSaved(true);
    Alert.alert('Saved', 'Gemini API Key stored securely on device.');
  };

  const handleClear = async () => {
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
    setApiKey(''); setIsSaved(false);
    Alert.alert('Cleared', 'API Key removed.');
  };

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Settings</Text>

        <FloatingCard style={styles.section}>
          <Text style={styles.sectionTitle}>Gemini API Key</Text>
          <Text style={styles.desc}>Stored encrypted on-device. Never sent to our servers.</Text>
          
          <View style={{ marginBottom: 24 }}>
            <Input
              label="API Key"
              placeholder="AIzaSy..."
              value={apiKey}
              onChangeText={(t) => { setApiKey(t); if (isSaved) setIsSaved(false); }}
              secureTextEntry={isSaved}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Button 
              title={isSaved ? 'Update' : 'Save'} 
              onPress={handleSave} 
              style={{ flex: 2, backgroundColor: COLORS.txt }} 
            />
            {isSaved && (
              <Button 
                title="Clear" 
                variant="outline-dark" 
                onPress={handleClear} 
                style={{ flex: 1 }} 
              />
            )}
          </View>
        </FloatingCard>
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
    padding: 24,
  },
  sectionTitle: { ...TYPOGRAPHY.h1, marginBottom: 8 },
  desc: { ...TYPOGRAPHY.body, color: COLORS.txt2, marginBottom: 24, lineHeight: 22 },
});
