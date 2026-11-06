import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  Image,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import {
  ArrowLeft,
  Users,
  Plus,
  Settings,
  X,
  CheckCircle2,
  UserX,
  PauseCircle,
  PlayCircle,
  MailOpen,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import Toast from 'react-native-toast-message';

interface ReceivedInvitation {
  id: string;
  inviterName: string;
  inviterEmail: string;
  inviterAvatar: string;
  relationship: string;
  consentVersion: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  permissions: {
    receiveReminders: boolean;
    viewProgress: boolean;
    viewAlertSummary: boolean;
  };
}

export default function FamilyCompanionScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const relationshipLabel = (rel: string) => {
    const map: Record<string, [string, string]> = {
      parent: ['Cha/Mẹ', 'Parent'],
      child: ['Con', 'Child'],
      spouse: ['Vợ/Chồng', 'Spouse'],
      sibling: ['Anh/Chị/Em', 'Sibling'],
      caregiver: ['Người chăm sóc', 'Caregiver'],
    };
    const entry = map[rel];
    return entry ? (isVi ? entry[0] : entry[1]) : rel;
  };

  const yesNo = (v: boolean) => (v ? (isVi ? 'Có' : 'Yes') : isVi ? 'Không' : 'No');
  useThemeContext();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'linked' | 'received'>('linked');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [relationship, setRelationship] = useState<string>('child');
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const [members, setMembers] = useState([
    {
      id: 1,
      name: 'Emily Watson',
      email: 'emily@example.com',
      relationship: 'child',
      consentVersion: 'family-consent.v1',
      avatar: 'https://i.pravatar.cc/150?img=5',
      permissions: {
        receiveReminders: true,
        viewProgress: true,
        viewAlertSummary: true,
      },
      status: 'active',
    },
    {
      id: 2,
      name: 'John Doe',
      email: 'john@example.com',
      relationship: 'child',
      consentVersion: 'family-consent.v1',
      avatar: 'https://i.pravatar.cc/150?img=11',
      permissions: {
        receiveReminders: true,
        viewProgress: false,
        viewAlertSummary: true,
      },
      status: 'pending',
    },
  ]);

  // Received Invitations (FAM-03, FAM-04)
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([
    {
      id: 'inv_201',
      inviterName: 'Robert Johnson',
      inviterEmail: 'robert.johnson@example.com',
      inviterAvatar: 'https://i.pravatar.cc/150?img=68',
      relationship: 'parent',
      consentVersion: 'family-consent.v1',
      expiresAt: '2026-11-12 23:59',
      status: 'pending',
      permissions: {
        receiveReminders: true,
        viewProgress: true,
        viewAlertSummary: true,
      },
    },
    {
      id: 'inv_202',
      inviterName: 'Mary Johnson',
      inviterEmail: 'mary.johnson@example.com',
      inviterAvatar: 'https://i.pravatar.cc/150?img=47',
      relationship: 'parent',
      consentVersion: 'family-consent.v1',
      expiresAt: '2026-10-25 23:59',
      status: 'accepted',
      permissions: {
        receiveReminders: true,
        viewProgress: true,
        viewAlertSummary: false,
      },
    },
  ]);

  const [acceptConsentChecked, setAcceptConsentChecked] = useState<Record<string, boolean>>({
    inv_201: true,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderSkeleton = () => (
    <View
      style={tw(
        'bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800 flex-row items-center shadow-sm'
      )}
    >
      <View style={tw('w-12 h-12 rounded-full mr-3 bg-slate-200 dark:bg-slate-700')} />
      <View style={tw('flex-1 justify-center')}>
        <View style={tw('w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-1/2 h-3 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
      <View style={tw('w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700')} />
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-10 px-6')}>
      <View
        style={tw(
          'w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4'
        )}
      >
        <Users color={twInstance.color('text-slate-400')} size={24} />
      </View>
      <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1')}>
        {t('mobile.no_members_found', 'Chưa có thành viên liên kết')}
      </Text>
      <Text style={tw('text-sm text-slate-500 text-center')}>
        {t(
          'mobile.invite_family_empty_state',
          'Mời người thân để nhận nhắc nhở nhiệm vụ và theo dõi tiến độ sức khỏe.'
        )}
      </Text>
    </View>
  );

  const handleInvite = () => {
    if (!emailToInvite.trim()) return;
    if (!consentConfirmed) {
      Toast.show({
        type: 'error',
        text1: t('mobile.consent_required', 'Yêu cầu xác nhận đồng thuận'),
        text2: t('mobile.consent_required_desc', 'Vui lòng tích chọn đồng ý chia sẻ dữ liệu.'
        ),
      });
      return;
    }

    const newMember = {
      id: Date.now(),
      name: `${emailToInvite.split('@')[0]} (${relationshipLabel(relationship)})`,
      email: emailToInvite.trim(),
      relationship,
      consentVersion: 'family-consent.v1',
      avatar: 'https://i.pravatar.cc/150?img=32',
      permissions: {
        receiveReminders: true,
        viewProgress: true,
        viewAlertSummary: true,
      },
      status: 'pending',
    };
    setMembers((prev) => [newMember, ...prev]);

    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Thành công'),
      text2: t('mobile.invite_sent', 'Đã gửi lời mời kèm xác nhận đồng thuận'),
    });
    setInviteModalVisible(false);
    setEmailToInvite('');
  };

  const handleAcceptInvitation = (invId: string) => {
    if (!acceptConsentChecked[invId]) {
      Toast.show({
        type: 'error',
        text1: t('mobile.consent_required', 'Cần xác nhận đồng thuận'),
        text2: t('mobile.accept_consent_desc', 'Vui lòng xác nhận đồng ý nhận thông báo đồng hành.'),
      });
      return;
    }
    setReceivedInvitations((prev) =>
      prev.map((inv) => (inv.id === invId ? { ...inv, status: 'accepted' } : inv))
    );
    Toast.show({
      type: 'success',
      text1: t('mobile.invitation_accepted', 'Đã chấp nhận lời mời'),
      text2: t('mobile.invitation_accepted_desc', 'Liên kết người thân đã được kích hoạt.'
      ),
    });
  };

  const handleDeclineInvitation = (invId: string) => {
    setReceivedInvitations((prev) =>
      prev.map((inv) => (inv.id === invId ? { ...inv, status: 'declined' } : inv))
    );
    Toast.show({
      type: 'info',
      text1: t('mobile.invitation_declined', 'Đã từ chối lời mời'),
      text2: t('mobile.invitation_declined_desc', 'Lời mời liên kết đã được từ chối.'),
    });
  };

  const handleRevoke = () => {
    setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
    setSettingsModalVisible(false);
    Toast.show({
      type: 'info',
      text1: t('mobile.access_revoked', 'Đã thu hồi quyền'),
      text2: t('mobile.member_removed', 'Liên kết thành viên gia đình đã chuyển sang revoked.'),
    });
  };

  const handlePauseResume = () => {
    const isPausing = selectedMember.status === 'active';
    const newStatus = isPausing ? 'paused' : 'active';

    setSelectedMember((prev: any) => ({ ...prev, status: newStatus }));
    setMembers((prev) =>
      prev.map((m) => (m.id === selectedMember.id ? { ...m, status: newStatus } : m))
    );

    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Đã cập nhật trạng thái'),
      text2: isPausing
        ? t('mobile.access_paused', 'Đã tạm dừng chia sẻ dữ liệu với người thân.')
        : t('mobile.access_resumed', 'Đã kích hoạt lại chia sẻ dữ liệu.'),
    });
  };

  const togglePermission = (key: 'receiveReminders' | 'viewProgress' | 'viewAlertSummary') => {
    setSelectedMember((prev: any) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === selectedMember.id) {
          return {
            ...m,
            permissions: {
              ...m.permissions,
              [key]: !m.permissions[key],
            },
          };
        }
        return m;
      })
    );
  };

  const pendingReceivedCount = receivedInvitations.filter((i) => i.status === 'pending').length;

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <View style={tw('flex-row justify-between items-center')}>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity
              onPress={() => router.back('/(patient)/profile')}
              style={tw('p-2 -ml-2 mr-2')}
            >
              <ArrowLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
            </TouchableOpacity>
            <View>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.family_companion', 'Family Companion')}
              </Text>
              <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                {t('mobile.share_health_updates', 'Chia sẻ tiến độ & nhận lời mời đồng hành')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs: Linked Members vs Received Invitations (FAM-03/04) */}
        <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mt-4')}>
          <TouchableOpacity
            onPress={() => setActiveTab('linked')}
            style={tw(
              `flex-1 py-2.5 rounded-xl items-center ${
                activeTab === 'linked' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
              }`
            )}
          >
            <Text
              style={tw(
                `text-xs font-bold ${
                  activeTab === 'linked'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              )}
            >
              {t('mobile.linked_members', 'Đã liên kết')} ({members.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('received')}
            style={tw(
              `flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
                activeTab === 'received' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
              }`
            )}
          >
            <Text
              style={tw(
                `text-xs font-bold ${
                  activeTab === 'received'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              )}
            >
              {t('mobile.received_invitations', 'Lời mời đã nhận')}
            </Text>
            {pendingReceivedCount > 0 && (
              <View style={tw('ml-1.5 bg-rose-500 px-1.5 py-0.5 rounded-full')}>
                <Text style={tw('text-[10px] font-bold text-white')}>{pendingReceivedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={twInstance.color('text-slate-900 dark:text-white')}
          />
        }
      >
        {/* Banner */}
        <View
          style={tw(
            'bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl mb-6 border border-indigo-100 dark:border-indigo-800/50 flex-row items-center'
          )}
        >
          <View
            style={tw(
              'w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full items-center justify-center mr-4'
            )}
          >
            <Users color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={24} />
          </View>
          <View style={tw('flex-1')}>
            <Text style={tw('font-bold text-indigo-900 dark:text-indigo-100 mb-1')}>
              {t('mobile.family_plan', 'Hạn mức gói PLUS: 2/3 Thành viên')}
            </Text>
            <Text style={tw('text-xs text-indigo-700 dark:text-indigo-300 leading-4')}>
              {t(
                'mobile.family_plan_desc',
                'Quy tắc quyền riêng tư: Người thân chỉ xem tiến độ & cảnh báo tổng quan, tuyệt đối không xem đoạn chat bác sĩ hay ghi chú lâm sàng.'
              )}
            </Text>
          </View>
        </View>

        {activeTab === 'linked' ? (
          <>
            {/* Add Button */}
            <TouchableOpacity
              onPress={() => setInviteModalVisible(true)}
              style={tw(
                'flex-row items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-2xl mb-6'
              )}
            >
              <Plus color={twInstance.color('text-slate-500')} size={20} />
              <Text style={tw('font-bold text-slate-600 dark:text-slate-400 ml-2')}>
                {t('mobile.invite_member', 'Mời thành viên gia đình')}
              </Text>
            </TouchableOpacity>

            <Text style={tw('font-bold text-lg text-slate-900 dark:text-white mb-4')}>
              {t('mobile.linked_members', 'Thành viên đã liên kết')}
            </Text>

            {loading ? (
              <>
                {renderSkeleton()}
                {renderSkeleton()}
              </>
            ) : members.length > 0 ? (
              members.map((member) => (
                <View
                  key={member.id}
                  style={tw(
                    'bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800 flex-row items-center shadow-sm'
                  )}
                >
                  <Image
                    source={{ uri: member.avatar }}
                    style={tw('w-12 h-12 rounded-full mr-3 bg-slate-200 dark:bg-slate-800')}
                  />
                  <View style={tw('flex-1')}>
                    <Text
                      style={tw('font-bold text-slate-900 dark:text-white text-base')}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {member.email} • {member.consentVersion}
                    </Text>
                    <View style={tw('flex-row items-center mt-1.5')}>
                      {member.status === 'active' ? (
                        <View style={tw('flex-row items-center')}>
                          <CheckCircle2 color="#10b981" size={14} />
                          <Text
                            style={tw(
                              'text-emerald-600 dark:text-emerald-400 text-xs font-semibold ml-1'
                            )}
                          >
                            {t('mobile.active', 'Đang hoạt động')}
                          </Text>
                        </View>
                      ) : member.status === 'paused' ? (
                        <View style={tw('flex-row items-center')}>
                          <PauseCircle color="#f59e0b" size={14} />
                          <Text
                            style={tw(
                              'text-amber-500 dark:text-amber-400 text-xs font-semibold ml-1'
                            )}
                          >
                            {t('mobile.paused', 'Tạm dừng')}
                          </Text>
                        </View>
                      ) : (
                        <View style={tw('flex-row items-center')}>
                          <Text
                            style={tw('text-amber-500 dark:text-amber-400 text-xs font-semibold')}
                          >
                            {t('mobile.pending_invite', 'Chờ người thân xác nhận')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedMember(member);
                      setSettingsModalVisible(true);
                    }}
                    style={tw('p-2.5 bg-slate-50 dark:bg-slate-800 rounded-full')}
                  >
                    <Settings
                      color={twInstance.color('text-slate-500 dark:text-slate-400')}
                      size={20}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              renderEmptyState()
            )}
          </>
        ) : (
          /* Received Invitations Tab (FAM-03, FAM-04) */
          <View>
            <Text style={tw('font-bold text-lg text-slate-900 dark:text-white mb-4')}>
              {t('mobile.received_invitations', 'Lời mời đồng hành gửi đến bạn')}
            </Text>

            {receivedInvitations.map((inv) => (
              <View
                key={inv.id}
                style={tw(
                  'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 border border-slate-200 dark:border-slate-800 shadow-sm'
                )}
              >
                <View style={tw('flex-row items-center mb-3')}>
                  <Image
                    source={{ uri: inv.inviterAvatar }}
                    style={tw('w-12 h-12 rounded-full mr-3 bg-slate-200 dark:bg-slate-800')}
                  />
                  <View style={tw('flex-1')}>
                    <Text style={tw('font-bold text-slate-900 dark:text-white text-base')}>
                      {inv.inviterName}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {inv.inviterEmail} • {isVi ? 'Quan hệ' : 'Relationship'}: {relationshipLabel(inv.relationship)}
                    </Text>
                  </View>
                  <View
                    style={tw(
                      `px-2.5 py-1 rounded-full ${
                        inv.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : inv.status === 'accepted'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-slate-200 dark:bg-slate-800'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-[10px] font-bold uppercase ${
                          inv.status === 'pending'
                            ? 'text-amber-700 dark:text-amber-400'
                            : inv.status === 'accepted'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-400'
                        }`
                      )}
                    >
                      {inv.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800'
                  )}
                >
                  <Text
                    style={tw(
                      'text-xs font-bold text-slate-700 dark:text-slate-300 mb-2'
                    )}
                  >
                    {isVi ? 'Quyền hạn được cấp cho bạn:' : 'Permissions granted to you:'}
                  </Text>
                  <View style={tw('gap-1.5')}>
                    <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                      • {isVi ? 'Nhận thông báo nhắc nhở' : 'Receive reminders'}:{' '}
                      {yesNo(inv.permissions.receiveReminders)}
                    </Text>
                    <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                      • {isVi ? 'Xem tiến độ nhiệm vụ chăm sóc' : 'View care task progress'}:{' '}
                      {yesNo(inv.permissions.viewProgress)}
                    </Text>
                    <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                      • {isVi ? 'Xem tóm tắt cảnh báo sức khỏe' : 'View health alert summary'}:{' '}
                      {yesNo(inv.permissions.viewAlertSummary)}
                    </Text>
                  </View>
                </View>

                {inv.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      onPress={() =>
                        setAcceptConsentChecked((prev) => ({
                          ...prev,
                          [inv.id]: !prev[inv.id],
                        }))
                      }
                      style={tw('flex-row items-center mb-4')}
                    >
                      <View
                        style={tw(
                          `w-5 h-5 rounded-md border items-center justify-center mr-2.5 ${
                            acceptConsentChecked[inv.id]
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-400 dark:border-slate-600'
                          }`
                        )}
                      >
                        {acceptConsentChecked[inv.id] && <Check size={14} color="#fff" />}
                      </View>
                      <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1')}>
                        {isVi
                          ? 'Tôi xác nhận đồng thuận nhận thông tin đồng hành từ người thân.'
                          : 'I consent to receive companion information from this family member.'}
                      </Text>
                    </TouchableOpacity>

                    <View style={tw('flex-row gap-3')}>
                      <TouchableOpacity
                        onPress={() => handleDeclineInvitation(inv.id)}
                        style={tw(
                          'flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center'
                        )}
                      >
                        <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-xs')}>
                          {t('mobile.decline_invitation', 'Từ chối')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleAcceptInvitation(inv.id)}
                        style={tw('flex-1 py-3 rounded-xl bg-emerald-600 items-center')}
                      >
                        <Text style={tw('font-bold text-white text-xs')}>
                          {t('mobile.accept_invitation', 'Chấp nhận')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Invite Modal (FAM-01) */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-5')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.invite_member', 'Mời thành viên')}
              </Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={24} />
              </TouchableOpacity>
            </View>

            <View style={tw('mb-4')}>
              <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
                {t('mobile.email_address', 'Email tài khoản Bệnh nhân của người thân')}
              </Text>
              <TextInput
                value={emailToInvite}
                onChangeText={setEmailToInvite}
                placeholder="family@example.com"
                placeholderTextColor="#94a3b8"
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium'
                )}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={tw('mb-4')}>
              <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
                {t('mobile.relationship', 'Mối quan hệ')}
              </Text>
              <View style={tw('flex-row flex-wrap gap-2')}>
                {(['parent', 'child', 'spouse', 'sibling', 'caregiver'] as const).map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    onPress={() => setRelationship(rel)}
                    style={tw(
                      `px-3 py-1.5 rounded-xl border ${
                        relationship === rel
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold uppercase ${
                          relationship === rel
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`
                      )}
                    >
                      {relationshipLabel(rel)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Explicit Consent Checkbox (FAM-01) */}
            <TouchableOpacity
              onPress={() => setConsentConfirmed(!consentConfirmed)}
              style={tw(
                'flex-row items-start bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 mb-4'
              )}
            >
              <View
                style={tw(
                  `w-5 h-5 rounded-md border items-center justify-center mr-2.5 mt-0.5 ${
                    consentConfirmed
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-slate-400 dark:border-slate-600'
                  }`
                )}
              >
                {consentConfirmed && <Check size={14} color="#fff" />}
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-xs font-bold text-emerald-900 dark:text-emerald-200')}>
                  {isVi ? 'Xác nhận đồng thuận chia sẻ dữ liệu' : 'Confirm consent to share data'}
                </Text>
                <Text style={tw('text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5')}>
                  {isVi
                    ? 'Tôi đồng ý cho người thân xem tiến độ nhiệm vụ và cảnh báo sức khỏe đã chọn. Không chia sẻ tin nhắn tư vấn bác sĩ.'
                    : 'I agree to let my family member see my task progress and the selected health alerts. Doctor consultation messages are never shared.'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleInvite}
              style={tw('bg-brand py-4 rounded-xl items-center mt-1')}
            >
              <Text style={tw('text-slate-900 font-bold text-base')}>
                {t('mobile.send_invite', 'Gửi lời mời liên kết')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings/Permissions Modal */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent={true}>
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.member_permissions', 'Quyền hạn thành viên')}
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={24} />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <View>
                <View style={tw('flex-row items-center mb-6')}>
                  <Image
                    source={{ uri: selectedMember.avatar }}
                    style={tw('w-10 h-10 rounded-full mr-3 bg-slate-200 dark:bg-slate-800')}
                  />
                  <View>
                    <Text
                      style={tw('font-bold text-slate-900 dark:text-white text-base')}
                      numberOfLines={1}
                    >
                      {selectedMember.name}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {relationshipLabel(selectedMember.relationship)}
                    </Text>
                  </View>
                </View>

                {/* Toggles */}
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-6'
                  )}
                >
                  <View style={tw('flex-row justify-between items-center mb-4')}>
                    <View style={tw('flex-1 pr-4')}>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>
                        {t('mobile.receive_reminders', 'Nhận thông báo nhắc nhở (receiveReminders)')}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                        {t(
                          'mobile.receive_reminders_desc',
                          'Gửi thông báo đẩy nếu bạn bỏ lỡ nhiệm vụ đo chỉ số / uống thuốc'
                        )}
                      </Text>
                    </View>
                    <Switch
                      value={selectedMember.permissions.receiveReminders}
                      onValueChange={() => togglePermission('receiveReminders')}
                      trackColor={{
                        false: twInstance.color('slate-300'),
                        true: twInstance.color('emerald-500'),
                      }}
                    />
                  </View>

                  <View style={tw('w-full h-[1px] bg-slate-200 dark:bg-slate-800 mb-4')} />

                  <View style={tw('flex-row justify-between items-center mb-4')}>
                    <View style={tw('flex-1 pr-4')}>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>
                        {t('mobile.view_progress', 'Xem tiến độ chăm sóc (viewCareProgress)')}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                        {t(
                          'mobile.view_progress_desc',
                          'Cho phép xem tỷ lệ tuân thủ và chỉ số sức khỏe tổng quát'
                        )}
                      </Text>
                    </View>
                    <Switch
                      value={selectedMember.permissions.viewProgress}
                      onValueChange={() => togglePermission('viewProgress')}
                      trackColor={{
                        false: twInstance.color('slate-300'),
                        true: twInstance.color('emerald-500'),
                      }}
                    />
                  </View>

                  <View style={tw('w-full h-[1px] bg-slate-200 dark:bg-slate-800 mb-4')} />

                  <View style={tw('flex-row justify-between items-center')}>
                    <View style={tw('flex-1 pr-4')}>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>
                        {t('mobile.view_alert_summary', 'Xem tóm tắt cảnh báo')}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                        {t('mobile.view_alert_summary_desc', 'Cho phép xem thông báo khi chỉ số vượt ngưỡng an toàn'
                        )}
                      </Text>
                    </View>
                    <Switch
                      value={Boolean(selectedMember.permissions.viewAlertSummary)}
                      onValueChange={() => togglePermission('viewAlertSummary')}
                      trackColor={{
                        false: twInstance.color('slate-300'),
                        true: twInstance.color('emerald-500'),
                      }}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={tw('flex-row gap-3')}>
                  {selectedMember.status !== 'pending' && (
                    <TouchableOpacity
                      onPress={handlePauseResume}
                      style={tw(
                        `flex-1 flex-row items-center justify-center py-4 rounded-xl ${
                          selectedMember.status === 'active'
                            ? 'bg-amber-50 dark:bg-amber-900/20'
                            : 'bg-emerald-50 dark:bg-emerald-900/20'
                        }`
                      )}
                    >
                      {selectedMember.status === 'active' ? (
                        <>
                          <PauseCircle color={twInstance.color('text-amber-600')} size={20} />
                          <Text style={tw('text-amber-700 dark:text-amber-500 font-bold ml-2')}>
                            {t('mobile.pause_access', 'Tạm dừng')}
                          </Text>
                        </>
                      ) : (
                        <>
                          <PlayCircle color={twInstance.color('text-emerald-600')} size={20} />
                          <Text style={tw('text-emerald-700 dark:text-emerald-500 font-bold ml-2')}>
                            {t('mobile.resume_access', 'Tiếp tục')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleRevoke}
                    style={tw(
                      'flex-1 flex-row items-center justify-center py-4 bg-red-50 dark:bg-red-900/20 rounded-xl'
                    )}
                  >
                    <UserX color={twInstance.color('text-red-500')} size={20} />
                    <Text style={tw('text-red-600 dark:text-red-400 font-bold ml-2')}>
                      {t('mobile.revoke_access', 'Thu hồi')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
