import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { RootStackNavigationProp, RootStackRouteProp } from '../../types/navigation';

const ResetPasswordScreen = () => {
  const route = useRoute<RootStackRouteProp<'ResetPassword'>>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Supabase deeplinks for password reset include the access token in the URL fragment
    // We need to extract it from the route params passed by the navigator
    if (route.params?.access_token) {
      setAccessToken(route.params.access_token);
    }
  }, [route.params]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!accessToken) {
      Alert.alert('Error', 'Invalid or missing reset token.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Your password has been reset successfully.');
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Your Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter new password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: colors.background,
    },
    title: {
        ...(typography.h2 as any),
        textAlign: 'center',
        marginBottom: 20,
        color: colors.text.primary,
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.buttonPrimary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        ...(typography.button as any),
        color: colors.white,
    },
});

export default ResetPasswordScreen; 