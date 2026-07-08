import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { BoneCastScreen } from '@/screens/BoneCastScreen';
import { CampaignScreen } from '@/screens/CampaignScreen';
import { DailyRitualsScreen } from '@/screens/DailyRitualsScreen';
import { DifficultyScreen } from '@/screens/DifficultyScreen';
import { IdleScreen } from '@/screens/IdleScreen';
import { MainMenuScreen } from '@/screens/MainMenuScreen';
import { PaleChorusScreen } from '@/screens/PaleChorusScreen';
import { PrestigeScreen } from '@/screens/PrestigeScreen';
import { RookeryScreen } from '@/screens/RookeryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#05070a' },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainMenu" component={MainMenuScreen} />
      <Stack.Screen name="Difficulty" component={DifficultyScreen} />
      <Stack.Screen name="Campaign" component={CampaignScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Prestige" component={PrestigeScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen name="Idle" component={IdleScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Rookery" component={RookeryScreen} />
      <Stack.Screen name="PaleChorus" component={PaleChorusScreen} />
      <Stack.Screen name="BoneCast" component={BoneCastScreen} />
      <Stack.Screen name="DailyRituals" component={DailyRitualsScreen} />
    </Stack.Navigator>
  );
}
