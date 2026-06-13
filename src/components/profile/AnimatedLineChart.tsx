import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';

interface DataPoint {
  date: string;
  dayName: string;
  count: number;
}

interface AnimatedLineChartProps {
  data: DataPoint[];
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48; // padding 24 on each side
const CHART_HEIGHT = 160;
const PADDING_TOP = 30; // Increased to fit text
const PADDING_BOTTOM = 30;
const PADDING_HORIZONTAL = 20;

export function AnimatedLineChart({ data }: AnimatedLineChartProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: animatedValue.value,
      transform: [{ scaleY: animatedValue.value }],
    };
  });

  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count), 5); // Ensure at least 5 for scale
  
  // Coordinate calculations
  const getX = (index: number) => PADDING_HORIZONTAL + (index * ((CHART_WIDTH - 2 * PADDING_HORIZONTAL) / (data.length - 1)));
  const getY = (count: number) => {
    const availableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    return CHART_HEIGHT - PADDING_BOTTOM - ((count / maxCount) * availableHeight);
  };

  // Generate SVG Path using Catmull-Rom or simple Bezier approximations
  // For simplicity and smoothness, we'll use a basic bezier curve generator
  let pathD = `M ${getX(0)},${getY(data[0].count)}`;
  
  for (let i = 0; i < data.length - 1; i++) {
    const x0 = getX(i);
    const y0 = getY(data[i].count);
    const x1 = getX(i + 1);
    const y1 = getY(data[i + 1].count);
    
    // Control points for smooth curve
    const cp1x = x0 + (x1 - x0) / 2;
    const cp1y = y0;
    const cp2x = x0 + (x1 - x0) / 2;
    const cp2y = y1;

    pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
  }

  // Create closed path for gradient fill
  const fillPathD = `${pathD} L ${getX(data.length - 1)},${CHART_HEIGHT} L ${getX(0)},${CHART_HEIGHT} Z`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Output</Text>
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.4" />
              <Stop offset="1" stopColor={COLORS.bg} stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={COLORS.mint} />
              <Stop offset="1" stopColor={COLORS.primary} />
            </LinearGradient>
          </Defs>
          
          {/* Fill Area */}
          <Path d={fillPathD} fill="url(#fillGradient)" />
          
          {/* Stroke Line */}
          <Path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Data Points and Labels */}
          {data.map((d, i) => (
            <React.Fragment key={i}>
              <SvgText
                x={getX(i)}
                y={getY(d.count) - 12}
                fill={COLORS.txt}
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                {d.count}
              </SvgText>
              <Circle 
                cx={getX(i)} 
                cy={getY(d.count)} 
                r="4" 
                fill={COLORS.white} 
                stroke={COLORS.primary} 
                strokeWidth="2" 
              />
            </React.Fragment>
          ))}
        </Svg>
        
        {/* X-Axis Labels */}
        <View style={styles.labelsContainer}>
          {data.map((d, i) => (
            <Text key={i} style={styles.axisLabel}>{d.dayName}</Text>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.txt,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: 16,
    color: COLORS.txt,
  },
  chartContainer: {
    alignItems: 'center',
    transformOrigin: 'bottom',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: -10,
  },
  axisLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
    fontSize: 10,
  }
});
