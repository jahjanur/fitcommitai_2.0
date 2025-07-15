import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';

type PlaceholderScreenProps = {
  title: string;
};

const PlaceholderScreen = ({ title }: PlaceholderScreenProps) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>
      <View style={styles.content}>
        <Text style={styles.message}>Coming Soon</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    ...typography.h1,
    color: colors.white,
    textAlign: 'center',
  } as TextStyle,
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    ...typography.h2,
    color: colors.text.secondary,
  } as TextStyle,
});

export default PlaceholderScreen; 