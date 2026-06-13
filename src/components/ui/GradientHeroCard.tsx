import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../../constants/theme';

interface GradientHeroCardProps extends ViewProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function GradientHeroCard({ title, subtitle, children, style, ...props }: GradientHeroCardProps) {
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.darkEmerald]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
      {...props}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children && <View style={styles.childrenContainer}>{children}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.active, // Gives it a nice colored shadow effect if the parent allows it, or just use floating
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.lightMint,
  },
  childrenContainer: {
    alignItems: 'flex-end',
  },
});
