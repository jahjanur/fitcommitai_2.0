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

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
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
        <Ionicons name="log-out-outline" size={24} color={colors.error} />
        <Text style={[styles.actionButtonText, { color: colors.error }]}>Logout</Text>
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
      {/* Removed Sound Effects and Vacation Mode */}
    </View>
  );

  const renderLegalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Legal & Info</Text>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Ionicons name="document-text-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Terms & Conditions</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Ionicons name="shield-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Privacy Policy</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Ionicons name="heart-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Mental Health Disclaimer</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderAboutHelp = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About & Help</Text>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Ionicons name="star-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Rate on App Store</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Ionicons name="share-social-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Share with Friends</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Ionicons name="mail-outline" size={24} color={colors.buttonPrimary} />
        <Text style={styles.actionButtonText}>Contact Support</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
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
      {renderSettings()}
      {renderLegalInfo()}
      {renderAboutHelp()}
      <Text style={styles.versionText}>FitCommit™ v1.0 – Designed by MobileFitCommit</Text>
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
});

export default ProfileScreen; 