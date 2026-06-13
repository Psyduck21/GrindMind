import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Defs, Filter, FeDropShadow } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Home, ClipboardList, BarChart2, User, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const getIcon = (name: string, color: string) => {
  switch (name) {
    case 'index': return <Home color={color} size={24} strokeWidth={2} />;
    case 'routine': return <ClipboardList color={color} size={24} strokeWidth={2} />;
    case 'review': return <BarChart2 color={color} size={24} strokeWidth={2} />;
    case 'settings': return <User color={color} size={24} strokeWidth={2} />;
    default: return <Home color={color} size={24} strokeWidth={2} />;
  }
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const TAB_BAR_WIDTH = width;
  const TAB_BAR_HEIGHT = 64;
  const TOTAL_HEIGHT = TAB_BAR_HEIGHT + insets.bottom;
  const cx = TAB_BAR_WIDTH / 2;

  // Normal full-width flat bar
  const getTabPath = () => {
    return `
      M 0,0 
      L ${TAB_BAR_WIDTH},0 
      L ${TAB_BAR_WIDTH},${TOTAL_HEIGHT} 
      L 0,${TOTAL_HEIGHT} 
      Z
    `;
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.container, { height: TOTAL_HEIGHT }]} pointerEvents="box-none">

        {/* Fade Gradient above Tab Bar to smoothly reveal scroll content */}
        <View style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 40 }} pointerEvents="none">
          <LinearGradient
            colors={['rgba(244, 247, 250, 0)', 'rgba(244, 247, 250, 1)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
        
        {/* 1. Underlying Native Drop Shadow (unmasked) */}
        <View style={styles.svgContainer} pointerEvents="none">
          <Svg width={TAB_BAR_WIDTH} height={TOTAL_HEIGHT} style={styles.svg}>
            <Defs>
              <Filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <FeDropShadow dx="0" dy="-8" stdDeviation="20" floodColor="#000000" floodOpacity="0.25" />
              </Filter>
            </Defs>
            <Path d={getTabPath()} fill="transparent" filter="url(#dropShadow)" />
          </Svg>
        </View>

        {/* 2. Masked Frosted Glass */}
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <View style={{ width: TAB_BAR_WIDTH, height: TOTAL_HEIGHT, backgroundColor: 'transparent' }}>
              <Svg width={TAB_BAR_WIDTH} height={TOTAL_HEIGHT}>
                <Path d={getTabPath()} fill="black" />
              </Svg>
            </View>
          }
        >
          <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill}>
            {/* Strong off-white overlay to make it less see-through */}
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.92)' }} />
          </BlurView>
        </MaskedView>

        {/* 3. Icons and Navigation Content */}
        <View style={[styles.content, { height: TAB_BAR_HEIGHT }]} pointerEvents="box-none">
          {state.routes.map((route, index) => {
            if (['index', 'routine', 'review', 'settings'].indexOf(route.name) === -1) return null;

            const isFocused = state.index === index;
            const color = isFocused ? COLORS.txt : COLORS.txt2;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <React.Fragment key={route.key}>
                {index === 2 && <View style={styles.spacer} />}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  onPress={onPress}
                  style={styles.tabItem}
                  activeOpacity={0.7}
                >
                  {getIcon(route.name, color)}
                  <View style={[styles.dot, { backgroundColor: isFocused ? COLORS.txt : 'transparent' }]} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* 4. Floating Action Button (Center Circle) */}
        <View style={[styles.fabContainer, { height: TAB_BAR_HEIGHT }]} pointerEvents="box-none">
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={styles.fabTouch}
            onPress={() => router.push('/import-routine')}
          >
            <View style={styles.fabCircle}>
              <Plus color={COLORS.white} size={28} strokeWidth={3} />
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    width: width,
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  svg: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  spacer: {
    width: 80, // Space for the cutout
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  fabContainer: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fabTouch: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
