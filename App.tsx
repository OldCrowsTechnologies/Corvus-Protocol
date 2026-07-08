import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { fontMap } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useStore } from '@/state/store';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.voidBlack, card: colors.voidBlack, primary: colors.teal },
};

export default function App() {
  const [fontsLoaded] = useFonts(fontMap);
  const hydrateDaily = useStore((s) => s.hydrateDaily);
  const computeOffline = useStore((s) => s.computeOffline);

  useEffect(() => {
    hydrateDaily();
    computeOffline();
  }, [hydrateDaily, computeOffline]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.voidBlack, alignItems: 'center', justifyContent: 'center' },
});
