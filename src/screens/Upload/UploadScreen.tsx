import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { getBottomSpace } from 'react-native-iphone-x-helper';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateTDEEWithDefaults } from '../../utils/tdeeCalculator';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../types/navigation';

const Logo = require('../../../assets/logo.png');
const MaleDefaultImage = require('../../../assets/MaleDefaultImage.png');
const FemaleDefaultProfilePic = require('../../../assets/femaleDefaultProfgile pic.png');

type ScanStep = 'front' | 'side' | 'back' | 'analyzing' | 'results';
type UploadMode = 'analyze' | 'after_photo';

interface AnalysisResponse {
  bodyFat: string;
  rationale: string;
}

interface AfterPhotoResponse {
  after_photo_url: string;
  transformation_prompt: string;
  success: boolean;
  message: string;
}
interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: string;
  height_cm: number;
  weight_kg: number;
  activity_level?: string; // Added for TDEE calculation
}

const analysisTips = [
  'Losing fat improves brain function. Sharper thinking, better focus, clearer mind.',
  'Body fat affects confidence. Reducing it safely can boost mood and self-esteem.',
  'Fat is your body\'s fuel reserve. It protects organs and regulates temperature.',
  'Sleep affects fat storage. Poor sleep increases cortisol, which encourages fat gain.',
  'Measuring body fat is more accurate than weight alone. Focus on composition, not the scale.',
  'Strength training helps reduce fat — even after your workout is done!',
  'High body fat can impact sleep. Fatigue and sleep apnea often go hand in hand.',
  'Too little fat is dangerous. It affects hormones, mood, and fertility.',
  'Body fat is essential. Men need at least 3–5%, women 10–13% for basic functions.',
  'Did you know? Visceral fat (around your organs) is more harmful than subcutaneous fat.',
  'Even thin people can have high body fat. It\'s called TOFI — "Thin Outside, Fat Inside."',
  'Muscle burns more calories than fat. The more muscle you have, the easier fat loss becomes.',
  'You can\'t spot-reduce fat. Abs are made in the kitchen, not just in the gym.',
  'Hydration affects fat metabolism. Drink water to help your body burn fat efficiently.',
  'Brown fat burns energy. Unlike white fat, it helps regulate body temperature.',
  'High body fat increases inflammation. This can lead to joint pain and chronic disease.',
  'Sleep and fat are linked. Deep sleep supports hormone balance and fat regulation.',
  'Eating healthy fats helps burn fat. Think avocados, nuts, olive oil — not low-fat myths.',
  'Hormones like insulin and cortisol influence fat gain. It\'s not just about calories.',
  'Ab exercises won\'t reduce belly fat. Cardio, diet, and strength training work together.',
];

const screenWidth = Dimensions.get('window').width;

// Utility functions for BMR/TDEE
function calculateLBM(weightKg: number, bodyFatPercent: number) {
  return weightKg * (1 - bodyFatPercent);
}
function calculateBMR_KatchMcArdle(weightKg: number, bodyFatPercent: number) {
  const lbm = calculateLBM(weightKg, bodyFatPercent);
  return 370 + (21.6 * lbm);
}
// TDEE calculation now uses unified calculator from utils/tdeeCalculator.ts

const SmartAnalysisScreen = () => {
  // Upload flow state
  const [currentStep, setCurrentStep] = useState<ScanStep>('front');
  const [uploadMode, setUploadMode] = useState<UploadMode>('analyze');
  const [images, setImages] = useState<{ front?: string; side?: string; back?: string }>({});
  const [afterPhotoImage, setAfterPhotoImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAfterPhoto, setIsGeneratingAfterPhoto] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [afterPhotoResult, setAfterPhotoResult] = useState<AfterPhotoResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const tipFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [uploadStep, setUploadStep] = useState<'front' | 'side' | 'back'>('front');
  const [uploadThumbnails, setUploadThumbnails] = useState<{ front?: string; side?: string; back?: string }>({});
  const progressAnim = useRef(new Animated.Value(0.33)).current;
  const [scanCooldown, setScanCooldown] = useState<number>(0);
  const [cooldownInterval, setCooldownInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [overrideScanLock, setOverrideScanLock] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  
  // After photo form state - only duration is manual, rest auto-populated
  const [durationWeeks, setDurationWeeks] = useState<string>('8');
  const [latestBodyFat, setLatestBodyFat] = useState<number | null>(null);
  
  // Image modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const navigation = useNavigation<RootStackNavigationProp>();

  // Handle image click
  const handleImagePress = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  // Fetch user profile (copy logic as needed)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (user) {
          const { data, error, status } = await supabase
            .from('profiles')
            .select('id, email, name, age, gender, height_cm, weight_kg, activity_level')
            .eq('id', user.id)
            .single();
          if (error && status !== 406) throw error;
          if (data) {
            setProfile(data as UserProfile);
          }
          
          // Fetch the last scan time and body fat for cooldown and auto-population
          const { data: lastScanData, error: lastScanError } = await supabase
            .from('body_scans')
            .select('scanned_at, analysis_body_fat')
            .eq('user_id', user.id)
            .order('scanned_at', { ascending: false })
            .limit(1)
            .single();
          
          if (!lastScanError && lastScanData?.scanned_at) {
            setLastScanTime(lastScanData.scanned_at);
            if (lastScanData.analysis_body_fat) {
              setLatestBodyFat(lastScanData.analysis_body_fat);
            }
            console.log('Last scan time loaded:', lastScanData.scanned_at);
          } else {
            console.log('No previous scans found or error:', lastScanError);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        setProfile(null);
      }
    };
    fetchProfile();
  }, []);

  // Cooldown logic
  useEffect(() => {
    if (currentStep === 'front' || currentStep === 'side' || currentStep === 'back') {
      if (!lastScanTime) {
        // No previous scans: allow immediate upload, no cooldown
        setScanCooldown(0);
        if (cooldownInterval) clearInterval(cooldownInterval);
      } else {
        // There is a previous scan: apply cooldown logic
        const lastScanDate = new Date(lastScanTime);
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastScanDate.getTime()) / 1000); // seconds
        const cooldown = Math.max(0, 7 * 24 * 60 * 60 - diff); // 7 days in seconds
        setScanCooldown(cooldown);
        if (cooldownInterval) clearInterval(cooldownInterval);
        if (cooldown > 0) {
          const interval: ReturnType<typeof setInterval> = setInterval(() => {
            setScanCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          setCooldownInterval(interval);
        }
      }
    } else {
      if (cooldownInterval) clearInterval(cooldownInterval);
    }
    return () => { if (cooldownInterval) clearInterval(cooldownInterval); };
  }, [currentStep, lastScanTime]);

  // Helper to format cooldown
  const formatCooldown = (seconds: number) => {
    const d = Math.floor(seconds / (24 * 60 * 60));
    const h = Math.floor((seconds % (24 * 60 * 60)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Upload helper functions
  const getBase64WithMime = async (uri: string): Promise<string> => {
    // Guess MIME type from file extension
    let mime = 'image/jpeg';
    if (uri.endsWith('.png')) mime = 'image/png';
    else if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) mime = 'image/jpeg';
    // Read as base64
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    return `data:${mime};base64,${base64}`;
  };

  // Helper to convert Blob to ArrayBuffer using FileReader (for React Native/Expo)
  const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) resolve(reader.result as ArrayBuffer);
        else reject(new Error('Failed to convert blob to arrayBuffer'));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  };

  const uploadImageToSupabase = async (uri: string, pathInBucket: string) => {
    // Add a unique suffix to avoid overwriting
    const timestamp = Date.now();
    const uniquePath = pathInBucket.replace(/(\.\w+)$/, `_${timestamp}$1`);
    // Fetch the file as a blob
    const response = await fetch(uri);
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Failed to read image data. The file may be inaccessible or empty.');
    }
    // Convert blob to arrayBuffer using FileReader
    const arrayBuffer = await blobToArrayBuffer(blob);
    // Guess content type
    let contentType = 'image/jpeg';
    if (uri.endsWith('.png')) contentType = 'image/png';
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('body-scan-images')
      .upload(uniquePath, arrayBuffer, { contentType });
    if (error) throw error;
    // Get the public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('body-scan-images')
      .getPublicUrl(uniquePath);
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image.');
    }
    return publicUrlData.publicUrl;
  };

  const processAndUploadImages = async (imageUris: string[]) => {
    setIsUploading(true);
    try {
      if (!profile?.id) throw new Error('User profile not loaded');
      // Upload each image and get public URLs
      const [frontUri, sideUri, backUri] = imageUris;
      const userId = profile.id;
      const frontUrl = await uploadImageToSupabase(frontUri, `${userId}/front.jpg`);
      const sideUrl = await uploadImageToSupabase(sideUri, `${userId}/side.jpg`);
      const backUrl = await uploadImageToSupabase(backUri, `${userId}/back.jpg`);
      const imageUrls = [frontUrl, sideUrl, backUrl];
      // Prepare the payload
      const payload = {
        images: imageUrls,
        age: profile.age,
        heightCms: profile.height_cm,
        weightKgs: profile.weight_kg,
      };
      // Send as JSON
      const uploadResponse = await fetch('https://ml.fitcommit.ai/analyze_img_urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.text();
        setIsAnalyzing(false);
        setIsUploading(false);
        throw new Error(`Upload failed with status: ${uploadResponse.status} Body: ${errorBody}`);
      }
      // Log the raw response text before parsing
      const rawText = await uploadResponse.text();
      let result;
      try {
        if (!rawText || rawText.trim() === '') {
          setIsAnalyzing(false);
          setIsUploading(false);
          throw new Error('Server returned an empty response.');
        }
        result = JSON.parse(rawText);
      } catch (parseError) {
        setIsAnalyzing(false);
        setIsUploading(false);
        Alert.alert('Analysis Failed', 'The server returned an invalid or empty response. Please try again later.');
        return false;
      }
      setAnalysisResult(result);
      
      // Extract body fat percentage from the response
      const bodyFatText = result.bodyFat;
      console.log('Raw body fat response:', bodyFatText);
      
      // Try different patterns to extract body fat from full sentences
      let bodyFatNum = null;
      
      // Pattern 1: "around 18.5%" -> 18.5
      const percentMatch = bodyFatText.match(/(\d+(?:\.\d+)?)%/);
      if (percentMatch) {
        bodyFatNum = parseFloat(percentMatch[1]);
        console.log('Extracted from percentage format:', bodyFatNum);
      } else {
        // Pattern 2: "18.5" or "18" -> 18.5 or 18
        const numberMatch = bodyFatText.match(/(\d+(?:\.\d+)?)/);
        if (numberMatch) {
          bodyFatNum = parseFloat(numberMatch[1]);
          console.log('Extracted from number format:', bodyFatNum);
        }
      }
      
      // Additional pattern for sentences like "around 18.5%" or "approximately 18.5%"
      if (!bodyFatNum) {
        const sentenceMatch = bodyFatText.match(/(?:around|approximately|about|roughly|close to)\s*(\d+(?:\.\d+)?)/i);
        if (sentenceMatch) {
          bodyFatNum = parseFloat(sentenceMatch[1]);
          console.log('Extracted from sentence format:', bodyFatNum);
        }
      }
      
      console.log('Final extracted body fat number:', bodyFatNum);
      console.log('Profile ID:', profile?.id);
      
      if (bodyFatNum && profile?.id) {
        console.log('Attempting to save to database...');
        try {
          // Save to progress_history
          const progressDataToInsert = { 
            user_id: profile.id, 
            body_fat: bodyFatNum,
            timestamp: new Date().toISOString(),
            analysis: result.rationale // Save AI rationale to progress_history
          };
          console.log('Inserting into progress_history:', progressDataToInsert);
          const { data: progressData, error: progressError } = await supabase
            .from('progress_history')
            .insert([progressDataToInsert]);
          console.log('Progress history save result:', { data: progressData, error: progressError });
          if (progressError) {
            console.error('Error saving to progress_history:', progressError);
          }

          // Calculate BMI (for completeness)
          const bmi = profile.weight_kg && profile.height_cm ? (profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(2) : null;
          // Calculate BMR and TDEE if body fat is available
          let bmr = null;
          let tdee = null;
          if (profile.weight_kg && bodyFatNum && profile.activity_level) {
            const bodyFatPercent = bodyFatNum / 100;
            bmr = calculateBMR_KatchMcArdle(profile.weight_kg, bodyFatPercent);
            tdee = calculateTDEEWithDefaults(profile.weight_kg, profile.activity_level, 'none', bodyFatPercent * 100);
          }

          // Save to body_scans
          const scanDataToInsert = {
            user_id: profile.id,
            front_image_url: imageUrls[0],
            side_image_url: imageUrls[1], 
            back_image_url: imageUrls[2],
            analysis_rationale: result.rationale,
            analysis_body_fat: bodyFatNum,
            scanned_at: new Date().toISOString(),
            bmi: bmi,
            tdee: tdee ? tdee.toFixed(1) : null,
          };
          console.log('Inserting into body_scans:', scanDataToInsert);
          const { data: scanData, error: scanError } = await supabase
            .from('body_scans')
            .insert([scanDataToInsert]);
          console.log('Body scans save result:', { data: scanData, error: scanError });
          if (scanError) {
            console.error('Error saving to body_scans:', scanError);
          }

          // Update profile with latest BMI and TDEE
          if (bmi && tdee) {
            await supabase
              .from('profiles')
              .update({ bmi_bmi: bmi, tdee_tdee: tdee.toFixed(1) })
              .eq('id', profile.id);
          }

          // Set last scan time for cooldown
          setLastScanTime(new Date().toISOString());
        } catch (error) {
          console.error('Database save error:', error);
        }
      } else {
        setIsAnalyzing(false);
        setIsUploading(false);
        console.log('Failed to extract body fat or missing profile ID');
        console.log('Body fat num:', bodyFatNum);
        console.log('Profile ID:', profile?.id);
        return false;
      }
      setIsUploading(false);
      setIsAnalyzing(false);
      // Reset upload state before navigating away
      setCurrentStep('front');
      setImages({});
      setUploadThumbnails({});
      setUploadStep('front');
      setOverrideScanLock(false);
      // After upload, lastScanTime is updated, which will trigger the cooldown modal if scanCooldown > 0
      // Wait a tick to ensure state updates before navigating
      setTimeout(() => {
        setScanCooldown(0); // Reset cooldown when navigating away
        setOverrideScanLock(false);
        navigation.navigate('Dashboard', { screen: 'Dashboard' });
      }, 0);
      return true;
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || JSON.stringify(error));
      setIsAnalyzing(false);
      setIsUploading(false);
      return false;
    }
  };

  const generateAfterPhoto = async (imageUri: string) => {
    setIsGeneratingAfterPhoto(true);
    try {
      if (!profile?.id) throw new Error('User profile not loaded');
      
      // Upload the single image
      const userId = profile.id;
      const imageUrl = await uploadImageToSupabase(imageUri, `${userId}/after_photo_base.jpg`);
      
      // Prepare the payload for after photo generation using auto-populated data
      const payload = {
        image_url: imageUrl,
        body_fat_percent: latestBodyFat || 15, // Use latest body fat or default to 15%
        weight: profile.weight_kg,
        gender: profile.gender,
        duration_weeks: parseInt(durationWeeks),
        correlation_id: `session_${Date.now()}`
      };
      
      // Send request to after photo generation endpoint
      const response = await fetch('https://ml.fitcommit.ai/generate_after_photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`After photo generation failed with status: ${response.status} Body: ${errorBody}`);
      }
      
      const result = await response.json();
      setAfterPhotoResult(result);
      
      setIsGeneratingAfterPhoto(false);
      return true;
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || JSON.stringify(error));
      setIsGeneratingAfterPhoto(false);
      return false;
    }
  };

  const fetchProgressHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('progress_history')
        .select('body_fat, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error fetching progress history:', error);
        return;
      }
      
      if (data) {
        const formattedData = data.map(item => ({
          body_fat: item.body_fat,
          timestamp: item.timestamp
        }));
        // This would be used if you want to show progress history in the upload screen
        console.log('Progress history loaded:', formattedData);
      }
    } catch (error) {
      console.error('Error in fetchProgressHistory:', error);
    }
  };

  // Progress bar animation
  useEffect(() => {
    let toValue = 0.33;
    if (uploadStep === 'side') toValue = 0.66;
    else if (uploadStep === 'back') toValue = 1;
    Animated.timing(progressAnim, {
      toValue,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [uploadStep]);

  // Tip animation for analyzing
  useEffect(() => {
    let tipInterval: ReturnType<typeof setInterval>;
    if (currentStep === 'analyzing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      tipFadeAnim.setValue(0);
      Animated.timing(tipFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      tipInterval = setInterval(() => {
        Animated.sequence([
          Animated.timing(tipFadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(tipFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start(() => {
          setCurrentTipIndex((prevIndex) => (prevIndex + 1) % analysisTips.length);
        });
      }, 5000);
      return () => {
        if (tipInterval) clearInterval(tipInterval);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        tipFadeAnim.setValue(0);
      };
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      tipFadeAnim.setValue(0);
    }
  }, [currentStep, pulseAnim, tipFadeAnim]);

  // Animation for AI Vision results
  useEffect(() => {
    if (afterPhotoResult) {
      // Reset animations
      tipFadeAnim.setValue(0);
      pulseAnim.setValue(0.8);
      
      // Start entrance animations
      Animated.sequence([
        Animated.timing(tipFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
      
      // Continuous subtle pulse for the transformation container
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [afterPhotoResult, tipFadeAnim, pulseAnim]);

  // Reset upload screen after scan
  useEffect(() => {
    if (currentStep === 'results') {
      setImages({});
      setUploadThumbnails({});
      setUploadStep('front');
      setOverrideScanLock(false);
    }
  }, [currentStep]);

  // Image upload handlers
  const handleImageUpload = async (type: 'front' | 'side' | 'back' | 'after_photo') => {
    try {
      setLoadingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to upload images.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        setLoadingImage(false);
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (pickerResult.canceled) {
        setLoadingImage(false);
        return;
      }
      const uri = pickerResult.assets[0].uri;
      
      if (type === 'after_photo') {
        setAfterPhotoImage(uri);
      } else {
        setImages((prev) => ({ ...prev, [type]: uri }));
      }
      
      setLoadingImage(false);
    } catch (error: any) {
      Alert.alert('Image Picker Error', error.message || JSON.stringify(error));
      setLoadingImage(false);
    }
  };

  const getProgress = () => {
    const count = (['front', 'side', 'back'] as const).filter((type) => images[type as keyof typeof images]).length;
    if (count === 0) return 0;
    if (count === 1) return 1 / 3;
    if (count === 2) return 2 / 3;
    if (count === 3) return 1;
    return 0;
  };

  // Main upload UI
  const renderUploadStep = () => {
    const isLocked = scanCooldown > 0 && !overrideScanLock;
    return (
      <LinearGradient
        colors={[colors.darkBlue, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fullScreenGradientBackground}
      >
        <BlurView intensity={50} tint="dark" style={styles.fullScreenBlurOverlay}>
          <ScrollView 
            contentContainerStyle={styles.uploadScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Animated Single-Line Progress Bar */}
            <View style={styles.progressBarLineContainer}>
              <View style={[styles.progressBarLineFill, { width: `${getProgress() * 100}%` }]} />
            </View>
            
            {/* Thumbnails Row */}
            <View style={styles.uploadStepThumbnailsRow}>
              {(['front', 'side', 'back'] as const).map((type) => {
                const uri = uploadThumbnails[type];
                return uri && typeof uri === 'string' ? (
                  <Image key={type} source={{ uri }} style={styles.uploadStepThumbnail} />
                ) : (
                  <View key={type} style={styles.uploadStepThumbnailPlaceholder} />
                );
              })}
            </View>
            
            {/* Upload Area for Current Step */}
            <View style={styles.uploadStepArea}>
              <Text style={styles.uploadStepTitle}>
                {uploadStep === 'front' ? 'Front View' : uploadStep === 'side' ? 'Side View' : 'Back View'}
              </Text>
              <TouchableOpacity
                style={[styles.uploadStepImageArea, isLocked && { opacity: 0.5 }]}
                onPress={() => !isLocked && handleImageUpload(uploadStep)}
                disabled={isLocked}
              >
                {images[uploadStep] ? (
                  <Image source={{ uri: images[uploadStep] }} style={styles.uploadStepImagePreview} />
                ) : (
                  <Ionicons name="camera" size={60} color={colors.white} />
                )}
              </TouchableOpacity>
              <Text style={styles.uploadStepTip}>
                {uploadStep === 'front'
                  ? 'Face forward, full body visible.'
                  : uploadStep === 'side'
                  ? 'Stand sideways, hands at sides.'
                  : 'Face away, full body visible.'}
              </Text>
            </View>
            
            {/* Navigation Buttons Row */}
            <View style={styles.uploadStepButtonRow}>
              {uploadStep !== 'front' && (
                <TouchableOpacity 
                  style={[styles.iconNavButton, styles.secondaryButton]} 
                  onPress={() => setUploadStep(uploadStep === 'back' ? 'side' : 'front')}
                >
                  <Ionicons name="arrow-back" size={28} color={colors.buttonPrimary} />
                </TouchableOpacity>
              )}
              
              {uploadStep !== 'back' ? (
                <TouchableOpacity
                  style={[
                    styles.iconNavButton,
                    styles.actionButtonProminent,
                    images[uploadStep] && !isLocked ? styles.actionButtonActive : styles.actionButtonDisabled,
                    isLocked && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (images[uploadStep] && !isLocked) {
                      setUploadThumbnails((prev) => ({ ...prev, [uploadStep]: images[uploadStep] }));
                      setUploadStep(uploadStep === 'front' ? 'side' : 'back');
                    }
                  }}
                  disabled={isLocked || !images[uploadStep]}
                >
                  <Ionicons name="arrow-forward" size={28} color={colors.white} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.iconNavButton,
                    styles.actionButtonProminent,
                    images.front && images.side && images.back && !isLocked ? styles.actionButtonActive : styles.actionButtonDisabled,
                    isLocked && { opacity: 0.5 },
                  ]}
                  onPress={async () => {
                    if (
                      typeof images.front === 'string' &&
                      typeof images.side === 'string' &&
                      typeof images.back === 'string' &&
                      !isLocked
                    ) {
                      setCurrentStep('analyzing');
                      setIsAnalyzing(true);
                      await processAndUploadImages([images.front, images.side, images.back]);
                    }
                  }}
                  disabled={
                    isLocked ||
                    !(typeof images.front === 'string' && typeof images.side === 'string' && typeof images.back === 'string')
                  }
                >
                  <Ionicons name="checkmark" size={28} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </BlurView>
      </LinearGradient>
    );
  };

  // Analyzing UI
  const renderAnalyzing = () => (
    <LinearGradient
      colors={[colors.darkBlue, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.analyzingContainer}
    >
      <Animated.Image
        source={Logo}
        style={[styles.analyzingLogo, { transform: [{ scale: pulseAnim }]}]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.analyzingText, { opacity: tipFadeAnim }]}> {analysisTips[currentTipIndex]} </Animated.Text>
    </LinearGradient>
  );


  // Modern after photo form component
  const renderAfterPhotoForm = () => (
    <ScrollView 
      contentContainerStyle={styles.modernAfterPhotoContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Results at the top */}
      {afterPhotoResult && (
        <View style={styles.modernResults}>
          <Animated.View style={[styles.resultsHeader, { opacity: tipFadeAnim }]}>
            <View style={styles.sparkleIconContainer}>
              <Ionicons name="sparkles" size={24} color={colors.buttonPrimary} />
            </View>
            <Text style={styles.modernResultsTitle}>Your AI Vision</Text>
            <Text style={styles.resultsSubtitle}>Transformation Complete</Text>
          </Animated.View>
          
          <Animated.View style={[styles.transformationContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.beforeAfterWrapper}>
              <Animated.View style={[styles.beforeImageContainer, { opacity: tipFadeAnim }]}>
                <View style={styles.imageLabelContainer}>
                  <Text style={styles.beforeLabel}>Before</Text>
                  <View style={styles.labelIndicator} />
                </View>
                <TouchableOpacity 
                  style={styles.imageWrapper}
                  onPress={() => handleImagePress(afterPhotoImage!)}
                >
                  <Image source={{ uri: afterPhotoImage! }} style={styles.transformationImage} />
                  <View style={styles.imageOverlay} />
                  <View style={styles.imageClickIndicator}>
                    <Ionicons name="expand" size={16} color={colors.white} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
              
              <Animated.View style={[styles.transformationArrow, { opacity: tipFadeAnim }]}>
                <View style={styles.arrowBackground}>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </View>
                <View style={styles.arrowPulse} />
              </Animated.View>
              
              <Animated.View style={[styles.afterImageContainer, { opacity: tipFadeAnim }]}>
                <View style={styles.imageLabelContainer}>
                  <Text style={styles.afterLabel}>After</Text>
                  <View style={[styles.labelIndicator, styles.afterLabelIndicator]} />
                </View>
                <TouchableOpacity 
                  style={styles.imageWrapper}
                  onPress={() => handleImagePress(afterPhotoResult.after_photo_url)}
                >
                  <Image source={{ uri: afterPhotoResult.after_photo_url }} style={styles.transformationImage} />
                  <View style={[styles.imageOverlay, styles.afterImageOverlay]} />
                  <View style={styles.imageClickIndicator}>
                    <Ionicons name="expand" size={16} color={colors.white} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.successMessage, { opacity: tipFadeAnim }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.buttonPrimary} />
            <Text style={styles.successText}>AI transformation generated successfully</Text>
          </Animated.View>
        </View>
      )}

      {/* Main Card */}
      <View style={styles.modernCard}>
        {/* Image Upload Section */}
        <View style={styles.imageUploadSection}>
          <Text style={styles.sectionTitle}>Upload Your Photo</Text>
          <TouchableOpacity
            style={styles.modernImageUploadArea}
            onPress={() => handleImageUpload('after_photo')}
          >
            {afterPhotoImage ? (
              <Image source={{ uri: afterPhotoImage }} style={styles.modernImagePreview} />
            ) : (
              <View style={styles.modernImagePlaceholder}>
                <View style={styles.uploadIconContainer}>
                  <Ionicons name="camera" size={28} color={colors.buttonPrimary} />
                </View>
                <Text style={styles.uploadText}>Tap to upload</Text>
                <Text style={styles.uploadSubtext}>Best results with full body photos</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Auto-populated Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Your Profile Data</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Body Fat</Text>
              <Text style={styles.infoValue}>
                {latestBodyFat ? `${latestBodyFat}%` : 'Not available'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>
                {profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>
                {profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Duration Input */}
        <View style={styles.durationSection}>
          <Text style={styles.sectionTitle}>Transformation Timeline</Text>
          <View style={styles.durationInputContainer}>
            <Text style={styles.durationLabel}>How many weeks of progress?</Text>
            <View style={styles.durationOptionsContainer}>
              {[4, 8, 12, 16].map((weeks) => (
                <TouchableOpacity
                  key={weeks}
                  style={[
                    styles.durationOption,
                    durationWeeks === weeks.toString() && styles.durationOptionActive
                  ]}
                  onPress={() => setDurationWeeks(weeks.toString())}
                >
                  <Text style={[
                    styles.durationOptionText,
                    durationWeeks === weeks.toString() && styles.durationOptionTextActive
                  ]}>
                    {weeks}
                  </Text>
                  <Text style={[
                    styles.durationOptionUnit,
                    durationWeeks === weeks.toString() && styles.durationOptionUnitActive
                  ]}>
                    weeks
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customDurationContainer}>
              <Text style={styles.customDurationLabel}>Or enter custom:</Text>
              <View style={styles.customDurationInputWrapper}>
                <TextInput
                  style={styles.customDurationInput}
                  value={durationWeeks}
                  onChangeText={setDurationWeeks}
                  placeholder="8"
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.secondary}
                  textAlign="center"
                />
                <Text style={styles.customDurationUnit}>weeks</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.modernGenerateButton,
            (!afterPhotoImage || !durationWeeks || isGeneratingAfterPhoto) && styles.modernGenerateButtonDisabled
          ]}
          onPress={() => afterPhotoImage && generateAfterPhoto(afterPhotoImage)}
          disabled={!afterPhotoImage || !durationWeeks || isGeneratingAfterPhoto}
        >
          {isGeneratingAfterPhoto ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color={colors.white} />
              <Text style={styles.modernGenerateButtonText}>Generate Vision</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Main render
  return (
    <>
      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
              {selectedImage && (
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Countdown Modal with glassmorphism effect */}
      <Modal
        visible={scanCooldown > 0 && !overrideScanLock && (currentStep === 'front' || currentStep === 'side' || currentStep === 'back')}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setScanCooldown(0);
          setOverrideScanLock(false);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(30,40,60,0.18)' }}>
          <LinearGradient
            colors={["#ffffff", "#f0f4ff", colors.primary + '22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '85%',
              padding: 32,
              borderRadius: 28,
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.92)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <Text style={{ color: colors.buttonPrimary, fontWeight: 'bold', fontSize: 22, marginBottom: 10, textAlign: 'center' }}>
              Next scan recommended in:
            </Text>
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 36, marginBottom: 12, textAlign: 'center', letterSpacing: 1 }}>
              {formatCooldown(scanCooldown)}
            </Text>
            <Text style={{ color: colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 18, opacity: 0.95 }}>
              For the most accurate results, scans should be taken once every 7 days. Daily changes are mostly water, not true fat loss. Waiting makes your progress clear and motivating, but you can scan anyway if you'd like.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.buttonPrimary,
                borderRadius: 22,
                paddingVertical: 14,
                paddingHorizontal: 38,
                marginTop: 8,
                shadowColor: colors.buttonPrimary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={() => setOverrideScanLock(true)}
            >
              <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>Scan Anyway</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
      
      {/* Main content */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header with mode selector */}
        <LinearGradient
          colors={[colors.darkBlue, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: '100%',
            height: 120,
            position: 'absolute',
            top: 0,
            left: 0,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            paddingTop: Platform.OS === 'ios' ? 40 : 20,
            zIndex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
        >
          {/* Mode Selector in Header */}
          <View style={styles.headerModeSelector}>
            <TouchableOpacity
              style={[
                styles.headerModeButton,
                uploadMode === 'analyze' && styles.headerModeButtonActive
              ]}
              onPress={() => setUploadMode('analyze')}
            >
              <Ionicons 
                name="scan" 
                size={18} 
                color={uploadMode === 'analyze' ? colors.white : 'rgba(255,255,255,0.8)'} 
              />
              <Text style={[
                styles.headerModeButtonText,
                uploadMode === 'analyze' && styles.headerModeButtonTextActive
              ]}>
                Body Scan
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.headerModeButton,
                uploadMode === 'after_photo' && styles.headerModeButtonActive
              ]}
              onPress={() => setUploadMode('after_photo')}
            >
              <Ionicons 
                name="sparkles" 
                size={18} 
                color={uploadMode === 'after_photo' ? colors.white : 'rgba(255,255,255,0.8)'} 
              />
              <Text style={[
                styles.headerModeButtonText,
                uploadMode === 'after_photo' && styles.headerModeButtonTextActive
              ]}>
                AI Vision
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <View style={{ flex: 1, paddingTop: 100 }}>
          
          {/* Content based on mode */}
          {uploadMode === 'analyze' ? (
            currentStep === 'analyzing' ? renderAnalyzing() : renderUploadStep()
          ) : (
            renderAfterPhotoForm()
          )}
        </View>
      </View>
    </>
  );
};

// Paste the styles object from DashboardScreen.tsx here:
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 90,
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingBottom: getBottomSpace(),
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  homeTabButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 + getBottomSpace() : 30,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    position: 'relative',
  },
  homeTabButtonFocused: {
    backgroundColor: colors.primary,
  },
  homeTabButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPanelWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginVertical: 24,
    justifyContent: 'space-between',
  },
  uploadTopButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    gap: 10,
  },
  uploadTopButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  uploadHintText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    opacity: 0.85,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: 8,
  },
  actionButtonProminent: {
    backgroundColor: colors.buttonPrimary,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadCompactScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 10,
    paddingBottom: getBottomSpace() + 40, // Extra bottom padding for safe area
  },
  uploadSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    marginVertical: 12,
    gap: 8,
  },
  uploadActionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 18,
    marginBottom: 24,
    gap: 10,
  },
  uploadActionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  progressBarContainerSlim: {
    flexDirection: 'row',
    width: '90%',
    height: 8,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 18,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  progressSegment: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#ccc',
    height: '100%',
  },
  uploadStepThumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
    paddingHorizontal: 20,
  },
  uploadStepThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.buttonPrimary,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadStepThumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadStepArea: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
    minHeight: 280,
  },
  uploadStepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  uploadStepImageArea: {
    width: '90%',
    height: 200,
    maxWidth: 260,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadStepImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 24,
  },
  uploadStepTip: {
    color: colors.white,
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  uploadStepButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  uploadStepButton: {
    flex: 1,
    marginHorizontal: 5,
    minWidth: 140,
  },
  progressBarLineContainer: {
    width: '85%',
    height: 8,
    backgroundColor: colors.white,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 32,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBarLineFill: {
    height: '100%',
    backgroundColor: colors.buttonPrimary,
    borderRadius: 6,
  },
  uploadStepButtonSmall: {
    minWidth: 100,
    maxWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignSelf: 'center',
    borderRadius: 20,
  },
  iconNavButton: {
    minWidth: 56,
    minHeight: 56,
    maxWidth: 64,
    maxHeight: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
  },
  actionButtonActive: {
    opacity: 0.8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  fullScreenGradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  analyzingLogo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  analyzingText: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  uploadScrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 10,
    paddingBottom: getBottomSpace() + 40, // Extra bottom padding for safe area
  },
  
  // Header mode selector styles
  headerModeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    minWidth: 100,
  },
  headerModeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerModeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  headerModeButtonTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  
  // Modern after photo styles
  modernAfterPhotoContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: getBottomSpace() + 100, // Extra padding for navigation
  },
  
  // Main card
  modernCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Section styles
  imageUploadSection: {
    marginBottom: 32,
  },
  infoSection: {
    marginBottom: 32,
  },
  durationSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    marginBottom: 16,
  },
  
  // Image upload
  modernImageUploadArea: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modernImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 18,
  },
  modernImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.buttonPrimary,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  
  // Info grid
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  
  // Duration input
  durationInputContainer: {
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.buttonPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Duration options
  durationOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  durationOption: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationOptionActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  durationOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  durationOptionTextActive: {
    color: colors.white,
  },
  durationOptionUnit: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  durationOptionUnitActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Custom duration
  customDurationContainer: {
    alignItems: 'center',
  },
  customDurationLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  customDurationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  customDurationInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    minWidth: 50,
  },
  customDurationUnit: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  
  // Generate button
  modernGenerateButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modernGenerateButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 0,
    elevation: 0,
  },
  modernGenerateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  
  // Results
  modernResults: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  
  // Results header
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sparkleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modernResultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  // Transformation container
  transformationContainer: {
    marginBottom: 24,
  },
  beforeAfterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  // Image containers
  beforeImageContainer: {
    flex: 1,
    alignItems: 'center',
  },
  afterImageContainer: {
    flex: 1,
    alignItems: 'center',
  },
  imageLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  beforeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  afterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  labelIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.secondary,
  },
  afterLabelIndicator: {
    backgroundColor: colors.buttonPrimary,
  },
  
  // Image styling
  imageWrapper: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  transformationImage: {
    width: 140,
    height: 180,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  afterImageOverlay: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  
  // Arrow styling
  transformationArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arrowBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.buttonPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  arrowPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonPrimary,
    opacity: 0.3,
  },
  
  // Success message
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.buttonPrimary,
  },
  
  // Image click indicator
  imageClickIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});

export default SmartAnalysisScreen; 