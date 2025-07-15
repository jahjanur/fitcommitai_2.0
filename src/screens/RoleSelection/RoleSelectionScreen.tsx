import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, Pressable, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const fitCommitLogo = require('../../../assets/logo.png');
const dotsBackground = require('../../../assets/Dots.png');

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;

const RoleSelectionScreen = () => {
  const navigation = useNavigation<RoleSelectionScreenNavigationProp>();
  const [selectedRole, setSelectedRole] = useState<'Client' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const clientScale = useRef(new Animated.Value(1)).current;
  const trainerScale = useRef(new Animated.Value(1)).current;

  const handleClientPress = () => {
    setSelectedRole('Client');
    Animated.spring(clientScale, {
      toValue: 1.04,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(clientScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleTrainerPress = () => {
    setModalVisible(true);
    Animated.spring(trainerScale, {
      toValue: 1.04,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(trainerScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleContinue = () => {
    if (selectedRole === 'Client') {
      navigation.navigate('Onboarding');
    }
  };

  return (
    <LinearGradient
      colors={[colors.darkBlue, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradientBackground}
    >
      <Image source={dotsBackground} style={[styles.dot, styles.dot1]} />
      <Image source={dotsBackground} style={[styles.dot, styles.dot2]} />
      <Image source={dotsBackground} style={[styles.dot, styles.dot3]} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image source={fitCommitLogo} style={styles.logo} />
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>Select how you want to use FitCommit</Text>
          <View style={styles.roleContainer}>
            <Animated.View style={{ transform: [{ scale: clientScale }] }}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  styles.activeCard,
                  selectedRole === 'Client' && styles.selectedCard,
                ]}
                onPress={handleClientPress}
                activeOpacity={0.9}
              >
                <Text style={[styles.roleTitle, selectedRole === 'Client' && styles.clientRoleTitleSelected]}>Client</Text>
                <Text style={[styles.roleDescription, selectedRole === 'Client' && styles.clientRoleDescriptionSelected]}>
                  Track your fitness journey and get personalized recommendations
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: trainerScale }] }}>
              <TouchableOpacity
                style={[styles.roleCard, styles.disabledCard]}
                onPress={handleTrainerPress}
                activeOpacity={0.8}
              >
                <View style={styles.lockRow}>
                  <Text style={styles.roleTitle}>Trainer</Text>
                  <Feather name="lock" size={18} color="#aaa" style={{ marginLeft: 6 }} />
                </View>
                <Text style={styles.roleDescription}>
                  Manage clients and create personalized plans
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
          <TouchableOpacity
            style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!selectedRole}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Feather name="lock" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.modalTitle}>Trainer features are on the way</Text>
              <Text style={styles.modalText}>
                We're working hard to bring you powerful tools for trainers. Stay tuned!
              </Text>
              <Pressable style={styles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200, 
    height: 100, 
    resizeMode: 'contain',
    marginBottom: 40, 
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#fff', 
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#eee', 
  },
  roleContainer: {
    gap: 20,
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
  },
  roleCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 0,
    position: 'relative',
  },
  activeCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 115, 255, 0.1)',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    elevation: 8,
  },
  disabledCard: {
    opacity: 0.7,
    backgroundColor: colors.surface,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  clientRoleTitleSelected: {
    color: colors.white,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  clientRoleDescriptionSelected: {
    color: colors.white,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 32,
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#fff',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    width: 60,
    height: 60,
    resizeMode: 'contain',
    opacity: 0.3,
  },
  dot1: {
    top: '10%',
    left: '5%',
  },
  dot2: {
    top: '40%',
    right: '10%',
  },
  dot3: {
    bottom: '15%',
    left: '20%',
  },
});

export default RoleSelectionScreen; 