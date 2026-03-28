import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SHELL } from '@/constants/shell-theme';

type Props = {
  onFinish: () => void;
};

/**
 * Intro brand: scena full-bleed, logo hero (~65% larghezza), animazione morbida.
 */
export function AppIntroSplash({ onFinish }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;

  const logoWidth = width * 0.66;
  const logoHeight = Math.max(logoWidth * 0.36, 96);

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7.5,
          tension: 42,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(420),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    anim.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      anim.stop();
    };
  }, [onFinish, logoScale, opacity]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity }]}>
      <View
        style={[
          styles.center,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
          },
        ]}>
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: logoWidth, height: logoHeight }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SHELL,
    zIndex: 9999,
    elevation: 9999,
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed',
          width: '100%',
          height: '100%',
          left: 0,
          top: 0,
        } as const)
      : null),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
