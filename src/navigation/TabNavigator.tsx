import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ParamListBase } from '@react-navigation/routers';
import { ReactNode, isValidElement } from 'react';

// Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import ChartHistoryScreen from '../screens/ChartHistory/ChartHistoryScreen';
import DietPlanScreen from '../screens/DietPlan/DietPlanScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type CustomTabBarNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps<ParamListBase>) => {
  const tabWidth = 100 / state.routes.length;

  return (
    <LinearGradient
      colors={['#ffffff', '#f0f0f0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.tabBarContainer}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel.toString()
              : options.title !== undefined
              ? options.title.toString()
              : route.name;

          const isFocused = state.index === index;

           // Safely get icon name
           let iconName: string | undefined;
           const icon = options.tabBarIcon
             ? options.tabBarIcon({ focused: isFocused, color: isFocused ? (Math.floor(state.routes.length / 2) === index ? colors.white : colors.primary) : colors.text.secondary, size: Math.floor(state.routes.length / 2) === index ? 36 : 24 })
             : undefined;

           if (icon && isValidElement(icon) && icon.props.name) {
             iconName = icon.props.name;
           } else if (typeof icon === 'string') { // Handle cases where icon might be a string
             iconName = icon; // Although less common for Ionicons
           }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // We are navigating within the TabNavigator, so the route name should be valid
              // Asserting the type to satisfy TypeScript, as route.name is a string that corresponds to MainTabParamList keys
              navigation.navigate(route.name as keyof MainTabParamList);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Handle the middle button (assuming it's the center one based on index)
          const isMiddleButton = Math.floor(state.routes.length / 2) === index;

          // Animation for middle button
          const middleButtonScale = useRef(new Animated.Value(1)).current;
          const middleButtonGlow = useRef(new Animated.Value(0)).current;

          useEffect(() => {
            if (isFocused && isMiddleButton) {
              // Pulse animation
              Animated.loop(
                Animated.sequence([
                  Animated.timing(middleButtonScale, {
                    toValue: 1.1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.timing(middleButtonScale, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                ])
              ).start();
              // Glow animation (simple opacity for now)
              Animated.loop(
                Animated.sequence([
                  Animated.timing(middleButtonGlow, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                  Animated.timing(middleButtonGlow, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                ])
              ).start();
            } else {
              // Stop animations and reset
              middleButtonScale.stopAnimation();
              middleButtonScale.setValue(1);
              middleButtonGlow.stopAnimation();
              middleButtonGlow.setValue(0);
            }
          }, [isFocused, isMiddleButton, middleButtonScale, middleButtonGlow]);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              // Use optional chaining for accessibilityLabel and testID
              accessibilityLabel={options.tabBarAccessibilityLabel?.toString()}
              testID={options.tabBarTestID?.toString()}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
            >
              <Animated.View style={{
                 // Apply scale animation to middle button
                transform: [{ scale: isMiddleButton ? middleButtonScale : (isFocused ? 1.1 : 1) }],
                // Apply glow effect to middle button
                opacity: isMiddleButton ? middleButtonGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }) : 1,
                // Add subtle shadow/glow for active state
                 ...Platform.select({
                  ios: {
                    shadowColor: isFocused ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: isFocused ? 4 : 0 },
                    shadowOpacity: isFocused ? 0.3 : 0,
                    shadowRadius: isFocused ? 8 : 0,
                  },
                  android: {
                    elevation: isFocused ? 8 : 0,
                  },
                }),
              }}>
               <View style={[
                  styles.iconContainer,
                  isMiddleButton && styles.middleIconContainer,
                  isFocused && styles.iconContainerFocused,
                ]}>
                <Ionicons
                  name={iconName as any}
                  size={isMiddleButton ? 36 : 24}
                  color={isFocused ? (isMiddleButton ? colors.white : colors.primary) : colors.text.secondary}
                />
               </View>
              </Animated.View>
              {!isMiddleButton && (
                 <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.text.secondary }]}>
                   {label}
                 </Text>
               )}
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Diet"
        component={DietPlanScreen}
        options={{
          tabBarLabel: 'Diet',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => <Ionicons name={focused ? "restaurant" : "restaurant-outline"} color={color} size={size} />,
        }}
      />
      {/* Middle Scan/Upload Button */}
      <Tab.Screen
        name="Upload"
        component={DashboardScreen}
        options={{
           tabBarLabel: 'Upload',
           tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => <Ionicons name={focused ? "scan-circle" : "scan-circle-outline"} color={color} size={size * 1.2} />,
         }}
      />
      <Tab.Screen
        name="Progress"
        component={ChartHistoryScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} color={color} size={size} />,
        }}
      />
       <Tab.Screen
        name="Profile"
        component={PlaceholderScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => <Ionicons name={focused ? "person" : "person-outline"} color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
    }),
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
   iconContainer:{
     padding: 5,
   },
   iconContainerFocused: {
   },
   middleIconContainer: {
     width: 56,
     height: 56,
     borderRadius: 28,
     backgroundColor: colors.primary,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: Platform.OS === 'ios' ? 40 : 30,
     ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
   },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    ...typography.caption,
  },
});

export default TabNavigator; 