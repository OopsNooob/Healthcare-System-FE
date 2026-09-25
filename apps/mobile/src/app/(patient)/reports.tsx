import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { ArrowLeft, LineChart, Sparkles, Activity, FileText } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function ReportsScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [aiLoading, setAiLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setAiLoading(true);
    const timer = setTimeout(() => {
      setAiLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [timeRange]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('flex-row items-center px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800')}>
        <TouchableOpacity onPress={() => router.back()} style={tw('p-2 -ml-2 mr-2')}>
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
        </TouchableOpacity>
        <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.health_reports', 'Báo cáo sức khỏe')}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        
        {/* Time Range Selector */}
        <View style={tw('flex-row bg-slate-200 dark:bg-slate-800 rounded-xl p-1 mb-6')}>
          {['7d', '30d', '90d'].map((range) => (
            <TouchableOpacity 
              key={range}
              onPress={() => setTimeRange(range as any)}
              style={tw(`flex-1 py-2.5 items-center rounded-lg ${timeRange === range ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
            >
              <Text style={tw(`font-semibold ${timeRange === range ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>
                {range === '7d' ? t('mobile.7_days', '7 Ngày') : range === '30d' ? t('mobile.30_days', '30 Ngày') : t('mobile.90_days', '90 Ngày')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Mockup */}
        <View style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6')}>
          <View style={tw('flex-row justify-between items-center mb-4')}>
            <View style={tw('flex-row items-center gap-2')}>
              <Activity color={twInstance.color('text-emerald-500')} size={20} />
              <Text style={tw('font-bold text-slate-900 dark:text-white text-lg')}>{t('mobile.blood_pressure_trend', 'Biểu đồ Huyết áp')}</Text>
            </View>
            <LineChart color={twInstance.color('text-slate-400')} size={20} />
          </View>
          
          <View style={tw('h-48 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800')}>
            {/* Fake Chart Lines */}
            <View style={tw('absolute bottom-4 left-4 right-4 h-32 border-b border-l border-slate-300 dark:border-slate-700')} />
            <Text style={tw('text-slate-400 dark:text-slate-600 font-medium')}>{t('mobile.chart_data_placeholder', '[Biểu đồ Line Chart hiển thị ở đây]')}</Text>
          </View>
        </View>

        {/* AI Summary Section (DA2) */}
        <View style={tw('bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm')}>
          <View style={tw('flex-row items-center gap-2 mb-4')}>
            <Sparkles color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
            <Text style={tw('font-bold text-indigo-900 dark:text-indigo-100 text-lg')}>{t('mobile.ai_health_summary', 'AI Tổng kết Sức khỏe')}</Text>
          </View>

          {aiLoading ? (
            <View style={tw('items-center py-6')}>
              <ActivityIndicator size="large" color={twInstance.color('text-indigo-500')} />
              <Text style={tw('text-indigo-600/70 dark:text-indigo-400/70 mt-3 font-medium')}>
                {t('mobile.ai_analyzing', 'AI đang phân tích dữ liệu...')}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={tw('text-slate-700 dark:text-slate-300 leading-6 mb-4')}>
                {timeRange === '7d' 
                  ? t('mobile.report_7d_summary', 'Trong 7 ngày qua, chỉ số huyết áp của bạn khá ổn định ở mức trung bình 120/80 mmHg. Đường huyết có 1 lần vượt ngưỡng nhẹ vào sáng ngày thứ 3. Khuyến nghị duy trì chế độ ăn nhạt và tiếp tục theo dõi.')
                  : timeRange === '30d' 
                  ? t('mobile.report_30d_summary', 'Thống kê 30 ngày cho thấy xu hướng huyết áp tâm thu giảm nhẹ, đây là dấu hiệu tích cực từ việc tuân thủ uống thuốc. Tuy nhiên, tỷ lệ vận động đang thấp hơn tháng trước.')
                  : t('mobile.report_90d_summary', 'Dữ liệu 90 ngày cho thấy sự cải thiện rõ rệt. Các đợt tăng huyết áp khẩn cấp đã giảm 80%. Kế hoạch chăm sóc (Care Plan) hiện tại đang phát huy hiệu quả tốt.')}
              </Text>
              
              <TouchableOpacity style={tw('flex-row items-center gap-2 bg-indigo-100 dark:bg-indigo-800/50 px-4 py-2.5 rounded-xl self-start')}>
                <FileText color={twInstance.color('text-indigo-600 dark:text-indigo-300')} size={16} />
                <Text style={tw('text-indigo-700 dark:text-indigo-200 font-semibold')}>
                  {t('mobile.download_pdf', 'Tải báo cáo PDF')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
