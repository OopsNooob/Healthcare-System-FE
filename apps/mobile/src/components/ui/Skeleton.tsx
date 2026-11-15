import React, { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { tw } from '@/tw';

interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'h-4 w-full rounded-lg',
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        tw(`bg-slate-200 dark:bg-slate-800 ${className}`),
        { opacity },
        style,
      ]}
    />
  );
};
