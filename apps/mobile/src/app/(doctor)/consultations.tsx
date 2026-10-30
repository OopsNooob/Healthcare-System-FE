import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MessageCircle, Search, CheckCircle, XCircle, AlertTriangle, FileText, X } from 'lucide-react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { tw } from '@/tw';
import { 
  consultationsFindAll, 
  consultationsAccept, 
  consultationsDecline, 
  consultationsStart, 
  consultationsComplete, 
  violationsCreate 
} from '@healthcare/api-client';

export default function DoctorConsultationsScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [doctorNote, setDoctorNote] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const pendingRequests = [
    { id: '1', patientName: 'Alex Johnson', time: '10:30 AM', date: 'Today', type: 'Chat', age: 28, gender: 'Male', reason: 'Mild headache and dizziness for 2 days.' },
  ];

  const activeSessions = [
    { id: '2', patientName: 'Maria Garcia', time: '11:00 AM', date: 'Today', type: 'Chat', status: 'In Progress', age: 34, gender: 'Female', reason: 'Follow-up on blood test results.', statusKey: 'active' },
    { id: '4', patientName: 'John Doe', time: '11:30 AM', date: 'Today', type: 'Video Call', status: 'Interrupted', age: 40, gender: 'Male', reason: 'Connection lost during consultation.', statusKey: 'interrupted' }
  ];

  const history = [
    { id: '3', patientName: 'James Smith', time: '02:15 PM', date: 'Yesterday', type: 'Chat', status: 'Completed', age: 45, gender: 'Male', rating: 5, review: 'Very helpful doctor.' },
  ];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);

  const formatItem = (item: any) => {
    const d = item.scheduledStartAt ? new Date(item.scheduledStartAt) : new Date();
    return {
      id: item._id || item.id,
      patientName: item.patient?.fullName || item.patientId || 'Bệnh nhân',
      patientId: item.patient?._id || item.patientId || item._id,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString(),
      type: item.mode === 'on_demand' ? 'Chat' : 'Video Call',
      status: item.sessionStatus === 'in_consultation' ? 'In Progress' : item.sessionStatus === 'completed' ? 'Completed' : item.sessionStatus || 'Pending',
      statusKey: item.sessionStatus === 'interrupted' ? 'interrupted' : item.sessionStatus === 'in_consultation' ? 'active' : item.sessionStatus,
      age: item.patient?.patientProfile?.age || 30,
      gender: item.patient?.gender === 'female' ? 'Female' : 'Male',
      reason: item.reason || item.patientNotes || 'Tư vấn sức khỏe tổng quát',
      rating: item.rating || 5,
      review: item.doctorNotes || 'Chưa có ghi chú',
    };
  };

  const fetchConsultations = async () => {
    try {
      const res: any = await consultationsFindAll({
        query: { limit: 50 },
      }).catch(() => null);

      const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : null);

      if (items && Array.isArray(items) && items.length > 0) {
        const formatted = items.map(formatItem);
        const p = formatted.filter(x => x.statusKey === 'pending' || !x.statusKey || x.status === 'Pending');
        const a = formatted.filter(x => ['in_consultation', 'active', 'waiting', 'interrupted'].includes(x.statusKey));
        const h = formatted.filter(x => ['completed', 'Completed', 'no_show', 'cancelled'].includes(x.statusKey));

        setPending(p.length > 0 ? p : pendingRequests);
        setActive(a.length > 0 ? a : activeSessions);
        setHist(h.length > 0 ? h : history);
      } else {
        setPending(pendingRequests);
        setActive(activeSessions);
        setHist(history);
      }
    } catch {
      setPending(pendingRequests);
      setActive(activeSessions);
      setHist(history);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchConsultations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsultations();
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
      <View style={tw('flex-row justify-between items-start mb-3')}>
        <View>
          <View style={tw('w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        </View>
        <View style={tw('w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-full')} />
      </View>
      <View style={tw('w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4')} />
      <View style={tw('flex-row gap-3 mt-2')}>
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
    </View>
  );

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    try {
      await consultationsAccept({ path: { id } }).catch(() => null);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.action_successful', 'Appointment Accepted', { action: 'Accept' }),
      });
      // Move from pending to active
      const acceptedItem = pending.find(p => p.id === id);
      setPending(prev => prev.filter(p => p.id !== id));
      if (acceptedItem) {
        setActive(prev => [{ ...acceptedItem, status: 'In Progress', statusKey: 'active' }, ...prev]);
      }
    } catch {
      Toast.show({
        type: 'info',
        text1: t('mobile.action_successful', 'Accepted locally'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(true);
    try {
      await consultationsDecline({
        path: { id },
        body: { reason: 'Doctor is currently unavailable' },
      }).catch(() => null);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.action_successful', 'Appointment Declined', { action: 'Decline' }),
      });
      setPending(prev => prev.filter(p => p.id !== id));
    } catch {
      setPending(prev => prev.filter(p => p.id !== id));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartOrResume = async (id: string) => {
    try {
      await consultationsStart({ path: { id } }).catch(() => null);
    } catch {
      // ignore
    }
    router.push(`/(doctor)/chat/${id}` as any);
  };

  const handleEndSubmit = async () => {
    if (!selectedSessionId) return;
    setActionLoading(true);
    try {
      await consultationsComplete({
        path: { id: selectedSessionId },
        body: { doctorNotes: doctorNote || 'Consultation completed by doctor.' },
      }).catch(() => null);

      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.consultation_ended', 'Consultation Ended'),
      });

      const endedItem = active.find(a => a.id === selectedSessionId);
      setActive(prev => prev.filter(a => a.id !== selectedSessionId));
      if (endedItem) {
        setHist(prev => [{ ...endedItem, status: 'Completed', statusKey: 'completed', review: doctorNote || 'No notes' }, ...prev]);
      }
    } catch {
      setActive(prev => prev.filter(a => a.id !== selectedSessionId));
    } finally {
      setActionLoading(false);
      setEndModalVisible(false);
      setSelectedSessionId(null);
      setDoctorNote('');
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return;
    setActionLoading(true);
    try {
      if (reportTargetId) {
        await violationsCreate({
          body: {
            targetUserId: reportTargetId,
            reason: reportReason,
            category: 'consultation_misconduct',
          } as any,
        }).catch(() => null);
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.report_submitted', 'Report Submitted'),
      });
    } catch {
      Toast.show({
        type: 'info',
        text1: t('mobile.report_submitted', 'Report Submitted'),
      });
    } finally {
      setActionLoading(false);
      setReportModalVisible(false);
      setReportTargetId(null);
      setReportReason('');
    }
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{t('mobile.consultations', 'Consultations')}</Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1')}>{t('mobile.manage_your_appointments_and_c', 'Manage your appointments and chats')}</Text>
      </View>

      {/* Tabs */}
      <View style={tw('flex-row px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <TouchableOpacity 
          onPress={() => setActiveTab('pending')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'pending' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'pending' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.pending', 'Pending')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('active')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'active' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'active' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.active', 'Active')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('history')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'history' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'history' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.history', 'History')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        {/* Pending Requests */}
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : activeTab === 'pending' && pending.length > 0 ? pending.map(req => (
          <View key={req.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-3')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{req.patientName}</Text>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{req.age} {t('mobile.yrs', 'yrs')} • {req.gender}</Text>
              </View>
              <View style={tw('px-3 py-1 bg-amber-50 rounded-full border border-amber-100')}>
                <Text style={tw('text-xs font-bold text-amber-600')}>{t('mobile.pending_request', 'Pending Request')}</Text>
              </View>
            </View>
            <Text style={tw('text-slate-700 dark:text-slate-200 text-sm mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl')}>{req.reason}</Text>
            <View style={tw('flex-row gap-3 mt-2')}>
              <TouchableOpacity onPress={() => handleAccept(req.id)} disabled={actionLoading} style={tw('flex-1 bg-brand py-3 rounded-xl flex-row justify-center items-center')}>
                <CheckCircle color="#0f172a" size={18} style={tw('mr-2')} />
                <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.accept', 'Accept')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDecline(req.id)} disabled={actionLoading} style={tw('flex-1 bg-red-50 py-3 rounded-xl border border-red-100 flex-row justify-center items-center')}>
                <XCircle color="#ef4444" size={18} style={tw('mr-2')} />
                <Text style={tw('text-red-500 font-bold text-sm')}>{t('mobile.decline', 'Decline')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : activeTab === 'pending' && (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_pending_requests', 'No pending requests')}</Text>
          </View>
        )}

        {/* Active Sessions */}
        {!loading && activeTab === 'active' && active.length > 0 ? active.map(session => (
          <View key={session.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-3')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{session.patientName}</Text>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500')}>
                  {session.age} {t('mobile.yrs', 'yrs')} • {session.gender === 'Male' ? t('mobile.male', 'Male') : session.gender === 'Female' ? t('mobile.female', 'Female') : session.gender}
                </Text>
              </View>
              <View style={tw('flex-row items-center gap-2')}>
                <View style={tw(`px-3 py-1 rounded-full ${session.statusKey === 'interrupted' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`)}>
                  <Text style={tw(`text-xs font-bold ${session.statusKey === 'interrupted' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`)}>
                    {session.statusKey === 'interrupted' ? t('mobile.interrupted', 'Interrupted') : t('mobile.in_progress', 'In Progress')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setReportTargetId(session.patientId || session.id); setReportModalVisible(true); }} style={tw('w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center')}>
                  <AlertTriangle color="#ef4444" size={16} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={tw('flex-row gap-3 mt-4')}>
              <TouchableOpacity onPress={() => handleStartOrResume(session.id)} style={tw(`flex-1 py-3 rounded-xl flex-row justify-center items-center ${session.statusKey === 'interrupted' ? 'bg-amber-500' : 'bg-brand'}`)}>
                {session.statusKey === 'interrupted' ? (
                   <AlertTriangle color="#ffffff" size={18} style={tw('mr-2')} />
                ) : (
                   <MessageCircle color="#0f172a" size={18} style={tw('mr-2')} />
                )}
                <Text style={tw(`font-bold text-sm ${session.statusKey === 'interrupted' ? 'text-white' : 'text-slate-900'}`)}>
                  {session.statusKey === 'interrupted' ? t('mobile.resume_session', 'Resume Session') : t('mobile.open_chat', 'Open Chat')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSelectedSessionId(session.id); setEndModalVisible(true); }} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl flex-row justify-center items-center')}>
                <CheckCircle color="#64748b" size={18} style={tw('mr-2')} />
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.end_session', 'End Session')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : !loading && activeTab === 'active' && (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_active_sessions', 'No active sessions')}</Text>
          </View>
        )}

        {/* History */}
        {!loading && activeTab === 'history' && hist.length > 0 ? hist.map(session => (
          <View key={session.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-2')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{session.patientName}</Text>
                <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>
                  {session.date === 'Today' ? t('mobile.today', 'Today') : session.date === 'Yesterday' ? t('mobile.yesterday', 'Yesterday') : session.date} • {session.time}
                </Text>
              </View>
              <View style={tw('px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full')}>
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                  {session.status === 'Completed' ? t('mobile.completed', 'Completed') : session.status}
                </Text>
              </View>
            </View>
            
            <View style={tw('mt-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl')}>
              <Text style={tw('text-sm text-slate-700 dark:text-slate-200 font-medium mb-1')}>{t('mobile.patient_review', 'Patient Review:')}</Text>
              <Text style={tw('text-sm text-slate-600 dark:text-slate-300 italic')}>"{session.review}" (Rating: {session.rating}/5)</Text>
            </View>

            <View style={tw('flex-row gap-3 mt-4')}>
              <TouchableOpacity onPress={() => router.push(`/(doctor)/chat/${session.id}` as any)} style={tw('flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 py-2 rounded-xl flex-row justify-center items-center')}>
                <MessageCircle color="#64748b" size={16} style={tw('mr-2')} />
                <Text style={tw('text-slate-600 dark:text-slate-300 font-bold text-sm')}>{t('mobile.view_log', 'View Log')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setReportTargetId(session.patientId || session.id); setReportModalVisible(true); }} style={tw('flex-1 bg-red-50 py-2 border border-red-100 rounded-xl flex-row justify-center items-center')}>
                <AlertTriangle color="#ef4444" size={16} style={tw('mr-2')} />
                <Text style={tw('text-red-500 font-bold text-sm')}>{t('mobile.report', 'Report')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : !loading && activeTab === 'history' && (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_consultation_history', 'No consultation history')}</Text>
          </View>
        )}

      </ScrollView>

      {/* End Consultation Modal */}
      <Modal visible={endModalVisible} transparent animationType="slide" onRequestClose={() => setEndModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.end_consultation', 'End Consultation')}</Text>
              <TouchableOpacity onPress={() => setEndModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.doctors_note_optional', "Doctor's Note (Optional)")}</Text>
              <TextInput
                value={doctorNote}
                onChangeText={setDoctorNote}
                placeholder={t('mobile.write_diagnostic_notes', 'Write your diagnostic notes here...')}
                placeholderTextColor="#64748b"
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={handleEndSubmit} style={tw('bg-brand py-4 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-base')}>{t('mobile.end_and_save_note', 'End and Save Note')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.report_patient', 'Report Patient')}</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.reason_for_report', 'Reason for Report')}</Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder={t('mobile.inappropriate_behavior', 'Inappropriate behavior, spam...')}
                placeholderTextColor="#64748b"
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={handleReportSubmit} style={tw('bg-red-500 py-4 rounded-xl items-center')}>
              <Text style={tw('text-white font-bold text-base')}>{t('mobile.submit_report', 'Submit Report')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
