import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { View, StyleSheet, TouchableOpacity, GestureResponderEvent, AccessibilityState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBottomSpace } from 'react-native-iphone-x-helper';
import { SvgXml } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

// Import your screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
// Placeholder screens
import ProfileScreen from '../screens/Profile/ProfileScreen';
import DietPlanScreen from '../screens/DietPlan/DietPlanScreen';
import ProgressTrackerScreen from '../screens/ProgressTracker/ProgressTrackerScreen';
import PlannerGoalsScreen from '../screens/PlannerGoals/PlannerGoalsScreen';
import UploadScreen from '../screens/Upload/UploadScreen';

// Import SVG content directly
const FitCommitIconHomeSvg = `
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 500 500" style="enable-background:new 0 0 500 500;" xml:space="preserve">
<style type="text/css">
	.st0{fill:#FEFEFE;}
</style>
<g>
	<path class="st0" d="M113.32,344.59c0.47-38.03-2.25-76.2,9.44-113.44C147.51,152.27,217.85,99.11,300.6,97.8
		c19.29-0.3,38.6,0.42,57.87-0.31c9.49-0.36,11.81,2.95,11.56,11.92c-0.59,21.47-0.84,42.99,0.08,64.44
		c0.48,11.07-3.84,13.41-13.65,13.08c-17.08-0.57-34.2-0.33-51.29-0.12c-60.7,0.75-102.3,41.42-103.55,102.18
		c-0.78,37.69-0.6,75.42-0.02,113.11c0.16,10.09-2.91,12.66-12.6,12.34c-21.46-0.7-42.98-0.76-64.44,0.04
		c-9.8,0.36-11.65-3.25-11.39-12.01C113.73,383.19,113.33,363.89,113.32,344.59z"/>
	<path class="st0" d="M233.76,288.56c0.08-37.75,31.04-69.1,68.28-69.15c37.76-0.05,68.92,31.99,68.42,70.36
		c-0.49,37.7-32.04,69.07-68.97,68.56C264.17,357.81,233.68,326.4,233.76,288.56z"/>
</g>
</svg>
`;

const FourthButtonSvg = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9968 12.5837C14.9348 12.5837 17.2888 10.2287 17.2888 7.29169C17.2888 4.35469 14.9348 1.99969 11.9968 1.99969C9.05983 1.99969 6.70483 4.35469 6.70483 7.29169C6.70483 10.2287 9.05983 12.5837 11.9968 12.5837" fill="#EAECF0"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9968 15.1746C7.68376 15.1746 3.99976 15.8546 3.99976 18.5746C3.99976 21.2956 7.66076 21.9996 11.9968 21.9996C16.3098 21.9996 19.9938 21.3206 19.9938 18.5996C19.9938 15.8786 16.3338 15.1746 11.9968 15.1746" fill="#9B9BA1"/>
</svg>
`;

const ThirdButtonSvg = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.2608 9.84822C8.50756 8.70072 10.1719 8 12 8C13.828 8 15.4924 8.70072 16.7391 9.84822L19.81 4.21828C20.3552 3.21872 19.6318 2 18.4932 2H15.1768C14.4505 2 13.7812 2.39378 13.4285 3.02871L11.9999 5.60016L10.5714 3.02871C10.2186 2.39378 9.54937 2 8.82304 2H5.50676C4.36817 2 3.6447 3.21872 4.18992 4.21828L7.2608 9.84822Z" fill="#EAECF0"/>
<path d="M19 15C19 18.866 15.866 22 12 22C8.13401 22 5 18.866 5 15C5 11.134 8.13401 8 12 8C15.866 8 19 11.134 19 15Z" fill="#9B9BA1"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M12 17C13.1046 17 14 16.1046 14 15C14 13.8954 13.1046 13 12 13C10.8954 13 10 13.8954 10 15C10 16.1046 10.8954 17 12 17Z" fill="#EAECF0"/>
</svg>
`;

const Tab = createBottomTabNavigator();

interface CustomTabBarButtonProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: AccessibilityState;
}

const HomeTabBarButton: React.FC<CustomTabBarButtonProps> = ({ children, onPress, accessibilityState }) => {
  const navigation = useNavigation();
  return (
  <TouchableOpacity
    style={styles.homeTabButton}
      onPress={e => {
        // Navigate to DashboardScreen and trigger upload mode
        (navigation as any).navigate('Dashboard', { startUpload: true });
        if (onPress) onPress(e);
      }}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[colors.buttonPrimary, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.homeTabButtonGradient}
    >
      <SvgXml xml={FitCommitIconHomeSvg} width={30} height={30} fill={colors.white} />
    </LinearGradient>
  </TouchableOpacity>
);
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconComponent: React.ReactNode;
          if (route.name === 'Dashboard') {
            iconComponent = <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />;
          } else if (route.name === 'Diet') {
            iconComponent = <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />;
          } else if (route.name === 'Upload') {
            iconComponent = null; // Center button uses custom button
          } else if (route.name === 'Progress') {
            iconComponent = <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />;
          } else if (route.name === 'Profile') {
            iconComponent = <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />;
          }
          return iconComponent;
        },
        tabBarActiveTintColor: colors.buttonPrimary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          height: 80 + getBottomSpace(),
          paddingBottom: getBottomSpace(),
          paddingTop: 10,
          borderRadius: 30,
          marginHorizontal: 20,
          marginBottom: 10,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 5,
          color: colors.text.secondary,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />
          ),
        }}
      />
      <Tab.Screen 
        name="Diet" 
        component={DietPlanScreen}
        options={{
          tabBarLabel: 'Diet Plan',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />
          ),
        }}
      />
      <Tab.Screen 
        name="Upload" 
        component={UploadScreen} // This should open the upload flow
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <HomeTabBarButton {...props} />, // Prominent center button
          tabBarIcon: ({ focused }) => null,
        }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressTrackerScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={focused ? colors.buttonPrimary : colors.text.secondary} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  homeTabButton: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  homeTabButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MainTabNavigator; 