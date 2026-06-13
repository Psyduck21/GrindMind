import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
}

const ITEM_HEIGHT = 44;

function Wheel({ data, selectedValue, onValueChange }: { data: string[], selectedValue: string, onValueChange: (val: string) => void }) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [internalValue, setInternalValue] = useState(selectedValue);

  useEffect(() => {
    if (selectedValue !== internalValue) {
      setInternalValue(selectedValue);
      const index = data.indexOf(selectedValue);
      if (index >= 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
      }
    }
  }, [selectedValue, data]);

  // Initial scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      const index = data.indexOf(selectedValue);
      if (index >= 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    let index = Math.round(y / ITEM_HEIGHT);
    index = Math.max(0, Math.min(index, data.length - 1));
    const newVal = data[index];
    if (newVal !== internalValue) {
      setInternalValue(newVal);
      onValueChange(newVal);
    }
    // Snap cleanly
    scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // If momentum scroll is not going to happen, snap immediately
    if (event.nativeEvent.velocity?.y === 0) {
      handleMomentumScrollEnd(event);
    }
  };

  return (
    <View style={styles.wheelContainer}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
      >
        {data.map((item, index) => {
          const isSelected = internalValue === item;
          return (
            <View key={index} style={styles.item}>
              <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [hh, mm] = value.split(':');
  
  const handleHourChange = (newHh: string) => {
    onChange(`${newHh}:${mm || '00'}`);
  };

  const handleMinuteChange = (newMm: string) => {
    onChange(`${hh || '00'}:${newMm}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerWrapper}>
        <Wheel data={hours} selectedValue={hh || '07'} onValueChange={handleHourChange} />
        <Text style={styles.colon}>:</Text>
        <Wheel data={minutes} selectedValue={mm || '00'} onValueChange={handleMinuteChange} />
        <View style={styles.selectionHighlight} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT * 3, // show 3 items
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wheelContainer: {
    width: 60,
    height: ITEM_HEIGHT * 3,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.txt2,
    fontSize: 20,
    opacity: 0.5,
  },
  itemTextSelected: {
    color: COLORS.txt,
    fontSize: 24,
    opacity: 1,
  },
  colon: {
    ...TYPOGRAPHY.h2,
    fontSize: 24,
    color: COLORS.txt,
    marginHorizontal: 12,
    paddingBottom: 4,
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border2,
    zIndex: -1,
    backgroundColor: 'rgba(20, 200, 181, 0.05)',
  },
});
