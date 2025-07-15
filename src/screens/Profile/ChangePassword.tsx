import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

type ChangePasswordProps = { userEmail: string; onlyForgotPassword?: boolean };
const ChangePassword = ({ userEmail, onlyForgotPassword = false }: ChangePasswordProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper: Validate password strength (customize as needed)
  const isStrongPassword = (pw: string) =>
    pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);

  // Change password handler
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      Alert.alert('Error', 'Password must be at least 8 characters, include upper/lowercase and a number.');
      return;
    }
    setLoading(true);
    try {
      // 1. Re-authenticate
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) {
        Alert.alert('Authentication Failed', 'Current password is incorrect.');
        setLoading(false);
        return;
      }
      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        Alert.alert('Error', updateError.message);
      } else {
        Alert.alert('Success', 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'fitcommit://reset-password',
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Check your email', 'A password reset link has been sent.');
        setResetEmail('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (onlyForgotPassword) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Forgot Password?</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={resetEmail}
          onChangeText={setResetEmail}
        />
        <TouchableOpacity style={styles.buttonSecondary} onPress={handleForgotPassword} disabled={loading}>
          <Text style={styles.buttonTextSecondary}>{loading ? 'Sending...' : 'Send Reset Email'}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Change Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Current Password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Change Password'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Forgot Password?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={resetEmail}
        onChangeText={setResetEmail}
      />
      <TouchableOpacity style={styles.buttonSecondary} onPress={handleForgotPassword} disabled={loading}>
        <Text style={styles.buttonTextSecondary}>{loading ? 'Sending...' : 'Send Reset Email'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text.primary },
  input: {
    backgroundColor: '#f5f6fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonTextSecondary: { color: colors.buttonPrimary, fontWeight: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 20 },
});

export default ChangePassword; 