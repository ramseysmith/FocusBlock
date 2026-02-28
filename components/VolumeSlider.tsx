import React, { useRef } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';

interface Props {
  value: number;      // 0–1
  onChange: (v: number) => void;
  color: string;
  height?: number;
  thumbSize?: number;
}

/**
 * Horizontal volume slider built with PanResponder.
 * Works correctly inside a vertical ScrollView — it captures touch starts
 * so the scroll view yields to horizontal drags over this component.
 *
 * Uses (locationX + gestureState.dx) so no window.measureInWindow() is needed.
 */
export function VolumeSlider({
  value,
  onChange,
  color,
  height = 4,
  thumbSize = 18,
}: Props) {
  const widthRef = useRef(0);
  const startXRef = useRef(0);
  // Use a ref so the PanResponder closure always has the latest callback
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const clamp = (x: number) => Math.max(0, Math.min(1, x));

  const pan = useRef(
    PanResponder.create({
      // Capture the touch immediately so ScrollView defers to us
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt) => {
        startXRef.current = evt.nativeEvent.locationX;
        onChangeRef.current(clamp(evt.nativeEvent.locationX / widthRef.current));
      },

      onPanResponderMove: (_, gs) => {
        const x = startXRef.current + gs.dx;
        onChangeRef.current(clamp(x / widthRef.current));
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  const thumbOffset = value * (widthRef.current - thumbSize);

  return (
    <View
      style={[styles.container, { height: thumbSize }]}
      onLayout={onLayout}
      {...pan.panHandlers}
    >
      {/* Track background */}
      <View
        style={[
          styles.track,
          { height, top: (thumbSize - height) / 2, backgroundColor: 'rgba(255,255,255,0.1)' },
        ]}
      >
        {/* Filled portion */}
        <View
          style={[
            styles.fill,
            { width: `${value * 100}%` as any, backgroundColor: color + 'bb' },
          ]}
        />
      </View>

      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: color,
            transform: [{ translateX: thumbOffset }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
