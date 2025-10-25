import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextStyle,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const femaleIcon = require('../../../assets/🙋🏻‍♀️.png');
const maleIcon = require('../../../assets/🤷🏻‍.png');

type Gender = 'male' | 'female' | '';

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: '' as Gender,
    height: '',
    weight: '',
    activityLevel: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const activityLevelOptions = [
    'Sedentary (office job)',
    'Light Exercise (1-2 days/week)',
    'Moderate Exercise (3-5 days/week)',
    'Heavy Exercise (6-7 days/week)',
    'Athlete (2x per day)',
  ];

  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else {
      const age = parseInt(formData.age);
      if (isNaN(age) || age < 13 || age > 100) {
        newErrors.age = 'Please enter a valid age (13-100)';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!formData.height) {
      newErrors.height = 'Height is required';
    } else {
      const height = parseInt(formData.height);
      if (isNaN(height) || height < 100 || height > 250) {
        newErrors.height = 'Please enter a valid height (100-250 cm)';
      }
    }

    if (!formData.weight) {
      newErrors.weight = 'Weight is required';
    } else {
      const weight = parseInt(formData.weight);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        newErrors.weight = 'Please enter a valid weight (30-300 kg)';
      }
    }

    if (!formData.activityLevel) {
      newErrors.activityLevel = 'Please select your activity level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (validateForm()) {
      try {
        // Sign up user with email and password
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (signUpError) {
          throw signUpError;
        }

        let { session, user } = signUpData;

        if (!session || !user) {
          console.warn('Waiting for session...');
          const { data: newSessionData, error: getSessionError } = await supabase.auth.getSession();
          if (getSessionError) {
            throw getSessionError;
          }
          if (!newSessionData.session) {
            throw new Error('Still no active session after signup.');
          }
          session = newSessionData.session;
          user = session.user;
        }

        if (user) {
          // Insert profile data into 'profiles' table
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: user.id, // Use the ID from the fetched user to satisfy RLS
              email: formData.email,
              name: formData.name,
              age: parseInt(formData.age),
              gender: formData.gender,
              height_cm: parseFloat(formData.height),
              weight_kg: parseFloat(formData.weight),
              activity_level: formData.activityLevel,
            },
          ]);

          if (profileError) {
            throw profileError;
          }

          await AsyncStorage.setItem('isFirstLogin', 'true');
          Alert.alert('Success', 'Account created and profile saved!');
          navigation.navigate('Dashboard', { screen: 'Dashboard' });
        } else {
          Alert.alert('Error', 'User object not returned after signup.');
        }
      } catch (error: any) {
        Alert.alert('Signup Error', error.message);
      }
    }
  };

  const getInputStyle = (fieldName: string) => {
    const isFocused = focusedField === fieldName;
    const hasError = errors[fieldName];

    return [
      styles.input,
      isFocused ? styles.inputFocused : null,
      hasError ? styles.inputError : null,
    ];
  };

  const getGenderButtonStyle = (gender: Gender) => {
    const isSelected = formData.gender === gender;
    const isFocused = focusedField === 'gender';

    return [
      styles.genderButton,
      isSelected && styles.genderButtonSelected,
      isFocused && styles.genderButtonFocused,
    ];
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
        {/* Decorative accents for a modern look */}
        <View style={styles.headerAccentCircle} />
        <View style={styles.headerAccentCircle2} />
        
        <View style={styles.header}>
          <View style={styles.headerHeroCard}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>We’ll use your details to create accurate scans, a personalized diet plan, and progress insights just for you.</Text>
            <View style={styles.headerDivider} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={getInputStyle('name')}
              placeholder="Enter your full name"
              value={formData.name}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setFormData({ ...formData, name: text });
                if (errors.name) {
                  setErrors({ ...errors, name: '' });
                }
              }}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={getInputStyle('email')}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
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
              style={getInputStyle('password')}
              placeholder="Enter your password"
              secureTextEntry
              value={formData.password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setFormData({ ...formData, password: text });
                if (errors.password) {
                  setErrors({ ...errors, password: '' });
                }
              }}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={getInputStyle('age')}
              placeholder="Enter your age"
              keyboardType="number-pad"
              value={formData.age}
              onFocus={() => setFocusedField('age')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setFormData({ ...formData, age: text });
                if (errors.age) {
                  setErrors({ ...errors, age: '' });
                }
              }}
            />
            {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderButtonsContainer}>
              <TouchableOpacity
                style={getGenderButtonStyle('male')}
                onPress={() => {
                  setFormData({ ...formData, gender: 'male' });
                  setErrors({ ...errors, gender: '' });
                }}
                onFocus={() => setFocusedField('gender')}
                onBlur={() => setFocusedField(null)}
              >
                <Image source={maleIcon} style={styles.genderIcon} />
                <Text style={[styles.genderButtonText, formData.gender === 'male' && styles.genderButtonTextSelected]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={getGenderButtonStyle('female')}
                onPress={() => {
                  setFormData({ ...formData, gender: 'female' });
                  setErrors({ ...errors, gender: '' });
                }}
                onFocus={() => setFocusedField('gender')}
                onBlur={() => setFocusedField(null)}
              >
                <Image source={femaleIcon} style={styles.genderIcon} />
                <Text style={[styles.genderButtonText, formData.gender === 'female' && styles.genderButtonTextSelected]}>Female</Text>
              </TouchableOpacity>
            </View>
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={getInputStyle('height')}
              placeholder="Enter your height"
              keyboardType="number-pad"
              value={formData.height}
              onFocus={() => setFocusedField('height')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setFormData({ ...formData, height: text });
                if (errors.height) {
                  setErrors({ ...errors, height: '' });
                }
              }}
            />
            {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={getInputStyle('weight')}
              placeholder="Enter your weight"
              keyboardType="number-pad"
              value={formData.weight}
              onFocus={() => setFocusedField('weight')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setFormData({ ...formData, weight: text });
                if (errors.weight) {
                  setErrors({ ...errors, weight: '' });
                }
              }}
            />
            {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
          </View>

          {/* Activity Level Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Activity Level</Text>
            <TouchableOpacity
              style={[
                styles.input,
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                focusedField === 'activityLevel' ? styles.inputFocused : null,
                errors.activityLevel ? styles.inputError : null,
              ]}
              onPress={() => setActivityDropdownOpen((open) => !open)}
              onFocus={() => setFocusedField('activityLevel')}
              onBlur={() => setFocusedField(null)}
              activeOpacity={0.8}
            >
              <Text style={{ color: formData.activityLevel ? colors.text.primary : colors.text.secondary }}>
                {formData.activityLevel || 'Select your activity level'}
              </Text>
              <Text style={{ color: colors.text.secondary, fontSize: 18 }}>
                ▼
              </Text>
            </TouchableOpacity>
            {activityDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {activityLevelOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData({ ...formData, activityLevel: option });
                      setActivityDropdownOpen(false);
                      setErrors({ ...errors, activityLevel: '' });
                    }}
                  >
                    <Text style={{ color: colors.text.primary }}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.activityLevel && <Text style={styles.errorText}>{errors.activityLevel}</Text>}
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleSignup}>
            <Text style={styles.createButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginText}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    justifyContent: 'flex-end',
    paddingBottom: 24,
    shadowColor: colors.darkBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  headerHeroCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
    borderRadius: 1,
  },
  title: {
    ...typography.h2,
    color: colors.white,
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    ...typography.body1,
    color: colors.white,
    opacity: 0.8,
    lineHeight: 20,
  } as TextStyle,
  headerAccentCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -60,
    top: -40,
    transform: [{ rotate: '15deg' }],
  },
  headerAccentCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    left: -120,
    top: -100,
    transform: [{ rotate: '-10deg' }],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    ...typography.body2,
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
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  } as TextStyle,
  genderButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginHorizontal: 5,
  },
  genderButtonSelected: {
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.buttonPrimary,
  },
  genderButtonFocused: {
    borderColor: colors.buttonPrimary,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  genderButtonTextSelected: {
    color: colors.white,
  },
  genderIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    borderRadius: 12,
  },
  createButton: {
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
  createButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  } as TextStyle,
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    ...typography.body2,
    color: colors.text.secondary,
  } as TextStyle,
  loginText: {
    color: colors.buttonPrimary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dropdownMenu: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 100,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

export default SignupScreen; 