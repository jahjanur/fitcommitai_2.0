import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import * as Linking from 'react-native'; // fallback if expo-linking is not available
import { supabase } from '../lib/supabase';
// Screens
import LoginScreen from '../screens/Login/LoginScreen';
import SignupScreen from '../screens/Signup/SignupScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import RoleSelectionScreen from '../screens/RoleSelection/RoleSelectionScreen';
import MainTabNavigator from './MainTabNavigator';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['fitcommit://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      // Add other screens if you want to support more deep links
    },
  },
};

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setInitialRoute('Dashboard');
        } else {
          setInitialRoute('RoleSelection');
        }
      } catch (e) {
        setInitialRoute('RoleSelection');
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  if (checkingSession || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute as keyof RootStackParamList}
      >
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Dashboard" component={MainTabNavigator} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 