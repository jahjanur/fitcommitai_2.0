import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ActivityIndicator, Animated, Platform, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { Easing } from 'react-native';

const DietPlanScreen = () => {
  // Pulse animation for lock icon
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Animated gray background gradient
  const bgAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 3500, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 3500, useNativeDriver: false }),
      ])
    ).start();
  }, [bgAnim]);
  const bgInterpolate = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F4F6F8', '#E9ECEF'],
  });

  // Sparkle/star animation
  const sparkleAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  }, [sparkleAnim]);
  const sparkleTranslateY = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const sparkleOpacity = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] });

  // Progress bar (static for now, e.g., 70% to show anticipation)
  const progress = 0.7;

  // Animated countdown for 30 days from now
  const [countdown, setCountdown] = React.useState('30d 00h 00m 00s');
  React.useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + 30);
    const interval = setInterval(() => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('00d 00h 00m 00s');
        clearInterval(interval);
          return;
        }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(`${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notify button handler
  const handleNotify = () => {
    Alert.alert('Coming Soon', 'You will be able to get notified when this feature launches!');
  };

  return (
    <View style={styles.container}>
      {/* Animated background */}
      <Animated.View style={[styles.animatedBg, { backgroundColor: bgInterpolate }]} />
      {/* Header with consistent style */}
      <LinearGradient
        colors={[colors.darkBlue, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>AI After Photo</Text>
      </LinearGradient>
      <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 24 }}>
          <Ionicons name="lock-closed" size={64} color={colors.buttonPrimary} />
        </Animated.View>
        <Text style={styles.comingSoonHeadline}>AI After Photo Is Almost Here!</Text>
        <Text style={styles.comingSoonDescription}>
          Get ready to see your future self! Soon, you will unlock the most powerful motivation tool in fitness: a personalized AI After Photo based on your body fat, program, and goals.
          {'\n\n'}Our AI will project your transformation and adapt it as you commit to your plan, giving you a clear and realistic vision of your progress before it even happens.
        </Text>
        <View style={styles.countdownContainer}>
          <Ionicons name="time-outline" size={22} color={colors.buttonPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg} />
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        {/* Notify Me Button */}
        <TouchableOpacity style={styles.notifyButton} onPress={handleNotify} activeOpacity={0.85}>
          <Text style={styles.notifyButtonText}>Notify Me When It’s Live!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  animatedBg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  headerGradient: {
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
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    // fontFamily: 'YourCustomFont-Bold', // Uncomment and set if you have a custom font
  },
  comingSoonHeadline: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 10,
    paddingHorizontal: 18,
    zIndex: 3,
    // fontFamily: 'YourCustomFont-Bold', // Uncomment and set if you have a custom font
    letterSpacing: 0.5,
  },
  comingSoonDescription: {
    fontSize: 17,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 18,
    opacity: 0.92,
    paddingHorizontal: 18,
    zIndex: 3,
    // fontFamily: 'YourCustomFont-Regular', // Uncomment and set if you have a custom font
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 3,
  },
  countdownText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    letterSpacing: 1,
    // fontFamily: 'YourCustomFont-Bold', // Uncomment and set if you have a custom font
  },
  comingSoonCountdown: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    zIndex: 3,
    // fontFamily: 'YourCustomFont-Regular', // Uncomment and set if you have a custom font
  },
  progressBarContainer: {
    width: '70%',
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.white + '22',
    overflow: 'hidden',
    marginTop: 10,
    alignSelf: 'center',
    position: 'relative',
    zIndex: 3,
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white + '22',
    borderRadius: 6,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 6,
    height: '100%',
  },
  notifyButton: {
    marginTop: 32,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 38,
    alignItems: 'center',
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 3,
  },
  notifyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
    // fontFamily: 'YourCustomFont-Bold', // Uncomment and set if you have a custom font
  },
});

export default DietPlanScreen; 