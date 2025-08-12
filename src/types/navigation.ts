import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  RoleSelection: undefined;
  Onboarding: undefined;
  Dashboard: NavigatorScreenParams<MainTabParamList>;
  ResetPassword: { access_token?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Progress: undefined;
  Upload: undefined;
  Diet: undefined;
  Profile: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>; 