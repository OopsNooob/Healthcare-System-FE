import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { ArrowLeft, LineChart, Sparkles, Activity, FileSpreadsheet, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { ReportExportModal } from '@/components/modals';

const AiSummaryAccordion = ({ title, content, isEmpty }: { title: string, content: string, isEmpty?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  
  if (isEmpty) {
    return (
      <View style={tw('bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-3 opacity-60 flex-row justify-between items-center')}>
        <Text style={tw('font-semibold text-slate-500 dark:text-slate-400')}>{title}</Text>
        <Text style={tw('text-slate-400 dark:text-slate-500 text-sm')}>{t('mobile.ai_no_data', 'No Data')}</Text>
      </View>
    );
  }

  return (
    <View style={tw('bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-3 overflow-hidden')}>
      <TouchableOpacity 
        style={tw('p-4 flex-row justify-between items-center')} 
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={tw('font-semibold text-slate-800 dark:text-slate-200')}>{title}</Text>
        {expanded ? (
          <ChevronUp color={twInstance.color('text-slate-400')} size={20} />
        ) : (
          <ChevronDown color={twInstance.color('text-slate-400')} size={20} />
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={tw('px-4 pb-4')}>
          <Text style={tw('text-slate-600 dark:text-slate-300 leading-5')}>{content}</Text>
        </View>
      )}
    </View>
  );
};

export default function ReportsScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  useThemeContext();
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [aiLoading, setAiLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

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
        <TouchableOpacity onPress={() => router.back('/(patient)/health-metric')} style={tw('p-2 -ml-2 mr-2')}>
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
        </TouchableOpacity>
        <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.health_reports', 'Health Reports')}</Text>
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
              style={tw(`flex-1 py-2.5 px-1 items-center justify-center rounded-lg ${timeRange === range ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
            >
              <Text 
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.75}
                style={tw(`font-semibold text-center ${timeRange === range ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}
              >
                {range === '7d' 
                  ? (isVi ? '7\u00A0Ngày' : '7\u00A0Days') 
                  : range === '30d' 
                  ? (isVi ? '30\u00A0Ngày' : '30\u00A0Days') 
                  : (isVi ? '90\u00A0Ngày' : '90\u00A0Days')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Mockup */}
        <View style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6')}>
          <View style={tw('flex-row justify-between items-center mb-4')}>
            <View style={tw('flex-row items-center gap-2')}>
              <Activity color={twInstance.color('text-emerald-500')} size={20} />
              <Text style={tw('font-bold text-slate-900 dark:text-white text-lg')}>{t('mobile.blood_pressure_trend', 'Blood Pressure Trend')}</Text>
            </View>
            <LineChart color={twInstance.color('text-slate-400')} size={20} />
          </View>
          
          <View style={tw('h-48 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800')}>
            {/* Fake Chart Lines */}
            <View style={tw('absolute bottom-4 left-4 right-4 h-32 border-b border-l border-slate-300 dark:border-slate-700')} />
            <Text style={tw('text-slate-400 dark:text-slate-600 font-medium text-center px-4')}>{t('mobile.chart_data_placeholder', '[Line Chart data displays here]')}</Text>
          </View>
        </View>

        {/* AI Summary Section (DA2) */}
        <View style={tw('bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm')}>
          <View style={tw('flex-row items-center gap-2 mb-4')}>
            <Sparkles color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
            <Text style={tw('font-bold text-indigo-900 dark:text-indigo-100 text-lg')}>{t('mobile.ai_health_summary', 'AI Health Summary')}</Text>
          </View>

          {aiLoading ? (
            <View style={tw('items-center py-6')}>
              <ActivityIndicator size="large" color={twInstance.color('text-indigo-500')} />
              <Text style={tw('text-indigo-600/70 dark:text-indigo-400/70 mt-3 font-medium')}>
                {t('mobile.ai_analyzing', 'AI is analyzing your data...')}
              </Text>
            </View>
          ) : (
            <View>
              {/* Fallback condition can be simulated by changing a state, here we assume it's generated */}
              <Text style={tw('text-slate-700 dark:text-slate-300 leading-6 mb-5')}>
                {timeRange === '7d' 
                  ? t('mobile.report_7d_summary', 'In the past 7 days, your blood pressure has been quite stable at an average of 120/80 mmHg. Blood sugar exceeded the threshold slightly on the morning of day 3. It is recommended to maintain a low-sodium diet and continue monitoring.')
                  : timeRange === '30d' 
                  ? t('mobile.report_30d_summary', 'The 30-day statistics show a slight downward trend in systolic blood pressure, which is a positive sign from medication adherence. However, the exercise rate is lower than last month.')
                  : t('mobile.report_90d_summary', 'The 90-day data shows significant improvement. Emergency hypertensive episodes have decreased by 80%. The current Care Plan is working effectively.')}
              </Text>
              
              <AiSummaryAccordion 
                title={t('mobile.ai_observations', 'Observations')} 
                content="Blood pressure peak observed at 8 AM consistently." 
              />
              <AiSummaryAccordion 
                title={t('mobile.ai_missing_data', 'Missing Data')} 
                content="" 
                isEmpty={true}
              />
              <AiSummaryAccordion 
                title={t('mobile.ai_alerts_to_mention', 'Alerts to Mention')} 
                content="1 attention alert regarding high blood sugar on Tuesday." 
              />
              <AiSummaryAccordion 
                title={t('mobile.ai_questions_for_doctor', 'Questions for Doctor')} 
                content="Is it normal to feel dizzy after taking the new medication?" 
              />
              
              <View style={tw('bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 flex-row mt-2 mb-5')}>
                <AlertTriangle color={twInstance.color('text-amber-500')} size={20} style={tw('mr-3 mt-0.5')} />
                <Text style={tw('text-amber-800 dark:text-amber-200 text-sm flex-1 leading-5')}>
                  {t('mobile.ai_disclaimer', 'Disclaimer: This is AI-generated analysis and does not replace professional medical advice.')}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={() => setExportModalVisible(true)}
                style={tw('flex-row items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-3.5 rounded-xl active:opacity-80')}
              >
                <FileSpreadsheet color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={18} />
                <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold')}>
                  {t('mobile.export_excel_report', 'Xuất Báo Cáo Excel')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      <ReportExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        defaultTimeRange={timeRange}
      />
    </SafeAreaView>
  );
}
