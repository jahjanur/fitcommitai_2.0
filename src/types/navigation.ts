import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  RoleSelection: undefined;
  Onboarding: undefined;
  Dashboard: NavigatorScreenParams<MainTabParamList>;
  ResetPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Progress: undefined;
  Upload: undefined;
  Diet: undefined;
  Profile: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>; 