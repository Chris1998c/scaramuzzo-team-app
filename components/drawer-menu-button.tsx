import { MaterialIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { BORDER_BRONZE, GOLD_LIGHT, SURFACE_MEDIUM } from '@/constants/shell-theme';

/**
 * Pulsante menu integrato nella top bar (non icona “appiccicata” al bordo).
 */
export function DrawerMenuButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Apri menu"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <MaterialIcons name="menu" size={22} color={GOLD_LIGHT} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginLeft: 8,
    marginRight: 4,
    width: 42,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_MEDIUM,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  pressed: {
    opacity: 0.88,
  },
});
