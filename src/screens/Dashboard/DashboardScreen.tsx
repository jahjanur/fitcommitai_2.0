import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  TextStyle,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Dimensions,
  RefreshControl,
  Animated as RNAnimated,
  Easing,
  Modal,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { BlurView } from 'expo-blur';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types/navigation';
import { PieChart, ProgressChart, LineChart } from 'react-native-chart-kit';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '../../lib/supabase'; // Import Supabase
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg'; // Import Svg components
import { getBottomSpace } from 'react-native-iphone-x-helper';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define CustomTabBarButtonProps interface
interface CustomTabBarButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityState?: {
    selected?: boolean;
  };
}

// Assuming you place your logo here
const Logo = require('../../../assets/logo.png'); 
const MaleDefaultImage = require('../../../assets/MaleDefaultImage.png');
const FemaleDefaultProfilePic = require('../../../assets/femaleDefaultProfgile pic.png');
const FitCommitIconHome = require('../../../assets/FitCommitIconHome.svg'); // Import the new SVG icon

type DashboardScreenNavigationProp = BottomTabNavigationProp<MainTabParamList>;

interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: string;
  height_cm: number;
  weight_kg: number;
  bmi_bmi?: string;
  tdee_tdee?: string;
}

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const isFocused = useIsFocused();
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | null>(null);
  const [targetBodyFat, setTargetBodyFat] = useState<number>(12);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [progressHistory, setProgressHistory] = useState<{ body_fat: number; timestamp: string; analysis?: string }[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<null | {
    x: number;
    y: number;
    bodyFat: number;
    date: string;
    time: string;
  }>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; value: number; date: string } | null>(null);
  const [selectedRange, setSelectedRange] = useState('Weekly');
  const rangeOptions = [
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Yearly', value: 'Yearly' },
  ];
  const [latestScan, setLatestScan] = useState<any>(null);
  const [bmiInfoVisible, setBmiInfoVisible] = useState(false);
  const [tdeeInfoVisible, setTdeeInfoVisible] = useState(false);

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: colors.white,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Default color for labels
    strokeWidth: 2, // optional, default 3
    barPercentage: 0.5,
    useShadowColorFromDataset: false, // optional
  };

  const pieChartData = [
    { name: 'Used Cooking oil', population: 26, color: '#A8E6CF', legendFontColor: colors.text.secondary, legendFontSize: 12 },
    { name: 'Recyclables', population: 46, color: '#DCEDC8', legendFontColor: colors.text.secondary, legendFontSize: 12 },
    { name: 'Diapers', population: 20, color: '#FFD3B5', legendFontColor: colors.text.secondary, legendFontSize: 12 },
    { name: 'Other', population: 8, color: '#FFAAA5', legendFontColor: colors.text.secondary, legendFontSize: 12 }, // Adding an 'Other' category to sum up to 100
  ];

  const screenWidth = Dimensions.get('window').width;

  // Add BMI/TDEE calculation functions inline
  function calculateBMI(weightKg: number, heightCm: number): string | null {
    const heightM = heightCm / 100;
    if (!weightKg || !heightM) return null;
    return (weightKg / (heightM * heightM)).toFixed(2);
  }
  function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
    if (gender === 'male') {
      return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
  }
  function calculateTDEE(bmr: number, activityLevel: string): string {
    const multipliers: { [key: string]: number } = {
      sedentary: 1.2,
      'lightly active': 1.375,
      'moderately active': 1.55,
      'very active': 1.725,
      'extra active': 1.9,
    };
    return (bmr * (multipliers[activityLevel] ?? 1.2)).toFixed(0);
  }

  const bmiIcon = <Ionicons name="body" size={32} color={colors.white} style={{ textShadowColor: colors.buttonPrimary, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, marginBottom: 6 }} />;
  const tdeeIcon = <Ionicons name="flame" size={32} color={colors.white} style={{ textShadowColor: colors.primary, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, marginBottom: 6 }} />;

  const borderAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(borderAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isFocused) {
      const fetchProfile = async () => {
        try {
          const firstLogin = await AsyncStorage.getItem('isFirstLogin');
          if (firstLogin === 'true') {
            setIsFirstLogin(true);
            await AsyncStorage.removeItem('isFirstLogin');
          } else {
            setIsFirstLogin(false);
          }
          setLoadingProfile(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
      if (user) {
        const { data, error, status } = await supabase
          .from('profiles')
              .select('id, email, name, age, gender, height_cm, weight_kg, bmi_bmi, tdee_tdee')
          .eq('id', user.id)
          .single();
            if (error && status !== 406) throw error;
        if (data) {
          setProfile(data as UserProfile);
              await fetchProgressHistory(data.id);
              // Calculate and update BMI/TDEE if missing
              if ((data.bmi_bmi == null || data.tdee_tdee == null) && data.weight_kg && data.height_cm && data.age && data.gender) {
                const bmi = calculateBMI(data.weight_kg, data.height_cm);
                const bmr = calculateBMR(data.weight_kg, data.height_cm, data.age, data.gender);
                const tdee = calculateTDEE(bmr, 'sedentary');
                if (bmi && tdee) {
                  await supabase
                    .from('profiles')
                    .update({ bmi_bmi: bmi.toString(), tdee_tdee: tdee.toString() })
                    .eq('id', data.id);
                  setProfile((prev) => prev ? { ...prev, bmi_bmi: bmi.toString(), tdee_tdee: tdee.toString() } : prev);
                }
              }
            } else {
              setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
          setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };
    fetchProfile();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (user) {
          const { data, error, status } = await supabase
            .from('profiles')
            .select('id, email, name, age, gender, height_cm, weight_kg')
            .eq('id', user.id)
            .single();
          if (error && status !== 406) throw error;
          if (data) {
            setProfile(data as UserProfile);
            await fetchProgressHistory(data.id);
    } else {
            setProfile(null);
          }
    } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } finally {
        setRefreshing(false);
    }
    };
    fetchProfile();
  };

  const handleLogout = async () => {
    try {
    await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const fetchProgressHistory = async (userId: string) => {
    try {
      // Debug log for userId
      console.log('DEBUG-fetchProgressHistory-userId:', userId);
      const { data, error } = await supabase
        .from('progress_history')
        .select('body_fat, timestamp, analysis')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching progress history:', error);
        return;
      }

      if (data) {
        const formattedData = data.map(item => ({
          body_fat: item.body_fat,
          timestamp: item.timestamp,
          analysis: item.analysis, // Add analysis to the formatted data
        }));
        setProgressHistory(formattedData);
        
        // Set the latest body fat percentage
        if (formattedData.length > 0) {
          const latest = formattedData[formattedData.length - 1];
          setBodyFatPercentage(latest.body_fat);
      }
      }
      // Fetch latest scan for BMI, TDEE, and analysis_rationale
      const { data: scanData, error: scanError } = await supabase
        .from('body_scans')
        .select('bmi, tdee, analysis_rationale, analysis_body_fat')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!scanError && scanData) {
        setLatestScan(scanData);
      }
    } catch (error) {
      console.error('Error in fetchProgressHistory:', error);
    }
  };

  // --- Smart autoscaling for Y-axis ---
  let minBodyFat = 5, maxBodyFat = 40;
  if (progressHistory.length > 0) {
    minBodyFat = Math.min(...progressHistory.map(p => p.body_fat));
    maxBodyFat = Math.max(...progressHistory.map(p => p.body_fat));
    let range = maxBodyFat - minBodyFat;
    let buffer = Math.max(1, range * 0.1);
    minBodyFat = Math.floor(minBodyFat - buffer);
    maxBodyFat = Math.ceil(maxBodyFat + buffer);
    if (minBodyFat < 0) minBodyFat = 0;
    if (maxBodyFat > 60) maxBodyFat = 60;
    if (minBodyFat === maxBodyFat) {
      minBodyFat = Math.max(0, minBodyFat - 1);
      maxBodyFat = maxBodyFat + 1;
    }
  }

  // Helper to generate Y-axis ticks (5-7 ticks)
  const getYAxisTicks = () => {
    const ticks = [];
    const steps = 7;
    const step = (maxBodyFat - minBodyFat) / (steps - 1);
    for (let i = 0; i < steps; i++) {
      ticks.push(Math.round((maxBodyFat - i * step) * 10) / 10);
    }
    return ticks;
  };
  const yAxisTicks = getYAxisTicks();

  // Check for milestones (5% reduction, goal achievement, etc.)
  const getMilestones = () => {
    const milestones: Array<{
      index: number;
      type: 'reduction' | 'goal';
      value: number;
      x: number;
      y: number;
    }> = [];
    if (progressHistory.length < 2) return milestones;

    const firstValue = progressHistory[0].body_fat;
    for (let i = 1; i < progressHistory.length; i++) {
      const currentValue = progressHistory[i].body_fat;
      const reduction = firstValue - currentValue;
      
      // 5% reduction milestone
      if (reduction >= 5 && !milestones.some(m => m.type === 'reduction' && m.index === i)) {
        milestones.push({
          index: i,
          type: 'reduction',
          value: reduction,
          x: i,
          y: currentValue,
        });
      }
      
      // Goal achievement
      if (currentValue <= targetBodyFat && !milestones.some(m => m.type === 'goal' && m.index === i)) {
        milestones.push({
          index: i,
          type: 'goal',
          value: currentValue,
          x: i,
          y: currentValue,
        });
      }
    }
    return milestones;
  };

  const milestones = getMilestones();

  // Prepare chart-kit data (add a comment for future filtering)
  // TODO: Filter progressHistory based on selectedRange (Weekly, Monthly, Yearly)
  const chartLabels = progressHistory.map((point) => {
    const d = new Date(point.timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const chartDataArr = progressHistory.map((point) => point.body_fat);

  const renderHomeContent = () => {
    // Debug log for latestScan
    console.log('DEBUG-latestScan:', latestScan);
    console.log('DEBUG-analysis_rationale:', latestScan?.analysis_rationale);
    console.log('DEBUG-analysis_body_fat:', latestScan?.analysis_body_fat);
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.profileSection}>
            <Image
              source={profile?.gender === 'female' ? FemaleDefaultProfilePic : MaleDefaultImage}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.welcomeText}>{isFirstLogin ? 'Welcome' : 'Welcome back!'}</Text>
              <Text style={styles.nameText}>{profile?.name || 'User'}</Text>
              <Text style={styles.profileDetails}>
                {profile?.age} years • {profile?.height_cm}cm • {profile?.weight_kg}kg
              </Text>
          </View>
      </View>
        </View>

        {/* BMI and TDEE Cards: Only show TDEE if available */}
        <Animated.View
          style={{
            flexDirection: 'row',
            justifyContent: progressHistory.length > 0 && profile?.tdee_tdee ? 'space-between' : 'center',
            marginTop: 17,
            marginBottom: 12,
            paddingHorizontal: 20,
            gap: 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            position: 'relative',
            top: -15,
          }}
        >
          {/* BMI Card (always shown) */}
          <RNAnimated.View style={{ flex: 1, borderRadius: 20, overflow: 'visible', elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 }}>
            {/* Info Icon */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
              onPress={() => setBmiInfoVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="information-circle-outline" size={22} color={colors.white} />
            </TouchableOpacity>
            <Animated.View style={{
              position: 'absolute',
              top: -4, left: -4, right: -4, bottom: -4,
              borderRadius: 24,
              zIndex: 1,
              opacity: 0.7,
              borderWidth: 3,
              borderColor: 'transparent',
            }}>
              <LinearGradient
                colors={[colors.primary, colors.buttonPrimary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, borderRadius: 24, opacity: 0.7 }}
              />
            </Animated.View>
            <LinearGradient
              colors={[colors.primary, colors.buttonPrimary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}
            >
              {bmiIcon}
              <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 4, letterSpacing: 1 }}>BMI</Text>
              <RNAnimated.Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 32, letterSpacing: 1 }}>{profile?.bmi_bmi ?? '--'}</RNAnimated.Text>
            </LinearGradient>
          </RNAnimated.View>
          {/* TDEE Card (only if available and at least one scan) */}
          {progressHistory.length > 0 && profile?.tdee_tdee && (
            <RNAnimated.View style={{ flex: 1, borderRadius: 20, overflow: 'visible', elevation: 8, shadowColor: colors.buttonPrimary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 }}>
              {/* Info Icon */}
              <TouchableOpacity
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
                onPress={() => setTdeeInfoVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="information-circle-outline" size={22} color={colors.white} />
              </TouchableOpacity>
              <Animated.View style={{
                position: 'absolute',
                top: -4, left: -4, right: -4, bottom: -4,
                borderRadius: 24,
                zIndex: 1,
                opacity: 0.7,
                borderWidth: 3,
                borderColor: 'transparent',
              }}>
                <LinearGradient
                  colors={[colors.buttonPrimary, colors.primary, colors.buttonPrimary]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ flex: 1, borderRadius: 24, opacity: 0.7 }}
                />
              </Animated.View>
              <LinearGradient
                colors={[colors.buttonPrimary, colors.primary]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ padding: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}
              >
                {tdeeIcon}
                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 4, letterSpacing: 1 }}>TDEE</Text>
                <RNAnimated.Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 32, letterSpacing: 1 }}>{profile?.tdee_tdee}</RNAnimated.Text>
              </LinearGradient>
            </RNAnimated.View>
          )}
        </Animated.View>
        {/* BMI Info Modal */}
        <Modal visible={bmiInfoVisible} transparent animationType="fade" onRequestClose={() => setBmiInfoVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 0, width: '82%', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 }}>
              {/* Exit Icon Top Right */}
              <TouchableOpacity onPress={() => setBmiInfoVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
              </TouchableOpacity>
              <View style={{ padding: 26, width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8 }}>What is BMI?</Text>
                <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 18, opacity: 0.18 }} />
                <Text style={{ fontSize: 16, color: colors.text.primary, textAlign: 'center', marginBottom: 14, lineHeight: 22 }}>
                  Your Body Mass Index (BMI) gives you a quick look at your weight relative to your height, helping to categorize if you're underweight, normal, overweight, or obese. It's a useful screening tool, but remember it doesn't directly measure body fat.
                </Text>
                {/* BMI Ranges with color - modern, minimal pills */}
                <View style={{ width: '100%', marginTop: 6, alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 15, marginBottom: 10, textAlign: 'center' }}>BMI Ranges:</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    {/* Underweight */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F8EF7', marginRight: 7 }} />
                      <Text style={{ color: '#4F8EF7', fontWeight: '600', fontSize: 14, marginRight: 4 }}>Underweight</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{'< 18.5'}</Text>
                    </View>
                    {/* Normal Weight */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3DC47E', marginRight: 7 }} />
                      <Text style={{ color: '#3DC47E', fontWeight: '600', fontSize: 14, marginRight: 4 }}>Normal</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{'18.5 - 24.9'}</Text>
                    </View>
                    {/* Overweight */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFA726', marginRight: 7 }} />
                      <Text style={{ color: '#FFA726', fontWeight: '600', fontSize: 14, marginRight: 4 }}>Overweight</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{'25.0 - 29.9'}</Text>
                    </View>
                    {/* Obese */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F44336', marginRight: 7 }} />
                      <Text style={{ color: '#F44336', fontWeight: '600', fontSize: 14, marginRight: 4 }}>Obese</Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 13 }}>{'≥ 30.0'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
        {/* TDEE Info Modal */}
        <Modal visible={tdeeInfoVisible} transparent animationType="fade" onRequestClose={() => setTdeeInfoVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 0, width: '82%', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 }}>
              {/* Exit Icon Top Right */}
              <TouchableOpacity onPress={() => setTdeeInfoVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
              </TouchableOpacity>
              <View style={{ padding: 26, width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8 }}>What is TDEE?</Text>
                <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 18, opacity: 0.18 }} />
                <Text style={{ fontSize: 16, color: colors.text.primary, textAlign: 'center', marginBottom: 6, lineHeight: 22 }}>
                  TDEE (Total Daily Energy Expenditure) is the estimated number of calories you burn per day, including all activities. It is calculated based on your Basal Metabolic Rate (BMR) and your activity level, and helps guide nutrition and fitness planning.
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Body Fat Progress Section */}
        <View style={styles.progressSection}>
          {/* Latest Body Fat Card with Animated Gradient */}
          {progressHistory.length > 0 && (
            <RNAnimated.View style={styles.latestCard}>
              <LinearGradient
                colors={[colors.primary, colors.buttonPrimary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.95,
                }}
              >
                <Text style={{
                  color: colors.white,
                  fontSize: 18,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 6,
                  textShadowColor: 'rgba(0,0,0,0.12)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }}>
                  Latest Body Fat
                </Text>
                <RNAnimated.Text style={{
                  color: colors.white,
                  fontSize: 44,
                  fontWeight: 'bold',
                  letterSpacing: 1,
                  textShadowColor: 'rgba(0,0,0,0.18)',
                  textShadowOffset: { width: 0, height: 3 },
                  textShadowRadius: 8,
                }}>
                  {progressHistory[progressHistory.length - 1].body_fat.toFixed(1)}%
                </RNAnimated.Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 13,
                  marginTop: 4,
                }}>
                  {new Date(progressHistory[progressHistory.length - 1].timestamp).toLocaleDateString()} {new Date(progressHistory[progressHistory.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {/* Show the latest analysis rationale from progress_history if available */}
                {progressHistory[progressHistory.length - 1]?.analysis && (
                  <View style={{
                    marginTop: 16,
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    borderRadius: 14,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 4,
                  }}>
                    <Text style={{ color: colors.text.primary, fontSize: 13, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', letterSpacing: 0.2 }}>
                      AI Rationale
                    </Text>
                    <Text style={{ color: colors.text.primary, fontSize: 15, textAlign: 'center' }}>
                      {progressHistory[progressHistory.length - 1].analysis}
                    </Text>
        </View>
      )}
                {/* Optionally, also show analysis_body_fat if you want, below the rationale */}
                {latestScan?.analysis_body_fat && (
                  <View style={{
                    marginTop: 10,
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    borderRadius: 14,
                    padding: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 4,
                  }}>
                    <Text style={{ color: colors.text.primary, fontSize: 15, textAlign: 'center' }}>
                      {latestScan.analysis_body_fat}
                    </Text>
          </View>
                )}
              </LinearGradient>
            </RNAnimated.View>
          )}

          {/* Always show the chart if there is at least one data point, even if only one */}
          {progressHistory.length > 0 && (
            <View style={styles.chartKitCard}>
              {/* Card Header */}
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartCardTitle}>Body Fat %</Text>
                <Dropdown
                  style={styles.dropdown}
                  containerStyle={styles.dropdownContainer}
                  data={rangeOptions}
                  labelField="label"
                  valueField="value"
                  value={selectedRange}
                  onChange={item => setSelectedRange(item.value)}
                  placeholder={selectedRange}
                  maxHeight={120}
                  itemTextStyle={styles.dropdownItemText}
                  selectedTextStyle={styles.dropdownSelectedText}
                  iconStyle={styles.dropdownIcon}
                />
        </View>
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [
                    {
                      data: chartDataArr,
                      color: (opacity = 1) => colors.buttonPrimary, // line color
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={Dimensions.get('window').width - 60}
                height={240}
                yAxisSuffix="%"
                yAxisInterval={1}
                chartConfig={{
                  backgroundColor: colors.white,
                  backgroundGradientFrom: colors.white,
                  backgroundGradientTo: colors.white,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: colors.white,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '6',
                    stroke: colors.border,
                  },
                  propsForLabels: {
                    fontWeight: '500',
                  },
                }}
                bezier
                style={{
                  borderRadius: 18,
                  marginVertical: 8,
                }}
                withShadow={true}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                fromZero
                onDataPointClick={({ index, value, x, y }) => {
                  setActiveIndex(index);
                  setTooltipPos({
                    x,
                    y,
                    value,
                    date: chartLabels[index],
                  });
                }}
                decorator={() => {
                  if (tooltipPos) {
                    return (
                      <>
                        {/* Vertical line */}
                        <Svg
                          width={Dimensions.get('window').width - 60}
                          height={240}
                          style={{ position: 'absolute', left: 0, top: 0 }}
                        >
                          <Path
                            d={`M${tooltipPos.x},30 L${tooltipPos.x},210`}
                            stroke={colors.buttonPrimary}
                            strokeWidth={2}
                            strokeDasharray="4"
                          />
                        </Svg>
                        {/* Tooltip */}
                        <View
                          style={{
                            position: 'absolute',
                            left: tooltipPos.x - 40,
                            top: tooltipPos.y - 50,
                            backgroundColor: '#fff',
                            borderRadius: 10,
                            paddingVertical: 6,
                            paddingHorizontal: 14,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.12,
                            shadowRadius: 6,
                            elevation: 6,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontWeight: 'bold', color: colors.text.primary, fontSize: 16 }}>{tooltipPos.value.toFixed(1)}%</Text>
                          <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{tooltipPos.date}</Text>
        </View>
                      </>
                    );
                  }
                  return null;
                }}
                getDotColor={(dataPoint, index) =>
                  activeIndex === index ? colors.buttonPrimary : colors.buttonPrimary + '99'
                }
              />
        </View>
          )}
          {/* Show a friendly message if there are no data points at all */}
          {progressHistory.length === 0 && (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataText}>No progress data yet</Text>
              <Text style={styles.noDataSubtext}>Upload your first scan to see your progress chart here.</Text>
        </View>
          )}

          {/* Modern Interactive Chart with Enhanced Features */}

            
      </View>

      {/* Action Buttons */}
      <View style={styles.homeActionButtonsContainer}>
        <TouchableOpacity 
          style={styles.homeActionButton}
            onPress={() => navigation.navigate('Upload')}
        >
          <LinearGradient
            colors={[colors.darkBlue, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.homeActionButtonGradient}
          >
            <Ionicons name="camera-outline" size={24} color={colors.white} />
            <Text style={styles.homeActionButtonText}>Upload New Scan</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeActionButton}
            onPress={() => navigation.navigate('Diet')}
        >
          <LinearGradient
            colors={[colors.darkBlue, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.homeActionButtonGradient}
          >
            <Ionicons name="restaurant-outline" size={24} color={colors.white} />
            <Text style={styles.homeActionButtonText}>View Diet Plan</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeActionButton}
            onPress={() => navigation.navigate('Progress')}
        >
          <LinearGradient
            colors={[colors.darkBlue, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.homeActionButtonGradient}
          >
            <Ionicons name="folder-outline" size={24} color={colors.white} />
            <Text style={styles.homeActionButtonText}>View History</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tip Section */}
      <View style={styles.tipContainer}>
        <Ionicons name="bulb-outline" size={20} color={colors.buttonPrimary} />
        <Text style={styles.tipText}>Losing fat improves brain function. Sharper thinking, better focus, clearer mind.</Text>
      </View>
    </ScrollView>
  );
  };

  return (
    <View style={styles.container}>
      {/* Header with title */}
      <LinearGradient
        colors={[colors.darkBlue, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
    width: '100%',
    height: 120,
    position: 'absolute',
    top: 0,
    left: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    zIndex: 1,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.white }}>Dashboard</Text>
      </LinearGradient>
      <View style={{ flex: 1, paddingTop: 100 }}>
        {renderHomeContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 102 + getBottomSpace(), // ensure tip section is visible above nav bar
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: colors.text.secondary,
    paddingTop: 5,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  profileDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressSection: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
  },
  chartControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  fixedTooltip: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tooltipTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  tooltipDate: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 3,
  },
  tooltipTime: {
    color: colors.text.secondary,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  navigatorContainer: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 5,
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  progressValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.surface,
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.buttonPrimary,
    borderRadius: 5,
  },
  progressTarget: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  noDataCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  noDataText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: 15,
  },
  noDataSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 5,
  },
  homeActionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20, // keep small top margin
    marginBottom: 10, // keep small bottom margin
    gap: 10,
  },
  homeActionButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  homeActionButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeActionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
  },
  chartKitCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10, // add top margin for symmetry
    marginBottom: 10, // keep bottom margin same as top
    alignItems: 'center',
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  chartCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  dropdown: {
    width: 110,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dropdownContainer: {
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    zIndex: 100,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  dropdownSelectedText: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
  },
  dropdownIcon: {
    width: 18,
    height: 18,
    tintColor: colors.text.secondary,
  },
  latestCard: {
    borderRadius: 20,
    marginBottom: 10, // keep bottom margin tight
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: colors.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  metricText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '600',
    marginRight: 12,
  },
});

export default DashboardScreen; 