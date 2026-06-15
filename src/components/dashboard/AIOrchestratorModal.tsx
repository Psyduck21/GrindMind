import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Send, X, Sparkles } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { generateIntent } from '../../services/ai/aiOrchestrator';
import { applyIntentGraph } from '../../services/task/timeBlockManager';

interface AIOrchestratorModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess: () => void;
}

export function AIOrchestratorModal({ visible, onClose, userId, onSuccess }: AIOrchestratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim() || !userId) return;
    
    setIsLoading(true);
    setResultMessage(null);
    try {
      const intentGraph = await generateIntent(prompt, userId);
      await applyIntentGraph(intentGraph);
      setResultMessage(intentGraph.message_to_user || 'Schedule updated successfully.');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      Alert.alert('AI Error', error.message || 'Failed to process your request.');
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  const handleClose = () => {
    setPrompt('');
    setResultMessage(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Sparkles color={COLORS.primary} size={20} />
              <Text style={styles.title}>AI Orchestrator</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <X color={COLORS.txt2} size={24} />
            </TouchableOpacity>
          </View>

          {resultMessage ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{resultMessage}</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>Tell GrindMind how to adjust your schedule.</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 'Move my 2 PM meeting to tomorrow'"
                  placeholderTextColor={COLORS.txt2}
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  autoFocus
                  editable={!isLoading}
                />
              </View>
              
              <View style={styles.footer}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={COLORS.primary} />
                    <Text style={styles.loadingText}>Recalculating constraints...</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.submitBtn, !prompt.trim() && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!prompt.trim()}
                  >
                    <Text style={styles.submitBtnText}>Execute</Text>
                    <Send color={COLORS.white} size={16} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...SHADOWS.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.txt,
  },
  subtitle: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt2,
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    padding: 16,
    marginBottom: 16,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: 48,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
  },
  resultContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  resultText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.txt,
    textAlign: 'center',
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  doneBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.txt,
  }
});
