import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { colors } from '../../theme/colors';

interface AnalysisResponse {
  bodyFat: string;  // e.g., "10-12%"
  rationale: string;
}

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [bodyFatRange, setBodyFatRange] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to FitCommit</Text>
        <Text style={styles.subtitle}>Your journey starts here</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('RoleSelection')}
          >
            <Text style={styles.primaryButtonText}>Sign up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    marginBottom: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderColor: colors.buttonPrimary,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: colors.buttonPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default WelcomeScreen; 