import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

const Illustration = require('../../../assets/Illustration.png');
const Illustration2 = require('../../../assets/Illustration-2.png');
const Gradient3 = require('../../../assets/gradient-3.png');
const CircleBG = require('../../../assets/Circle BG.png');
const Dots = require('../../../assets/Dots.png');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const slides = [
    {
      illustration: Illustration,
      title: 'Understand Your Body',
      subtitle: 'Change your life by slowly adding new healthy habits and sticking to them.',
    },
    {
      illustration: Illustration2,
      title: 'Track Your Progress',
      subtitle: 'Each scan gets you closer to your transformation. See how your body changes over time and stay motivated.',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prevPage) => {
        const nextPageIndex = (prevPage + 1) % slides.length;
        scrollViewRef.current?.scrollTo({ x: nextPageIndex * width, animated: true });
        return nextPageIndex;
      });
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const renderContent = () => {
    const currentSlide = slides[currentPage];
    return (
      <View style={styles.slideContent}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.illustrationScrollContainer}
        >
          {slides.map((slide, index) => (
            <View key={index} style={styles.illustrationPage}>
              <Image source={slide.illustration} style={styles.illustration} />
            </View>
          ))}
        </ScrollView>

        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>

        {/* Page indicator dots */}
        <View style={styles.paginationDots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Ionicons name="mail-outline" size={20} color={colors.buttonPrimary} />
          <Text style={styles.emailButtonText}>Continue with E-mail</Text>
        </TouchableOpacity>

        {/* Social Login Buttons */}
 

        {/* Footer Text */}
        <Text style={styles.footerText}>
          By continuing you agree Terms of Services & Privacy Policy
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[colors.darkBlue, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fullScreenGradient}
    >
      {/* Floating background elements - Dots.png */}
      <Image source={Dots} style={[styles.backgroundParticle, { top: height * 0.1, left: width * 0.05, opacity: 0.2 }]} />
      <Image source={Dots} style={[styles.backgroundParticle, { top: height * 0.3, right: width * 0.1, opacity: 0.2 }]} />
      <Image source={Dots} style={[styles.backgroundParticle, { bottom: height * 0.2, left: width * 0.15, opacity: 0.2 }]} />

      {/* Floating background elements - gradient-3.png and Circle BG.png */}
      <Image source={Gradient3} style={[styles.floatingGradient, { top: height * 0.15, left: width * 0.05, opacity: 0.8, transform: [{ rotate: '45deg' }] }]} />
      <Image source={Gradient3} style={[styles.floatingGradient, { bottom: height * 0.1, right: width * 0.08, opacity: 0.8, transform: [{ rotate: '-30deg' }] }]} />
      <Image source={CircleBG} style={[styles.floatingGradient, { left: '50%', top: '50%', transform: [{ translateX: -400 }, { translateY: -400 }], opacity: 0.7 }]} />

      {renderContent()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  fullScreenGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingGradient: {
    position: 'absolute',
    width: 800,
    height: 800,
    resizeMode: 'contain',
  },
  backgroundParticle: {
    position: 'absolute',
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  slideContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    position: 'relative',
    paddingTop: height * 0.1,
  },
  illustrationScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationPage: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '100%',
    height: height * 0.4,
    resizeMode: 'contain',
    marginBottom: 100,
  },
  avatarContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.white,
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  chatBubble: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatBubbleText: {
    fontSize: 12,
    color: colors.text.primary,
  },
  streakCard: {
    position: 'absolute',
    top: height * 0.25, // Adjust position as needed
    right: width * 0.1,
    backgroundColor: colors.white,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  streakLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginHorizontal: 30,
    marginBottom: 40,
    opacity: 0.8,
  },
  paginationDots: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginHorizontal: 4,
    opacity: 0.4,
  },
  activeDot: {
    opacity: 1,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '80%',
    maxWidth: 300,
    marginBottom: 15,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  emailButtonText: {
    color: colors.buttonPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    maxWidth: 300,
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: colors.white,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  footerText: {
    fontSize: 12,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.7,
    marginHorizontal: 20,
  },
});

export default OnboardingScreen; 