import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import * as Linking from 'expo-linking';

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
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="RoleSelection"
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