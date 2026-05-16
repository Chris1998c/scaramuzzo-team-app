import { MaterialIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShellDrawerHeaderBranding } from '@/components/shell-header-title';
import {
  BORDER_BRONZE,
  GOLD_BRAND,
  FOOTER_SEPARATOR_BRONZE,
  ACCENT_CREAM,
  POSITIVE,
  SHELL,
  SURFACE_CARD,
  SURFACE_MEDIUM,
  TEXT_MAIN,
  TEXT_MUTED,
} from '@/constants/shell-theme';
import { clearSession } from '@/lib/session';

function NavRow({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        active ? styles.navRowActive : styles.navRowIdle,
        pressed && styles.navRowPressed,
      ]}>
      <MaterialIcons
        name={icon}
        size={21}
        color={active ? ACCENT_CREAM : TEXT_MUTED}
        style={styles.navIcon}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { navigation } = props;

  const isStats = pathname.includes('stats');
  const isAppointments = pathname.includes('appointments');
  const isAttendance = pathname.includes('attendance');
  const isHome = !isStats && !isAppointments && !isAttendance;

  const go = (href: '/home' | '/appointments' | '/stats' | '/attendance') => {
    router.push(href);
    navigation.closeDrawer();
  };

  const onLogout = async () => {
    await clearSession();
    navigation.closeDrawer();
    router.replace('/login');
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <ShellDrawerHeaderBranding />

        <View style={styles.navCardOuter}>
          <Text style={styles.navCardKicker}>Menu</Text>
          <View style={styles.navCardInner}>
            <NavRow
              icon="home"
              label="Home"
              active={isHome}
              onPress={() => go('/home')}
            />
            <NavRow
              icon="event"
              label="I miei appuntamenti"
              active={isAppointments}
              onPress={() => go('/appointments')}
            />
            <NavRow
              icon="schedule"
              label="Presenze"
              active={isAttendance}
              onPress={() => go('/attendance')}
            />
            <NavRow
              icon="bar-chart"
              label="Statistiche"
              active={isStats}
              onPress={() => go('/stats')}
            />
          </View>
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.navRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Esci dall'account">
          <MaterialIcons name="logout" size={20} color={POSITIVE} />
          <Text style={styles.logoutLabel}>Esci dall&apos;account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: SHELL,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  navCardOuter: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  navCardKicker: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginLeft: 10,
    marginBottom: 8,
  },
  navCardInner: {
    gap: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  navRowIdle: {
    backgroundColor: 'transparent',
  },
  navRowActive: {
    backgroundColor: SURFACE_MEDIUM,
    borderLeftWidth: 3,
    borderLeftColor: GOLD_BRAND,
    paddingLeft: 9,
  },
  navRowPressed: {
    opacity: 0.9,
  },
  navIcon: {
    width: 24,
  },
  navLabel: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.12,
  },
  navLabelActive: {
    color: TEXT_MAIN,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: SHELL,
    borderTopWidth: 1,
    borderTopColor: FOOTER_SEPARATOR_BRONZE,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: SURFACE_CARD,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  logoutLabel: {
    color: ACCENT_CREAM,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
});
