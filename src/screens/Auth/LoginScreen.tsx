import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const LoginScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login Screen (Coming Soon)</Text>
    </View>
  );8
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 