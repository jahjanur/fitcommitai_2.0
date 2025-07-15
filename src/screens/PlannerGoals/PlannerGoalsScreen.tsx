import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';

const PlannerGoalsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Planner / Goals Screen</Text>
      <Text style={styles.subtitle}>Track your habits and set goals here.</Text>
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

export default PlannerGoalsScreen; 