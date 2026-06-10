import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { COLORS, TYPOGRAPHY } from '../src/constants/theme';
import { supabase } from '../src/supabase/client';

const API_KEY_STORE_KEY = 'gemini_api_key';

export default function SettingsScreen() {
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gemini API Key</Text>
          <Text style={styles.desc}>Stored encrypted on-device. Never sent to our servers.</Text>
          <Input
            label="API Key"
            placeholder="AIzaSy..."
            value={apiKey}
            onChangeText={(t) => { setApiKey(t); if (isSaved) setIsSaved(false); }}
            secureTextEntry={isSaved}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={isSaved ? 'Update' : 'Save'} onPress={handleSave} style={{ flex: 2 }} />
            {isSaved && <Button title="Clear" variant="outline" onPress={handleClear} style={{ flex: 1 }} />}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16 },
  title: { ...TYPOGRAPHY.display, marginBottom: 24 },
  section: {
    backgroundColor: COLORS.s1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  sectionTitle: { ...TYPOGRAPHY.title, marginBottom: 6 },
  desc: { ...TYPOGRAPHY.small, color: COLORS.txt2, marginBottom: 16, lineHeight: 16 },
});
