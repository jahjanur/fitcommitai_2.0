import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';

const ScansHistoryScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scans / History Screen</Text>
      <Text style={styles.subtitle}>View your previous body scans and predictions here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 10,
  } as TextStyle,
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  } as TextStyle,
});

export default ScansHistoryScreen; 