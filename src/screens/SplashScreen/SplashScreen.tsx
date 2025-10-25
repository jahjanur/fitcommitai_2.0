import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../../theme/colors';

const Logo = require('../../../assets/logo.png');
const CircleBackground = require('../../../assets/Circle BG.png');

interface CustomSplashScreenProps {
  onFinish: () => void;
}

const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({ onFinish }) => {
  const logoScale = useState(new Animated.Value(0.7))[0];
  const circleScale = useState(new Animated.Value(0))[0];
  const logoFade = useState(new Animated.Value(0))[0];

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        // Start animations
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(logoFade, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(circleScale, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          }),
        ]).start(async () => {
          // Animation finished, hide splash screen and call onFinish
          await SplashScreen.hideAsync();
          onFinish();
        });

      } catch (e) {
        console.warn(e);
      } finally {
        // Even if there's an error, ensure onFinish is called
        // if (!logoScale._animation.__active) {
        //   SplashScreen.hideAsync();
        //   onFinish();
        // }
      }
    }

    prepare();
  }, []);

  return (
    <LinearGradient
      colors={[colors.darkBlue, colors.primary]} // Blue to purple gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.Image
        source={CircleBackground}
        style={[styles.circleBackground, { transform: [{ scale: circleScale }]}]}
      />
      <Animated.Image
        source={Logo}
        style={[styles.logo, { opacity: logoFade, transform: [{ scale: logoScale }]}]}
        resizeMode="contain"
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // or 'contain' depending on how you want it to fill
    opacity: 0.7, // Adjust opacity if needed
  },
  logo: {
    width: 150,
    height: 150,
  },
});

export default CustomSplashScreen; 