import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, SHADOWS } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

interface FABProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function FAB({ onPress, style }: FABProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.fab, style]}
      onPress={onPress}
    >
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path d="M12 5V19M5 12H19" stroke={COLORS.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.fab,
  },
});
