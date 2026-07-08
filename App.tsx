import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fontMap } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useStore } from '@/state/store';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.voidBlack, card: colors.voidBlack, primary: colors.teal },
};

export default function App() {
  // Read BOTH the loaded flag and the error — never gate the app forever on fonts.
  const [fontsLoaded, fontError] = useFonts(fontMap);
  // Failsafe: proceed even if font loading hangs on a device. Cinzel/Grotesk fall
  // back to system fonts; a booted app beats an infinite loading screen.
  const [failsafe, setFailsafe] = useState(false);

  const hydrateDaily = useStore((s) => s.hydrateDaily);
  const computeOffline = useStore((s) => s.computeOffline);

  useEffect(() => {
    const t = setTimeout(() => setFailsafe(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      hydrateDaily();
      computeOffline();
    } catch {
      /* never block boot on startup housekeeping */
    }
  }, [hydrateDaily, computeOffline]);

  const canRender = fontsLoaded || !!fontError || failsafe;
  if (!canRender) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.voidBlack, alignItems: 'center', justifyContent: 'center' },
});
