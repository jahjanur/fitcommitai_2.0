import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Alert,
  Switch,
  Linking,
  Share,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { BlurView } from 'expo-blur';
import { getBottomSpace } from 'react-native-iphone-x-helper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChangePassword from './ChangePassword';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [methodologyModalVisible, setMethodologyModalVisible] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLevel, setActivityLevel] = useState('sedentary');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, activity_level')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        
        // Set activity level from profile data
        if (data.activity_level) {
          setActivityLevel(data.activity_level);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. You will be redirected to our account deletion form.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('https://docs.google.com/forms/d/152NxJJvQLiXLxwQDXEy9RzXN7QhLlz20hk8r9Vzvmkw/viewform?edit_requested=true');
          },
        },
      ]
    );
  };

  const updateActivityLevel = async (newActivityLevel: string) => {
    try {
      if (!profile?.id) {
        console.error('No profile ID available');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ activity_level: newActivityLevel })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating activity level:', error);
        Alert.alert('Error', 'Failed to update activity level. Please try again.');
        return;
      }

      // Update local profile state
      setProfile((prev: any) => prev ? { ...prev, activity_level: newActivityLevel } : prev);
      setActivityLevel(newActivityLevel);
      
      // Save to AsyncStorage for Dashboard sync (same as Diet Plan)
      await AsyncStorage.setItem('dietPlan_activityLevel', newActivityLevel);
      console.log('Saved activity level to AsyncStorage:', newActivityLevel);
      
      console.log('Activity level updated successfully:', newActivityLevel);
      Alert.alert('Success', 'Activity level updated successfully!');
    } catch (error) {
      console.error('Error updating activity level:', error);
      Alert.alert('Error', 'Failed to update activity level. Please try again.');
    }
  };

  const renderTopSection = () => (
    <LinearGradient
      colors={[colors.darkBlue, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.topSection}
    >
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={[colors.buttonPrimary, colors.primary]}
          style={styles.avatarGradient}
        >
          <Ionicons name="person" size={40} color={colors.white} />
        </LinearGradient>
      </View>
      <Text style={styles.username}>{profile?.name || 'User'}</Text>
      <Text style={styles.email}>{profile?.email || 'user@example.com'}</Text>
    </LinearGradient>
  );

  const renderAccountActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Actions</Text>
      <TouchableOpacity style={styles.actionButton} onPress={() => setShowChangePasswordForm(true)}>
        <Ionicons name="key-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Change Password</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={colors.buttonPrimary} />
        <Text style={[styles.actionButtonText]}>Logout</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAccount}>
        <Ionicons name="trash-outline" size={24} color={colors.error} />
        <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete Account</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      {showChangePasswordForm && (
        <View style={{
          marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.buttonPrimary,
          padding: 18,
          shadowColor: colors.buttonPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <ChangePassword userEmail={profile?.email || ''} />
          <TouchableOpacity onPress={() => setShowChangePasswordForm(false)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: colors.buttonPrimary, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderActivityLevel = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Fitness Profile</Text>
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => setShowActivityModal(true)}
      >
        <Ionicons name="fitness-outline" size={24} color={colors.buttonPrimary} />
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.actionButtonText}>Activity Level</Text>
          <Text style={{ color: colors.text.secondary, fontSize: 14, marginTop: 2 }}>
            {activityLevel === 'bmr' ? 'BMR Only' :
             activityLevel === 'sedentary' ? 'Sedentary (office job)' :
             activityLevel === 'lightly active' ? 'Light Exercise (1-2 days/week)' :
             activityLevel === 'moderately active' ? 'Moderate Exercise (3-5 days/week)' :
             activityLevel === 'very active' ? 'Heavy Exercise (6-7 days/week)' :
             activityLevel === 'extra active' ? 'Athlete (2x per day)' :
             activityLevel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Ionicons name="notifications-outline" size={24} color={colors.buttonPrimary} />
          <Text style={styles.settingText}>Notifications</Text>
        </View>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: colors.border, true: colors.buttonPrimary }}
          thumbColor={colors.white}
        />
      </View>
      <Text style={{ color: colors.text.secondary, fontSize: 13, marginTop: 6 }}>Turn app updates and reminders on or off.</Text>
      {/* Removed Sound Effects and Vacation Mode */}
    </View>
  );

  const renderLegalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Help & Legal</Text>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('https://www.fitcommit.ai/terms')}
      >
        <Ionicons name="document-text-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Terms and Conditions</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('https://www.fitcommit.ai/privacy')}
      >
        <Ionicons name="shield-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Privacy Policy</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('https://www.fitcommit.ai/mental-health')}
      >
        <Ionicons name="heart-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Mental Health Disclaimer</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => setMethodologyModalVisible(true)}
      >
        <Ionicons name="analytics-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>How FitCommit Works</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('https://www.fitcommit.ai/')}
      >
        <Ionicons name="help-circle-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Help Center</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('https://www.fitcommit.ai/')}
      >
        <Ionicons name="mail-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Contact Support</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={async () => {
          try {
            await Share.share({
              message: 'Check out AI Body Fat % by FitCommit on the App Store:\nhttps://apps.apple.com/ca/app/ai-body-fat-by-fitcommit/id6748652177',
              url: 'https://apps.apple.com/ca/app/ai-body-fat-by-fitcommit/id6748652177',
              title: 'AI Body Fat % by FitCommit',
            });
          } catch (e) {}
        }}
      >
        <Ionicons name="share-social-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Share with Friends</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('itms-apps://itunes.apple.com/app/id6748652177?action=write-review')}
      >
        <Ionicons name="star-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Rate FitCommit</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('mailto:contact@fitcommit.ai')}
      >
        <Ionicons name="chatbubbles-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Support & Feedback</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderAboutHelp = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About & Help</Text>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('itms-apps://itunes.apple.com/app/id6748652177?action=write-review')}
      >
        <Ionicons name="star-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Rate on App Store</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={async () => {
          try {
            await Share.share({
              message: 'Check out AI Body Fat % by FitCommit on the App Store:\nhttps://apps.apple.com/ca/app/ai-body-fat-by-fitcommit/id6748652177',
              url: 'https://apps.apple.com/ca/app/ai-body-fat-by-fitcommit/id6748652177',
              title: 'AI Body Fat % by FitCommit',
            });
          } catch (e) {}
        }}
      >
        <Ionicons name="share-social-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Share with Friends</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('mailto:contact@fitcommit.ai')}
      >
        <Ionicons name="mail-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Contact Support</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => Linking.openURL('https://www.fitcommit.ai/#faq')}
      >
        <Ionicons name="help-circle-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>FAQ / Help Center</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: getBottomSpace() + 80 }}>
      {renderTopSection()}
      {renderAccountActions()}
      {renderActivityLevel()}
      {renderSettings()}
      {renderLegalInfo()}
      <Text style={styles.versionText}>FitCommit™ v1.0 </Text>
      
      {/* Methodology Modal */}
      <Modal visible={methodologyModalVisible} transparent animationType="fade" onRequestClose={() => setMethodologyModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 0, width: '90%', maxHeight: '85%', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 }}>
            {/* Exit Icon Top Right */}
            <TouchableOpacity onPress={() => setMethodologyModalVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
            </TouchableOpacity>
            
            <ScrollView style={{ width: '100%', padding: 26 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8, textAlign: 'center' }}>
                App Store Compliance Update: Health Measurement Disclaimer & Methodology
              </Text>
              <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 24, opacity: 0.18, alignSelf: 'center' }} />
              
              {/* Section A: Summary */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '600', marginBottom: 12 }}>
                  A) Summary
                </Text>
                <Text style={{ fontSize: 15, color: colors.text.primary, lineHeight: 22 }}>
                  Body fat % is an estimate of the proportion of fat mass to total body mass. FitCommit AI uses photos to estimate this value using AI image analysis, which can vary based on image quality, clothing, and posture. This is for educational purposes only and not a medical diagnosis.
                </Text>
              </View>
              
              {/* Section B: Body Fat Categories */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '600', marginBottom: 12 }}>
                  B) Common adult body fat categories (ACE)
                </Text>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, color: colors.text.primary, fontWeight: '600', marginBottom: 8 }}>
                    Men:
                  </Text>
                  <Text style={{ fontSize: 15, color: colors.text.secondary, lineHeight: 20 }}>
                    Essential 2–5%, Athletes 6–13%, Fitness 14–17%, Average 18–24%, Obesity 25%+
                  </Text>
                </View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, color: colors.text.primary, fontWeight: '600', marginBottom: 8 }}>
                    Women:
                  </Text>
                  <Text style={{ fontSize: 15, color: colors.text.secondary, lineHeight: 20 }}>
                    Essential 10–13%, Athletes 14–20%, Fitness 21–24%, Average 25–31%, Obesity 32%+
                  </Text>
                </View>
              </View>
              
              {/* Section C: Methodology & Research Basis */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '600', marginBottom: 12 }}>
                  C) Methodology & Research Basis
                </Text>
                <Text style={{ fontSize: 15, color: colors.text.primary, lineHeight: 22, marginBottom: 16 }}>
                  FitCommit AI estimates body fat percentage using computer vision models trained on publicly available research datasets where body composition was measured with reference-standard methods such as Dual-Energy X-ray Absorptiometry (DEXA). These datasets include photographic or anthropometric data linked to validated measurements, allowing the AI to learn correlations between visible physical characteristics and actual body fat percentage.
                </Text>
                <Text style={{ fontSize: 15, color: colors.text.primary, lineHeight: 22, marginBottom: 12 }}>
                  The algorithm's approach is consistent with methods described in peer-reviewed studies on visual anthropometry and AI-based body composition estimation, including:
                </Text>
                <View style={{ marginLeft: 16 }}>
                  <TouchableOpacity 
                    style={{ marginBottom: 8 }}
                    onPress={() => Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/17546605/')}
                  >
                    <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                      • Shape analysis and anthropometry for body composition estimation – Wells, J.C.K. et al., American Journal of Human Biology, 2007.
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ marginBottom: 8 }}
                    onPress={() => Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/27804264/')}
                  >
                    <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                      • Predicting body composition from 2D images using machine learning – Ng, B.K. et al., Obesity, 2016.
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ marginBottom: 8 }}
                    onPress={() => Linking.openURL('https://www.nature.com/articles/s41598-021-87230-7')}
                  >
                    <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                      • Body fat percentage estimation from photographs using deep learning – Dinsdale, E. et al., Scientific Reports, 2021.
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ marginBottom: 8 }}
                    onPress={() => Linking.openURL('https://pubmed.ncbi.nlm.nih.gov/28478773/')}
                  >
                    <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                      • Accuracy of visual body composition assessments compared to DEXA – Luke, A. et al., British Journal of Nutrition, 2017.
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Section D: Sources */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, color: colors.primary, fontWeight: '600', marginBottom: 12 }}>
                  D) Sources for Body Fat % Ranges
                </Text>
                <TouchableOpacity 
                  style={{ marginBottom: 8 }}
                  onPress={() => Linking.openURL('https://www.acefitness.org/education-and-resources/lifestyle/tools-calculators/percent-body-fat-calculator/')}
                >
                  <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                    • American Council on Exercise – Percent Body Fat Norms
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ marginBottom: 8 }}
                  onPress={() => Linking.openURL('https://www.cdc.gov/healthyweight/assessing/body_composition/index.html')}
                >
                  <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                    • CDC – Body Composition Basics
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => Linking.openURL('https://pmc.ncbi.nlm.nih.gov/articles/PMC5384668/')}
                >
                  <Text style={{ fontSize: 14, color: colors.buttonPrimary, lineHeight: 20, textDecorationLine: 'underline' }}>
                    • National Library of Medicine – Body Composition Measurement Techniques
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Activity Level Modal */}
      <Modal visible={showActivityModal} transparent animationType="fade" onRequestClose={() => setShowActivityModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 0, width: '90%', maxHeight: '70%', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 }}>
            {/* Exit Icon Top Right */}
            <TouchableOpacity onPress={() => setShowActivityModal(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
            </TouchableOpacity>
            
            <View style={{ width: '100%', padding: 26, paddingTop: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, textAlign: 'center' }}>
                Select Activity Level
              </Text>
              <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 24, opacity: 0.18, alignSelf: 'center' }} />
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { value: 'bmr', label: 'BMR Only', description: 'No exercise, bed rest' },
                  { value: 'sedentary', label: 'Sedentary', description: 'Office job, no exercise' },
                  { value: 'lightly active', label: 'Light Exercise', description: '1-2 days per week' },
                  { value: 'moderately active', label: 'Moderate Exercise', description: '3-5 days per week' },
                  { value: 'very active', label: 'Heavy Exercise', description: '6-7 days per week' },
                  { value: 'extra active', label: 'Athlete', description: '2x per day, very active' }
                ].map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.activityOption,
                      activityLevel === level.value && styles.selectedActivityOption
                    ]}
                    onPress={() => {
                      setActivityLevel(level.value);
                      updateActivityLevel(level.value);
                      setShowActivityModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.activityOptionLabel,
                        activityLevel === level.value && styles.selectedActivityOptionLabel
                      ]}>
                        {level.label}
                      </Text>
                      <Text style={[
                        styles.activityOptionDescription,
                        activityLevel === level.value && styles.selectedActivityOptionDescription
                      ]}>
                        {level.description}
                      </Text>
                    </View>
                    {activityLevel === level.value && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.buttonPrimary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: getBottomSpace() + 20,
  },
  topSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.8,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 15,
  },
  versionText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 20,
    marginBottom: getBottomSpace() + 20,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  selectedActivityOption: {
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.buttonPrimary + '10',
  },
  activityOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  selectedActivityOptionLabel: {
    color: colors.buttonPrimary,
  },
  activityOptionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  selectedActivityOptionDescription: {
    color: colors.buttonPrimary + 'CC',
  },
});

export default ProfileScreen; 