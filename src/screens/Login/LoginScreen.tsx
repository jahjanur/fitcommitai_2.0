import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextStyle,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import ForgotPasswordModal from '../Auth/ForgotPasswordModal';

const LoginScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (validateForm()) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Alert.alert('Success', 'Logged in!');
        navigation.navigate('Dashboard', { screen: 'Dashboard' });
      } catch (error: any) {
        Alert.alert('Login Error', error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[colors.darkBlue, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Your progress is waiting for you.</Text>
        </View>
      </LinearGradient>

      <View style={styles.formWrapper}>
        <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text: string) => {
              setEmail(text);
              if (errors.email) {
                setErrors({ ...errors, email: '' });
              }
            }}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={(text: string) => {
              setPassword(text);
              if (errors.password) {
                setErrors({ ...errors, password: '' });
              }
            }}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          <TouchableOpacity onPress={() => setForgotPasswordVisible(true)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: colors.buttonPrimary, fontWeight: 'bold' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Sign In and Continue Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupLinkText}>
            New here? <Text style={styles.signupText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={forgotPasswordVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', backgroundColor: colors.background, borderRadius: 20, padding: 20, shadowColor: colors.buttonPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}>
            <ForgotPasswordModal onPasswordReset={() => setForgotPasswordVisible(false)} />
            <TouchableOpacity onPress={() => setForgotPasswordVisible(false)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Text style={{ color: colors.buttonPrimary, fontWeight: 'bold', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'flex-end',
    paddingBottom: 28,
    shadowColor: colors.darkBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  subtitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
  } as TextStyle,
  form: {
    flex: 1,
    padding: 20,
    paddingVertical: 30,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 0,
    marginHorizontal: 20,
  },
  formWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    color: colors.text.secondary,
    marginBottom: 8,
  } as TextStyle,
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.error,
    marginTop: 4,
  } as TextStyle,
  loginButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  loginButtonText: {
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
    color: colors.white,
  } as TextStyle,
  signupLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    color: colors.text.secondary,
  } as TextStyle,
  signupText: {
    color: colors.buttonPrimary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default LoginScreen; 