import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../../constants/theme';

interface FloatingCardProps extends ViewProps {
  children: React.ReactNode;
  padding?: number;
}

export function FloatingCard({ children, style, padding = 16, ...props }: FloatingCardProps) {
  return (
    <View style={[styles.card, { padding }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    ...SHADOWS.floating,
  },
});
