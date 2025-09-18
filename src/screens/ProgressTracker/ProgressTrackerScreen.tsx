import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TouchableOpacity, Image, Dimensions, Alert, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { getBottomSpace } from 'react-native-iphone-x-helper';
import { supabase } from '../../lib/supabase';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

const ProgressTrackerScreen = () => {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<any[]>([]);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [bodyFatInfoVisible, setBodyFatInfoVisible] = useState(false);
  const [changeInfoVisible, setChangeInfoVisible] = useState(false);
  const [bmiInfoVisible, setBmiInfoVisible] = useState(false);
  const [tdeeInfoVisible, setTdeeInfoVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('User not found');
        // Fetch scans
        const { data: scanData, error: scanError } = await supabase
          .from('body_scans')
          .select('*')
          .eq('user_id', user.id)
          .order('scanned_at', { ascending: false });
        if (scanError) throw scanError;
        setScans(scanData || []);
        // Fetch profile (for BMI/TDEE)
        const { data: profileData, error: profileError, status } = await supabase
          .from('profiles')
          .select('id, email, name, age, gender, height_cm, weight_kg, bmi_bmi, tdee_tdee')
          .eq('id', user.id)
          .single();
        if (profileError && status !== 406) throw profileError;
        setProfile(profileData || null);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load scan history or profile');
        setScans([]);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Summary metrics
  const latestScan = scans[0];
  const firstScan = scans.length > 0 ? scans[scans.length - 1] : null;
  const latestBodyFat = latestScan?.analysis_body_fat ?? null;
  const firstBodyFat = firstScan?.analysis_body_fat ?? null;
  // Absolute and relative change
  const absoluteChange =
    latestBodyFat != null && firstBodyFat != null
      ? (latestBodyFat - firstBodyFat).toFixed(1)
      : null;
  const relativeChange =
    latestBodyFat != null && firstBodyFat != null && firstBodyFat !== 0
      ? (((latestBodyFat - firstBodyFat) / firstBodyFat) * 100).toFixed(1)
      : null;
  // Styling logic
  let changeColor = colors.text.secondary;
  let changeIcon = null;
  if (absoluteChange != null) {
    if (parseFloat(absoluteChange) < 0) {
      changeColor = colors.success;
      changeIcon = <Ionicons name="arrow-down" size={18} color={colors.success} style={{ marginRight: 4 }} />;
    } else if (parseFloat(absoluteChange) > 0) {
      changeColor = colors.error;
      changeIcon = <Ionicons name="arrow-up" size={18} color={colors.error} style={{ marginRight: 4 }} />;
    } else {
      changeColor = colors.text.secondary;
      changeIcon = <Ionicons name="remove" size={18} color={colors.text.secondary} style={{ marginRight: 4 }} />;
    }
  }
  const trendDown = relativeChange != null && parseFloat(relativeChange) < 0;
  const trendUp = relativeChange != null && parseFloat(relativeChange) > 0;

  // Chart data
  const chartLabels = scans
    .map(scan => scan.scanned_at)
    .reverse()
    .map(date => {
      const d = new Date(date);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[d.getMonth()]} ${d.getDate()}`;
    });
  const chartDataArr = scans
    .map(scan => scan.analysis_body_fat)
    .reverse();

  // Scan history list
  const renderScanHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Scan History</Text>
      {scans.length === 0 ? (
        <View style={styles.noScansContainer}>
          <Ionicons name="cloud-upload-outline" size={36} color={colors.buttonPrimary} />
          <Text style={styles.noScansText}>No scans yet. Upload your first scan to see your progress!</Text>
        </View>
      ) : (
        scans.map((scan, idx) => (
          <TouchableOpacity
            key={scan.id || idx}
            style={styles.scanCard}
            onPress={() => {
              setSelectedScan(scan);
              setModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.scanCardRow}>
              <Image
                source={scan.front_image_url ? { uri: scan.front_image_url } : require('../../../assets/MaleDefaultImage.png')}
                style={styles.scanCardThumb}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.scanCardDate}>{formatScanDate(scan.scanned_at)}</Text>
                <Text style={styles.scanCardBodyFat}>{scan.analysis_body_fat != null ? `${scan.analysis_body_fat}%` : 'N/A'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // Modal for scan details
  const renderScanModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          {selectedScan && (
            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Scan Details</Text>
              <View style={styles.modalImagesRow}>
                {['front_image_url', 'side_image_url', 'back_image_url'].map((key, i) => (
                  <Image
                    key={key}
                    source={selectedScan[key] ? { uri: selectedScan[key] } : require('../../../assets/MaleDefaultImage.png')}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
              <Text style={styles.modalBodyFat}>{selectedScan.analysis_body_fat != null ? `${selectedScan.analysis_body_fat}%` : 'N/A'}</Text>
              <Text style={styles.modalLabel}>Analysis Rationale</Text>
              <Text style={styles.modalRationale}>{selectedScan.analysis_rationale || 'N/A'}</Text>
              {/* 
              <View style={styles.modalMetricsRow}>
                <View style={styles.modalMetricCard}>
                  <Text style={styles.modalMetricLabel}>BMI</Text>
                  <Text style={styles.modalMetricValue}>{selectedScan.bmi ?? 'N/A'}</Text>
                </View>
                <View style={styles.modalMetricCard}>
                  <Text style={styles.modalMetricLabel}>TDEE</Text>
                  <Text style={styles.modalMetricValue}>{selectedScan.tdee ?? 'N/A'}</Text>
                </View>
              </View>
              */}
              <Text style={styles.modalDate}>{formatScanDate(selectedScan.scanned_at, true)}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Format date helper
  function formatScanDate(dateStr: string, withTime = false) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return withTime
      ? d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Summary Metrics
  const renderSummaryMetrics = () => (
    <View style={styles.metricsContainer}>
      <View style={styles.metricCard}>
        {/* Info Icon */}
        <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }} onPress={() => setBodyFatInfoVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.buttonPrimary} />
        </TouchableOpacity>
        <Text style={styles.metricLabel}>Latest Body Fat</Text>
        <Text style={styles.metricValue}>{latestBodyFat != null ? `${latestBodyFat}%` : '--%'}</Text>
      </View>
      <View style={styles.metricCard}>
        {/* Info Icon */}
        <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }} onPress={() => setChangeInfoVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.buttonPrimary} />
        </TouchableOpacity>
        <Text style={styles.metricLabel}>Overall Change</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.metricValue, { color: changeColor, fontSize: 16, textAlign: 'center', lineHeight: 22 }]}> 
            {absoluteChange != null && relativeChange != null ? 
              (parseFloat(absoluteChange) < 0 ? 
                'Down since first scan' : 
                parseFloat(absoluteChange) > 0 ? 
                'Up since first scan' : 
                'No change since first scan'
              ) : 'No data yet'
            }
          </Text>
        </View>
      </View>
      <View style={styles.metricCard}>
        <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }} onPress={() => setBmiInfoVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.buttonPrimary} />
        </TouchableOpacity>
        <Text style={styles.metricLabel}>Body Mass Index</Text>
        <Text style={styles.metricValue}>{profile?.bmi_bmi ? Math.round(parseFloat(profile.bmi_bmi)).toString() : '--'}</Text>
      </View>
      <View style={styles.metricCard}>
        <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }} onPress={() => setTdeeInfoVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.buttonPrimary} />
        </TouchableOpacity>
        <Text style={[styles.metricLabel, { textAlign: 'center' }]}>TDEE</Text>
        <Text style={[styles.metricValue, { fontSize: 18, textAlign: 'center' }]}>{profile?.tdee_tdee ? Math.round(parseFloat(profile.tdee_tdee)).toString() : '--'}</Text>
      </View>
    </View>
  );

  // Chart
  const renderChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Body Fat Trend</Text>
      {scans.length > 1 ? (
        <LineChart
          data={{
            labels: chartLabels,
            datasets: [
              {
                data: chartDataArr,
                color: (opacity = 1) => colors.buttonPrimary,
                strokeWidth: 2,
              },
            ],
          }}
          width={Dimensions.get('window').width - 80}
          height={180}
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: colors.white,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            decimalPlaces: 1,
            color: (opacity = 1) => colors.buttonPrimary,
            labelColor: (opacity = 1) => colors.text.secondary,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: colors.white,
            },
            propsForBackgroundLines: {
              strokeDasharray: '6',
              stroke: colors.border,
            },
            propsForLabels: {
              fontWeight: '500',
            },
          }}
          bezier
          style={{ borderRadius: 14, marginVertical: 8 }}
          withShadow={true}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          fromZero
        />
      ) : (
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color={colors.buttonPrimary + '55'} />
          <Text style={styles.chartPlaceholderText}>Chart will appear here</Text>
        </View>
      )}
      <Text style={styles.disclaimerText}>
        This is an AI-based visual estimate for educational and fitness purposes only. It is not a medical device or diagnosis, and accuracy can vary.
      </Text>
    </View>
  );

  // Header
  const renderHeader = () => (
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        zIndex: 1,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.white }}>Progress Tracker</Text>
    </LinearGradient>
  );

  // Info Modals
  // Modal style matches DashboardScreen
  const infoModalCardStyle = { backgroundColor: colors.white, borderRadius: 22, padding: 0, width: 0.82 * Dimensions.get('window').width, maxWidth: 400, alignItems: 'center' as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 };
  const infoModalContentStyle = { padding: 26, paddingHorizontal: 10, width: 0.82 * Dimensions.get('window').width, maxWidth: 400, alignItems: 'center' as const };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={{ flex: 1, paddingTop: 100 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderSummaryMetrics()}
          {renderChart()}
          {loading ? (
            <ActivityIndicator size="large" color={colors.buttonPrimary} style={{ marginTop: 40 }} />
          ) : (
            renderScanHistory()
          )}
        </ScrollView>
      </View>
      {renderScanModal()}
      {/* Info Modals */}
      {/* Body Fat */}
      <Modal visible={bodyFatInfoVisible} transparent animationType="fade" onRequestClose={() => setBodyFatInfoVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={infoModalCardStyle}>
            <TouchableOpacity onPress={() => setBodyFatInfoVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
            </TouchableOpacity>
            <View style={infoModalContentStyle}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8 }}>Latest Body Fat</Text>
              <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 18, opacity: 0.18 }} />
              <Text style={{ fontSize: 16, color: colors.text.primary, textAlign: 'center', marginBottom: 6, lineHeight: 22 }}>
                This is your most recent body fat percentage, estimated from your latest scan. Tracking your body fat helps you understand changes in your body composition over time.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      {/* Overall Change */}
      <Modal visible={changeInfoVisible} transparent animationType="fade" onRequestClose={() => setChangeInfoVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={infoModalCardStyle}>
            <TouchableOpacity onPress={() => setChangeInfoVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
            </TouchableOpacity>
            <View style={infoModalContentStyle}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8 }}>Overall Change</Text>
              <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 18, opacity: 0.18 }} />
              <Text style={{ fontSize: 16, color: colors.text.primary, textAlign: 'center', marginBottom: 10, lineHeight: 22 }}>
                This shows how your body fat percentage has changed since your first scan. Both the absolute and relative changes help you see your progress over time.
              </Text>
              <View style={{ alignSelf: 'flex-start', marginLeft: 6, marginBottom: 2 }}>
                <Text style={{ fontSize: 15, color: colors.primary, fontWeight: 'bold', marginBottom: 4 }}>What do these mean?</Text>
                <Text style={{ fontSize: 15, color: colors.text.primary, marginBottom: 2 }}>• <Text style={{ fontWeight: 'bold' }}>Absolute Change:</Text> The difference in body fat percentage between your first and latest scan. (e.g., from 30% to 25% = <Text style={{ color: colors.success }}>-5%</Text>)</Text>
                <Text style={{ fontSize: 15, color: colors.text.primary }}>• <Text style={{ fontWeight: 'bold' }}>Relative Change:</Text> The percentage change relative to your starting value. (e.g., a drop from 30% to 25% = <Text style={{ color: colors.success }}>-16.7%</Text> relative change)</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* BMI */}
      <Modal visible={bmiInfoVisible} transparent animationType="fade" onRequestClose={() => setBmiInfoVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={infoModalCardStyle}>
            <TouchableOpacity onPress={() => setBmiInfoVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
            </TouchableOpacity>
            <View style={infoModalContentStyle}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8 }}>Body Mass Index (BMI)</Text>
              <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 18, opacity: 0.18 }} />
              <Text style={{ fontSize: 16, color: colors.text.primary, textAlign: 'center', marginBottom: 6, lineHeight: 22 }}>
                BMI is a standard health measure used worldwide to classify weight relative to height. It has limits, but combined with your AI scan it helps build a fuller picture of your health.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      {/* TDEE */}
      <Modal visible={tdeeInfoVisible} transparent animationType="fade" onRequestClose={() => setTdeeInfoVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={infoModalCardStyle}>
            <TouchableOpacity onPress={() => setTdeeInfoVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.buttonPrimary} />
            </TouchableOpacity>
            <View style={infoModalContentStyle}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8, marginTop: 8 }}>TDEE</Text>
              <View style={{ width: 38, height: 4, backgroundColor: colors.buttonPrimary, borderRadius: 2, marginBottom: 18, opacity: 0.18 }} />
              <Text style={{ fontSize: 16, color: colors.text.primary, textAlign: 'center', marginBottom: 6, lineHeight: 22 }}>
                This is your estimated daily calorie needs. Eating less supports fat loss. Eating more supports muscle gain. Your personalized diet plan is based on this number.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 30,
    paddingBottom: getBottomSpace() + 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: 6,
    marginBottom: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 18,
    marginBottom: 18,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 5,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 18,
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  chartPlaceholder: {
    height: 180,
    width: Dimensions.get('window').width - 80,
    backgroundColor: colors.background,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartPlaceholderText: {
    color: colors.text.secondary,
    marginTop: 10,
  },
  historyContainer: {
    marginHorizontal: 18,
    marginBottom: 30,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  noScansContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  noScansText: {
    color: colors.text.secondary,
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  scanCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scanCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanCardThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  scanCardDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  scanCardBodyFat: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  modalImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    width: '100%',
  },
  modalImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  modalBodyFat: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalRationale: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
  },
  modalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    width: '100%',
  },
  modalMetricCard: {
    alignItems: 'center',
  },
  modalMetricLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  modalMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  modalDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 12,
    marginHorizontal: 20,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default ProgressTrackerScreen; 