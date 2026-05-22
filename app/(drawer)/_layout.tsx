import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppDrawerContent } from '@/components/app-drawer-content';
import { DrawerMenuButton } from '@/components/drawer-menu-button';
import { ShellHeaderTitle } from '@/components/shell-header-title';
import { requireValidMobileSession } from '@/lib/mobile-session-read';
import {
  ACCENT_CREAM,
  BORDER_WARM_SOFT,
  OVERLAY_SCRIM,
  SHELL,
  SPINNER_TINT,
  SURFACE_HEADER,
  TEXT_MUTED,
} from '@/constants/shell-theme';

export default function DrawerLayout() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [sessionGateReady, setSessionGateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await requireValidMobileSession();
        if (cancelled) return;
        if (session === null) {
          router.replace('/login');
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace('/login');
        }
        return;
      }
      if (!cancelled) {
        setSessionGateReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const drawerWidth = Math.min(320, Math.round(windowWidth * 0.88));

  if (!sessionGateReady) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator size="large" color={SPINNER_TINT} />
      </View>
    );
  }

  return (
    <Drawer
      initialRouteName="home"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerLeft: () => <DrawerMenuButton />,
        headerTitleAlign: 'left',
        headerTitleContainerStyle: {
          marginLeft: 0,
          paddingLeft: 0,
          flex: 1,
          maxWidth: '100%',
        },
        headerLeftContainerStyle: {
          paddingLeft: 4,
        },
        headerStyle: {
          backgroundColor: SURFACE_HEADER,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: BORDER_WARM_SOFT,
        },
        headerShadowVisible: false,
        headerTintColor: ACCENT_CREAM,
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: SHELL,
        },
        drawerType: 'front',
        overlayColor: OVERLAY_SCRIM,
        drawerActiveTintColor: ACCENT_CREAM,
        drawerInactiveTintColor: TEXT_MUTED,
      }}>
      <Drawer.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: () => <ShellHeaderTitle title="Home" />,
        }}
      />
      <Drawer.Screen
        name="appointments"
        options={{
          title: 'Appuntamenti',
          headerTitle: () => <ShellHeaderTitle title="Appuntamenti" />,
        }}
      />
      <Drawer.Screen
        name="stats"
        options={{
          title: 'Statistiche',
          headerTitle: () => <ShellHeaderTitle title="Statistiche" />,
        }}
      />
      <Drawer.Screen
        name="attendance"
        options={{
          title: 'Presenze',
          headerTitle: () => <ShellHeaderTitle title="Presenze" />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: SHELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
