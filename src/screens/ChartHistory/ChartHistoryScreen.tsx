import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getBottomSpace } from 'react-native-iphone-x-helper';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

interface CheckIn {
  id: string;
  scanned_at: string;
  analysis_body_fat: number;
  front_image_url: string;
  side_image_url: string;
  back_image_url: string;
  analysis_rationale: string;
}

type FilterPeriod = 'all' | 'week' | 'month' | '3months' | '6months' | 'year';

const ChartHistoryScreen = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [filteredCheckIns, setFilteredCheckIns] = useState<CheckIn[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>('all');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; value: number; date: string } | null>(null);

  // Fetch check-ins from database
  useEffect(() => {
    fetchCheckIns();
  }, []);

  // Apply filters when check-ins or filter changes
  useEffect(() => {
    applyFilter();
  }, [checkIns, selectedFilter]);

  const fetchCheckIns = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (user) {
        const { data, error } = await supabase
          .from('body_scans')
          .select('*')
          .eq('user_id', user.id)
          .order('scanned_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          setCheckIns(data as CheckIn[]);
          console.log('Check-ins loaded:', data.length);
        }
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      Alert.alert('Error', 'Failed to load check-in history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    const now = new Date();
    let filtered = [...checkIns];

    switch (selectedFilter) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = checkIns.filter(checkIn => new Date(checkIn.scanned_at) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = checkIns.filter(checkIn => new Date(checkIn.scanned_at) >= monthAgo);
        break;
      case '3months':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = checkIns.filter(checkIn => new Date(checkIn.scanned_at) >= threeMonthsAgo);
        break;
      case '6months':
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        filtered = checkIns.filter(checkIn => new Date(checkIn.scanned_at) >= sixMonthsAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = checkIns.filter(checkIn => new Date(checkIn.scanned_at) >= yearAgo);
        break;
      default:
        // 'all' - no filtering
        break;
    }

    setFilteredCheckIns(filtered);
    updateChartData(filtered);
  };

  const updateChartData = (data: CheckIn[]) => {
    if (data.length === 0) {
      setChartData(null);
      return;
    }

    // Sort by date for chart
    const sortedData = [...data].sort((a, b) => 
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
    );

    const chartLabels = sortedData.map(checkIn => {
      const date = new Date(checkIn.scanned_at);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const chartDataArr = sortedData.map(checkIn => checkIn.analysis_body_fat);

    const chartData = {
      labels: chartLabels,
      datasets: [
        {
          data: chartDataArr,
          color: (opacity = 1) => colors.buttonPrimary,
          strokeWidth: 2,
        },
      ],
    };

    setChartData(chartData);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const FilterButton = ({ period, label }: { period: FilterPeriod; label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === period && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(period)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === period && styles.filterButtonTextActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCheckInCard = (checkIn: CheckIn, index: number) => (
    <View key={checkIn.id} style={styles.checkInCard}>
      <View style={styles.checkInHeader}>
        <Text style={styles.checkInDate}>{formatDate(checkIn.scanned_at)}</Text>
        <Text style={styles.checkInBodyFat}>{checkIn.analysis_body_fat}%</Text>
      </View>
      
      <View style={styles.checkInImages}>
        <Image 
          source={{ uri: checkIn.front_image_url }} 
          style={styles.checkInImage}
          resizeMode="cover"
        />
        <Image 
          source={{ uri: checkIn.side_image_url }} 
          style={styles.checkInImage}
          resizeMode="cover"
        />
        <Image 
          source={{ uri: checkIn.back_image_url }} 
          style={styles.checkInImage}
          resizeMode="cover"
        />
      </View>
      
      <Text style={styles.checkInRationale} numberOfLines={3}>
        {checkIn.analysis_rationale}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.darkBlue, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Chart History</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <FilterButton period="all" label="All" />
            <FilterButton period="week" label="Week" />
            <FilterButton period="month" label="Month" />
            <FilterButton period="3months" label="3 Months" />
            <FilterButton period="6months" label="6 Months" />
            <FilterButton period="year" label="Year" />
          </ScrollView>
        </View>

        {/* Chart */}
        {chartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Body Fat Progress</Text>
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - 60}
              height={240}
              yAxisSuffix="%"
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
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
              style={{
                borderRadius: 18,
                marginVertical: 8,
              }}
              withShadow={true}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              fromZero
              onDataPointClick={({ index, value, x, y }) => {
                setActiveIndex(index);
                setTooltipPos({
                  x,
                  y,
                  value,
                  date: chartData.labels[index],
                });
              }}
              decorator={() => {
                if (tooltipPos) {
                  return (
                    <>
                      {/* Vertical line */}
                      <Svg
                        width={Dimensions.get('window').width - 60}
                        height={240}
                        style={{ position: 'absolute', left: 0, top: 0 }}
                      >
                        <Path
                          d={`M${tooltipPos.x},30 L${tooltipPos.x},210`}
                          stroke={colors.buttonPrimary}
                          strokeWidth={2}
                          strokeDasharray="4"
                        />
                      </Svg>
                      {/* Tooltip */}
                      <View
                        style={{
                          position: 'absolute',
                          left: tooltipPos.x - 40,
                          top: tooltipPos.y - 50,
                          backgroundColor: '#fff',
                          borderRadius: 10,
                          paddingVertical: 6,
                          paddingHorizontal: 14,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.12,
                          shadowRadius: 6,
                          elevation: 6,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontWeight: 'bold', color: colors.text.primary, fontSize: 16 }}>{tooltipPos.value.toFixed(1)}%</Text>
                        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{tooltipPos.date}</Text>
                      </View>
                    </>
                  );
                }
                return null;
              }}
              getDotColor={(dataPoint, index) =>
                activeIndex === index ? colors.buttonPrimary : colors.buttonPrimary + '99'
              }
            />
          </View>
        )}

        {/* Check-ins List */}
        <View style={styles.checkInsContainer}>
          <Text style={styles.checkInsTitle}>
            Check-ins ({filteredCheckIns.length})
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading check-ins...</Text>
            </View>
          ) : filteredCheckIns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No check-ins found</Text>
              <Text style={styles.emptySubtext}>
                Complete your first body scan to see your history here
              </Text>
            </View>
          ) : (
            filteredCheckIns.map(renderCheckInCard)
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: getBottomSpace() + 20,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filtersScroll: {
    paddingHorizontal: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterButtonActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  filterButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  checkInsContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  checkInsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  checkInCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInDate: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  checkInBodyFat: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.buttonPrimary,
  },
  checkInImages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  checkInImage: {
    width: (screenWidth - 80) / 3,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  checkInRationale: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default ChartHistoryScreen; 