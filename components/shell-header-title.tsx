import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import {
  BORDER_BRONZE,
  SURFACE_CARD,
  TEXT_MAIN,
  TEXT_MUTED,
} from '@/constants/shell-theme';

type Props = {
  /** Titolo schermata (una sola riga). */
  title: string;
};

/**
 * Top bar drawer compatta: solo titolo schermata (brand completo resta nel drawer).
 */
export function ShellHeaderTitle({ title }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.screenTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

export function ShellDrawerHeaderBranding() {
  return (
    <View style={styles.brandCard}>
      <View style={styles.brandTopRow}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.brandLogo}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.brandTextCol}>
          <Text style={styles.brandTitle}>Scaramuzzo Team</Text>
        </View>
      </View>
      <Text style={styles.brandMicro}>App collaboratori · Area operativa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    maxWidth: '100%',
    paddingVertical: 0,
    minHeight: 32,
  },
  screenTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  brandCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  brandTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  brandLogo: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  brandTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    color: TEXT_MAIN,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandMicro: {
    color: TEXT_MUTED,
    fontSize: 12,
    letterSpacing: 0.15,
    lineHeight: 17,
  },
});
