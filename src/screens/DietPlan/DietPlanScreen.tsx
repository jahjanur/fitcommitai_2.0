import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, Modal, ActivityIndicator, RefreshControl, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../lib/supabase';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateTDEEWithDefaults } from '../../utils/tdeeCalculator';

interface MacroCalculation {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface GoalOption {
  id: string;
  name: string;
  percentage: number;
  description: string;
  proteinMultiplier: number;
  fatPercentage: number;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard' | 'Extreme';
}

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
  activity_level?: string;
}

const DietPlanScreen = () => {
  const isFocused = useIsFocused();
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<GoalOption | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [macroCalculation, setMacroCalculation] = useState<MacroCalculation | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestScan, setLatestScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLevel, setActivityLevel] = useState('bmr');
  const [exerciseFrequency, setExerciseFrequency] = useState('none');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const exerciseModalAnim = useRef(new Animated.Value(0)).current;
  
  // Fetch user profile and latest scan data
  useEffect(() => {
    if (isFocused) {
      fetchUserData();
    }
  }, [isFocused]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (user) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, name, age, gender, height_cm, weight_kg, bmi_bmi, tdee_tdee, activity_level')
          .eq('id', user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        
        if (profileData) {
          setProfile(profileData);
          
          // Set activity level from profile data
          if (profileData.activity_level) {
            setActivityLevel(profileData.activity_level);
          }
          
          // Fetch latest scan for body fat percentage and TDEE from body_scans table
          const { data: scanData, error: scanError } = await supabase
            .from('body_scans')
            .select('analysis_body_fat, tdee, scanned_at')
            .eq('user_id', user.id)
            .order('scanned_at', { ascending: false })
            .limit(1)
            .single();
          
          if (!scanError && scanData) {
            setLatestScan(scanData);
          }
          
          // Calculate and save TDEE to AsyncStorage for Dashboard sync on initial load
          if (profileData.weight_kg) {
            const bodyFat = scanData?.analysis_body_fat || 15;
            const currentActivityLevel = profileData.activity_level || 'bmr';
            const tdee = calculateTDEEWithDefaults(profileData.weight_kg, currentActivityLevel, 'none', bodyFat);
            const rounded = Math.round(tdee);
            await AsyncStorage.setItem('dietPlan_tdee', rounded.toString());
            console.log('Saved TDEE to AsyncStorage (initial load):', rounded);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Animate Exercise modal when it opens/closes
  useEffect(() => {
    if (showExerciseModal) {
      exerciseModalAnim.setValue(0);
      Animated.timing(exerciseModalAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(exerciseModalAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showExerciseModal]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  const updateActivityLevel = async (newActivityLevel: string) => {
    try {
      if (!profile?.id) {
        console.error('No profile ID available');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ activity_level: newActivityLevel })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating activity level:', error);
        Alert.alert('Error', 'Failed to update activity level. Please try again.');
        return;
      }

      // Update local profile state
      setProfile(prev => prev ? { ...prev, activity_level: newActivityLevel } : prev);
      
      // Save to AsyncStorage for Dashboard sync
      await AsyncStorage.setItem('dietPlan_activityLevel', newActivityLevel);
      console.log('Saved activity level:', newActivityLevel);

      // Recompute TDEE immediately using latest data and persist (rounded)
      if (profile?.weight_kg) {
        const weight = profile.weight_kg;
        const bodyFat = latestScan?.analysis_body_fat || 15;
        const leanMass = weight - (weight * (bodyFat / 100));
        const bmr = 370 + (21.6 * leanMass);
        const tdeeValue = calculateTDEEWithDefaults(weight, newActivityLevel, exerciseFrequency, bodyFat);
        const rounded = Math.round(tdeeValue);
        await AsyncStorage.setItem('dietPlan_tdee', rounded.toString());
        console.log('Saved TDEE to AsyncStorage (activity change):', rounded);
        // Also update profile.tdee_tdee so Dashboard shows exact same number
        await supabase
          .from('profiles')
          .update({ tdee_tdee: rounded.toString() })
          .eq('id', profile.id);
        setProfile(prev => prev ? { ...prev, tdee_tdee: rounded.toString() } : prev);
      }
    } catch (error) {
      console.error('Error updating activity level:', error);
      Alert.alert('Error', 'Failed to update activity level. Please try again.');
    }
  };

  const activityLevels = [
    { value: 'bmr', label: 'Resting (BMR)', description: 'No activity. Mostly lying down or bedridden.' },
    { value: 'sedentary', label: 'Sedentary', description: 'Little movement. Example: office workers, programmers, students' },
    { value: 'lightly active', label: 'Light Activity', description: 'On your feet some of the day. Example: teachers, receptionists, retail workers.' },
    { value: 'moderately active', label: 'Moderate Activity', description: 'Active work. Example: nurses, chefs, warehouse staff.' },
    { value: 'very active', label: 'Heavy Activity', description: 'Physically demanding work. Example: construction workers, farmers, cleaners.' },
    { value: 'extra active', label: 'Very Heavy Activity', description: 'Intense physical labor. Example: movers, roofers, heavy laborers.' }
  ];

  const exerciseFrequencies = [
    { value: 'none', label: 'No Exercise', description: 'No weekly training', add: 0.0 },
    { value: '1-2', label: '1–2 days/week', description: 'Light training', add: 0.05 },
    { value: '3-4', label: '3–4 days/week', description: 'Moderate training', add: 0.1 },
    { value: '5-6', label: '5–6 days/week', description: 'Frequent training', add: 0.15 },
    { value: 'daily', label: 'Daily / Multiple per day', description: 'High training frequency', add: 0.2 },
  ];

  // TDEE calculation now uses unified calculator from utils/tdeeCalculator.ts

  const goals = [
    { id: 'deficit', name: 'Fat Loss (Deficit)', icon: 'trending-down', color: '#FF6B6B' },
    { id: 'maintenance', name: 'Maintenance', icon: 'remove', color: '#4ECDC4' },
    { id: 'gain', name: 'Muscle Gain', icon: 'trending-up', color: '#45B7D1' },
  ];

  const deficitOptions: GoalOption[] = [
    {
      id: 'deficit-15',
      name: '15% Gentle (Easy)',
      percentage: 15,
      description: 'Eat about 15% fewer calories than your daily burn. Slow and steady fat loss with excellent muscle preservation. Duration: 3+ months',
      proteinMultiplier: 2.3,
      fatPercentage: 25,
      duration: '3+ months',
      difficulty: 'Easy'
    },
    {
      id: 'deficit-20',
      name: '20% Moderate (Easy)',
      percentage: 20,
      description: 'Eat about 20% fewer calories than your daily burn. Steady results with minimal hunger or fatigue. Duration: 2 to 3 months',
      proteinMultiplier: 2.5,
      fatPercentage: 25,
      duration: '2-3 months',
      difficulty: 'Easy'
    },
    {
      id: 'deficit-25',
      name: '25% Effective (Moderate)',
      percentage: 25,
      description: 'Eat about 25% fewer calories than your daily burn. The sweet spot for most people. Duration: 6 to 10 weeks',
      proteinMultiplier: 2.7,
      fatPercentage: 27,
      duration: '6-10 weeks',
      difficulty: 'Moderate'
    },
    {
      id: 'deficit-30',
      name: '30% Fast (Hard)',
      percentage: 30,
      description: 'Eat about 30% fewer calories than your daily burn. Rapid results with higher hunger and fatigue. Duration: 4 to 6 weeks',
      proteinMultiplier: 2.9,
      fatPercentage: 28,
      duration: '4-6 weeks',
      difficulty: 'Hard'
    },
    {
      id: 'deficit-35',
      name: '35% Intense (Very Hard)',
      percentage: 35,
      description: 'Eat about 35% fewer calories than your daily burn. Very fast results requiring strong willpower. Duration: 2 to 3 weeks',
      proteinMultiplier: 3.1,
      fatPercentage: 30,
      duration: '2-3 weeks',
      difficulty: 'Very Hard'
    },
    {
      id: 'deficit-40',
      name: '40% Extreme (Extreme)',
      percentage: 40,
      description: 'Eat about 40% fewer calories than your daily burn. Maximum speed, highest risk of muscle loss. Not recommended unless short term and supervised. Duration: 1 to 2 weeks',
      proteinMultiplier: 3.2,
      fatPercentage: 30,
      duration: '1-2 weeks',
      difficulty: 'Extreme'
    }
  ];

  const maintenanceOptions: GoalOption[] = [
    {
      id: 'maintenance-0',
      name: 'Maintenance (Easy)',
      percentage: 0,
      description: 'Calories match your daily burn to maintain weight. Best for long term balance and body recomposition.',
      proteinMultiplier: 2.3,
      fatPercentage: 30,
      duration: 'ongoing',
      difficulty: 'Easy'
    }
  ];

  const gainOptions: GoalOption[] = [
    {
      id: 'gain-5',
      name: '5% Slow and Steady (Easy)',
      percentage: 5,
      description: 'Minimal fat gain with gradual, quality muscle growth. Best for long term consistency. Duration: 6+ months',
      proteinMultiplier: 2.3,
      fatPercentage: 30,
      duration: '6+ months',
      difficulty: 'Easy'
    },
    {
      id: 'gain-10',
      name: '10% Balanced Growth (Moderate)',
      percentage: 10,
      description: 'Steady muscle gain with controlled fat increase. A good balance of speed and sustainability. Duration: 3 to 6 months',
      proteinMultiplier: 2.3,
      fatPercentage: 30,
      duration: '3-6 months',
      difficulty: 'Moderate'
    },
    {
      id: 'gain-15',
      name: '15% Fast Gains (Hard)',
      percentage: 15,
      description: 'Rapid muscle growth with more noticeable fat gain. Best for short term progress. Duration: 2 to 4 months',
      proteinMultiplier: 2.3,
      fatPercentage: 30,
      duration: '2-4 months',
      difficulty: 'Hard'
    }
  ];

  const calculateMacros = (option: GoalOption) => {
    if (!profile || !profile.weight_kg) {
      return null;
    }

    const weight = profile.weight_kg;
    // Use latest TDEE from scan data, fallback to profile TDEE, then calculate if needed
    let tdee = latestScan?.tdee ? parseFloat(latestScan.tdee) : 
               (profile.tdee_tdee ? parseFloat(profile.tdee_tdee) : null);
    
    // Always recalculate TDEE with current activity level for accuracy
    if (profile.weight_kg) {
      const bodyFat = latestScan?.analysis_body_fat || 15; // Default to 15% if no scan data
      const currentActivityLevel = profile.activity_level || activityLevel;
      tdee = calculateTDEEWithDefaults(weight, currentActivityLevel, exerciseFrequency, bodyFat);
    }
    
    // Save calculated TDEE to AsyncStorage for Dashboard sync (rounded)
    if (tdee) {
      const rounded = Math.round(tdee);
      AsyncStorage.setItem('dietPlan_tdee', rounded.toString());
      console.log('Saved TDEE to AsyncStorage:', rounded);
    }
    
    if (!tdee) {
      return null;
    }

    const bodyFat = latestScan?.analysis_body_fat || 15; // Default to 15% if no scan data
    const leanMass = weight - (weight * (bodyFat / 100));
    
    // Calculate target calories based on goal type
    let targetCalories;
    if (option.percentage === 0) {
      // Maintenance - no change
      targetCalories = tdee;
    } else if (option.id.startsWith('gain')) {
      // Muscle gain - add surplus calories
      targetCalories = tdee * (1 + option.percentage / 100);
    } else {
      // Fat loss - subtract deficit calories
      targetCalories = tdee * (1 - option.percentage / 100);
    }
    
    // Protein calculation
    const proteinGrams = leanMass * option.proteinMultiplier;
    const proteinCalories = proteinGrams * 4;
    
    // Fat calculation
    const fatCalories = targetCalories * (option.fatPercentage / 100);
    const fatGrams = fatCalories / 9;
    
    // Carb calculation (remainder)
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = carbCalories / 4;
    
    return {
      calories: Math.round(targetCalories),
      protein: Math.round(proteinGrams),
      fat: Math.round(fatGrams),
      carbs: Math.round(carbGrams)
    };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4ECDC4';
      case 'Moderate': return '#45B7D1';
      case 'Hard': return '#FFA726';
      case 'Very Hard': return '#FF7043';
      case 'Extreme': return '#D32F2F';
      default: return colors.text.secondary;
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.darkBlue, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <Text style={styles.headerTitle}>Diet Plan</Text>
      <Text style={styles.headerSubtitle}>Your personalized nutrition guide</Text>
    </LinearGradient>
  );

  const renderUserStats = () => {
    if (!profile) return null;

    const bodyFat = latestScan?.analysis_body_fat || 'N/A';
    const leanMass = profile.weight_kg ? Math.round(profile.weight_kg - (profile.weight_kg * ((latestScan?.analysis_body_fat || 15) / 100))) : 'N/A';
    
    // Calculate TDEE with current activity level
    let tdee = 'N/A';
    if (profile.weight_kg) {
      const bodyFat = latestScan?.analysis_body_fat || 15; // Default to 15% if no scan data
      const leanMass = profile.weight_kg - (profile.weight_kg * (bodyFat / 100));
      const bmr = 370 + (21.6 * leanMass);
      const currentActivityLevel = profile.activity_level || activityLevel;
      tdee = Math.round(calculateTDEEWithDefaults(profile.weight_kg, currentActivityLevel, exerciseFrequency, bodyFat)).toString();
    }

    const currentActivity = activityLevels.find(level => level.value === (profile.activity_level || activityLevel));

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.activityButtonsContainer}>
            <TouchableOpacity 
              style={styles.activityButton}
              onPress={() => setShowActivityModal(true)}
            >
              <Ionicons name="walk-outline" size={16} color={colors.white} />
              <Text style={styles.activityButtonText}>Activity Level</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.activityButton, activityLevel === 'bmr' && styles.activityButtonDisabled]}
              onPress={() => activityLevel !== 'bmr' && setShowExerciseModal(true)}
              disabled={activityLevel === 'bmr'}
            >
              <Ionicons name="fitness-outline" size={16} color={colors.white} />
              <Text style={[styles.activityButtonText, activityLevel === 'bmr' && styles.activityButtonTextDisabled]}>
                Exercise Activity
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Modern Stats Grid */}
        <View style={styles.modernStatsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.modernStatCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="scale-outline" size={24} color={colors.buttonPrimary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.modernStatValue}>{profile.weight_kg || 'N/A'}</Text>
                <Text style={styles.modernStatLabel}>Weight</Text>
                <Text style={styles.modernStatUnit}>kg</Text>
              </View>
            </View>
            
            <View style={styles.modernStatCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="body-outline" size={24} color={colors.buttonPrimary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.modernStatValue}>{bodyFat}</Text>
                <Text style={styles.modernStatLabel}>Body Fat</Text>
                <Text style={styles.modernStatUnit}>%</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.modernStatCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flame-outline" size={24} color={colors.buttonPrimary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.modernStatValue}>{tdee}</Text>
                <Text style={styles.modernStatLabel}>TDEE</Text>
                <Text style={styles.modernStatUnit}>cal</Text>
              </View>
            </View>
            
            <View style={styles.modernStatCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="fitness-outline" size={24} color={colors.buttonPrimary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.modernStatValue}>{leanMass}</Text>
                <Text style={styles.modernStatLabel}>Lean Mass</Text>
                <Text style={styles.modernStatUnit}>kg</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Activity Level Info */}
        <View style={styles.modernActivityInfo}>
          <View style={styles.activityInfoLeft}>
            <Ionicons name="walk-outline" size={20} color={colors.buttonPrimary} />
            <Text style={styles.activityInfoLabel}>Activity Level</Text>
          </View>
          <Text style={styles.activityInfoValue}>{currentActivity?.label}</Text>
        </View>
        
        {/* Exercise Activity Level Info */}
        {activityLevel !== 'bmr' && (
          <View style={styles.modernActivityInfo}>
            <View style={styles.activityInfoLeft}>
              <Ionicons name="fitness-outline" size={20} color={colors.darkBlue} />
              <Text style={styles.activityInfoLabel}>Exercise Activity Level</Text>
            </View>
            <Text style={[styles.activityInfoValue, { color: colors.darkBlue }]}>
              {exerciseFrequencies.find(freq => freq.value === exerciseFrequency)?.label}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderGoalSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Your Goal</Text>
      <View style={styles.goalGrid}>
        {goals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              selectedGoal === goal.id && styles.goalCardSelected
            ]}
            onPress={() => {
              setSelectedGoal(goal.id);
              if (goal.id === 'maintenance') {
                // Directly set maintenance option without showing modal
                const maintenanceOption = maintenanceOptions[0];
                setSelectedOption(maintenanceOption);
                setMacroCalculation(calculateMacros(maintenanceOption));
              } else {
                setShowGoalModal(true);
              }
            }}
          >
            <Ionicons 
              name={goal.icon as any} 
              size={32} 
              color={selectedGoal === goal.id ? colors.white : goal.color} 
            />
            <Text style={[
              styles.goalCardText,
              selectedGoal === goal.id && styles.goalCardTextSelected
            ]}>
              {goal.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCurrentPlan = () => {
    if (!selectedOption || !profile) return null;

    const macros = calculateMacros(selectedOption);
    if (!macros) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Current Plan</Text>
        <View style={styles.currentPlanCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{selectedOption.name}</Text>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(selectedOption.difficulty) }
            ]}>
              <Text style={styles.difficultyText}>{selectedOption.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.planDescription}>{selectedOption.description}</Text>
          <Text style={styles.planDuration}>Duration: {selectedOption.duration}</Text>
          
          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{macros.calories}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{macros.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{macros.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{macros.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderActivityModal = () => (
    <Modal
      visible={showActivityModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowActivityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Activity Level</Text>
            <TouchableOpacity onPress={() => setShowActivityModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalSubtext}>This helps us adjust your calorie needs based on your daily routine.</Text>
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.activityOptionCard,
                  activityLevel === level.value && styles.activityOptionCardSelected
                ]}
                onPress={async () => {
                  setActivityLevel(level.value);
                  await updateActivityLevel(level.value);
                  if (level.value === 'bmr') {
                    setExerciseFrequency('none');
                    setShowActivityModal(false);
                  } else {
                    setShowActivityModal(false);
                    setShowExerciseModal(true);
                  }
                }}
              >
                <View style={styles.activityOptionHeader}>
                  <Text style={[
                    styles.activityOptionName,
                    activityLevel === level.value && styles.activityOptionNameSelected
                  ]}>
                    {level.label}
                  </Text>
                  {activityLevel === level.value && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.buttonPrimary} />
                  )}
                </View>
                <Text style={[
                  styles.activityOptionDescription,
                  activityLevel === level.value && styles.activityOptionDescriptionSelected
                ]}>
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderExerciseModal = () => (
    <Modal
      visible={showExerciseModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowExerciseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[
          styles.modalContent,
          {
            transform: [{ translateY: exerciseModalAnim.interpolate({ inputRange: [0,1], outputRange: [40, 0] }) }],
            opacity: exerciseModalAnim,
          }
        ]}>
          <LinearGradient colors={[colors.darkBlue, colors.primary]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.exerciseHeaderGradient}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection:'row',alignItems:'center'}}>
                <Ionicons name="barbell-outline" size={20} color={colors.white} />
                <Text style={[styles.modalTitle,{color: colors.white, marginLeft: 8}]}>Select Exercise Frequency</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.frequencySubtitle}>Exercise Frequency</Text>
            {exerciseFrequencies.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                activeOpacity={0.85}
                style={[
                  styles.frequencyOptionCard,
                  exerciseFrequency === freq.value && styles.frequencyOptionCardSelected
                ]}
                onPress={() => {
                  setExerciseFrequency(freq.value);
                  setShowExerciseModal(false);
                  // Save to AsyncStorage for Dashboard sync
                  AsyncStorage.setItem('dietPlan_exerciseFrequency', freq.value);
                  console.log('Saved exercise frequency:', freq.value);
                  // Recompute and persist TDEE with new exercise frequency
                  if (profile?.weight_kg) {
                    const weight = profile.weight_kg;
                    const bodyFat = latestScan?.analysis_body_fat || 15;
                    const leanMass = weight - (weight * (bodyFat / 100));
                    const bmr = 370 + (21.6 * leanMass);
                    const tdeeValue = calculateTDEEWithDefaults(weight, profile.activity_level || activityLevel, freq.value, bodyFat);
                    const rounded = Math.round(tdeeValue);
                    AsyncStorage.setItem('dietPlan_tdee', rounded.toString());
                    console.log('Saved TDEE to AsyncStorage (exercise change):', rounded);
                    supabase
                      .from('profiles')
                      .update({ tdee_tdee: rounded.toString() })
                      .eq('id', profile.id);
                    setProfile(prev => prev ? { ...prev, tdee_tdee: rounded.toString() } : prev);
                  }
                }}
              >
                <View style={styles.frequencyOptionHeader}>
                  <View style={{flexDirection:'row',alignItems:'center'}}>
                    <Ionicons name="fitness-outline" size={18} color={exerciseFrequency === freq.value ? colors.darkBlue : colors.buttonPrimary} />
                    <Text style={[
                      styles.frequencyOptionName,
                      exerciseFrequency === freq.value && styles.frequencyOptionNameSelected
                    ]}>
                      {freq.label}
                    </Text>
                  </View>
                  {exerciseFrequency === freq.value && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.darkBlue} />
                  )}
                </View>
                <Text style={[
                  styles.frequencyOptionDescription,
                  exerciseFrequency === freq.value && styles.frequencyOptionDescriptionSelected
                ]}>
                  {freq.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderGoalModal = () => (
    <Modal
      visible={showGoalModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowGoalModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Goal</Text>
            <TouchableOpacity onPress={() => setShowGoalModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {selectedGoal === 'deficit' && (
              <View>
                <Text style={styles.modalSubtitle}>Choose Your Fat Loss Plan</Text>
                <Text style={styles.modalSubtext}>Each option is a percent calorie reduction from your Total Daily Burn (TDEE).</Text>
                {deficitOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionCard}
                    onPress={() => {
                      setSelectedOption(option);
                      setMacroCalculation(calculateMacros(option));
                      setShowGoalModal(false);
                    }}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionName}>{option.name}</Text>
                      <View style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor(option.difficulty) }
                      ]}>
                        <Text style={styles.difficultyText}>{option.difficulty}</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                    <Text style={styles.optionDuration}>Duration: {option.duration}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {selectedGoal === 'maintenance' && (
              <View>
                <Text style={styles.modalSubtitle}>Maintenance Options</Text>
                {maintenanceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionCard}
                    onPress={() => {
                      setSelectedOption(option);
                      setMacroCalculation(calculateMacros(option));
                      setShowGoalModal(false);
                    }}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionName}>{option.name}</Text>
                      <View style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor(option.difficulty) }
                      ]}>
                        <Text style={styles.difficultyText}>{option.difficulty}</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                    <Text style={styles.optionDuration}>Duration: {option.duration}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {selectedGoal === 'gain' && (
              <View>
                <Text style={styles.modalSubtitle}>Choose Your Muscle Gain Plan</Text>
                <Text style={styles.modalSubtext}>Pick your pace. Higher % means faster growth but more fat gain.</Text>
                {gainOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionCard}
                    onPress={() => {
                      setSelectedOption(option);
                      setMacroCalculation(calculateMacros(option));
                      setShowGoalModal(false);
                    }}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionName}>{option.name}</Text>
                      <View style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor(option.difficulty) }
                      ]}>
                        <Text style={styles.difficultyText}>{option.difficulty}</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                    <Text style={styles.optionDuration}>Duration: {option.duration}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorText}>Please complete your profile setup first.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderUserStats()}
        {renderGoalSelection()}
        {renderCurrentPlan()}
        
        <TouchableOpacity 
          style={styles.customizeButton} 
          onPress={() => Alert.alert('Coming Soon', 'Customize your meal plan')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.white} />
          <Text style={styles.customizeButtonText}>Build My Plan</Text>
        </TouchableOpacity>
      </ScrollView>
      {renderActivityModal()}
      {renderExerciseModal()}
      {renderGoalModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    width: '100%',
    height: 120,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  goalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalCardSelected: {
    backgroundColor: colors.buttonPrimary,
  },
  goalCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  goalCardTextSelected: {
    color: colors.white,
  },
  currentPlanCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  planDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  planDuration: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 2,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 100,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  customizeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  exerciseHeaderGradient: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  modalSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  optionDuration: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  activityButtonDisabled: {
    backgroundColor: colors.text.secondary,
    borderColor: colors.text.secondary,
    opacity: 0.6,
  },
  activityButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  activityButtonTextDisabled: {
    color: colors.white,
    opacity: 0.7,
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  activityLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 8,
  },
  activityValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  activityOptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityOptionCardSelected: {
    backgroundColor: colors.buttonPrimary + '10',
    borderColor: colors.buttonPrimary,
  },
  activityOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  activityOptionNameSelected: {
    color: colors.buttonPrimary,
  },
  activityOptionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  activityOptionDescriptionSelected: {
    color: colors.text.primary,
  },
  frequencySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.darkBlue,
    marginBottom: 12,
    opacity: 0.9,
  },
  frequencyOptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.darkBlue + '55',
  },
  frequencyOptionCardSelected: {
    backgroundColor: colors.darkBlue + '10',
    borderColor: colors.darkBlue,
  },
  frequencyOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  frequencyOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  frequencyOptionNameSelected: {
    color: colors.darkBlue,
  },
  frequencyOptionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  frequencyOptionDescriptionSelected: {
    color: colors.text.primary,
  },
  modernStatsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modernStatCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  modernStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  modernStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  modernStatUnit: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernActivityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  activityInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityInfoLabel: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  activityInfoValue: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '600',
  },
  });
  
  export default DietPlanScreen; 