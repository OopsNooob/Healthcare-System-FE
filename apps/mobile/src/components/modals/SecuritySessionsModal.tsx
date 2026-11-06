import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Shield, Smartphone, Laptop, LogOut, KeyRound, CheckCircle2, Trash2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

export interface ActiveSessionItem {
  id: string;
  deviceName: string;
  platform: 'mobile' | 'web';
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface SecuritySessionsModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateChangePassword?: () => void;
}

export const SecuritySessionsModal: React.FC<SecuritySessionsModalProps> = ({
  visible,
  onClose,
  onNavigateChangePassword,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');

  const [sessions, setSessions] = useState<ActiveSessionItem[]>([
    {
      id: 'sess-current-01',
      deviceName: 'Android Emulator / Pixel 8 Pro',
      platform: 'mobile',
      ipAddress: '113.161.72.14',
      location: 'Ho Chi Minh City, VN',
      lastActiveAt: isVi ? 'Vừa xong' : 'Just now',
      isCurrent: true,
    },
    {
      id: 'sess-web-02',
      deviceName: 'Chrome 130 • Windows 11',
      platform: 'web',
      ipAddress: '113.161.72.14',
      location: 'Ho Chi Minh City, VN',
      lastActiveAt: isVi ? '2 giờ trước' : '2 hours ago',
      isCurrent: false,
    },
    {
      id: 'sess-ios-03',
      deviceName: 'iPhone 15 • Healthcare App',
      platform: 'mobile',
      ipAddress: '27.68.19.104',
      location: 'Da Nang, VN',
      lastActiveAt: isVi ? '3 ngày trước' : '3 days ago',
      isCurrent: false,
    },
  ]);

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    Toast.show({
      type: 'success',
      text1: t('mobile.session_revoked_title', isVi ? 'Đã thu hồi phiên đăng nhập' : 'Session Revoked'),
      text2: t(
        'mobile.session_revoked_desc',
        isVi ? 'Thiết bị đã được đăng xuất khỏi tài khoản của bạn.' : 'The device has been signed out of your account.'
      ),
    });
  };

  const handleLogoutAllOther = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    Toast.show({
      type: 'info',
      text1: t('mobile.logout_all_sessions_title', isVi ? 'Đã đăng xuất các thiết bị khác' : 'Signed Out Other Devices'),
      text2: t(
        'mobile.logout_all_sessions_desc',
        isVi ? 'Toàn bộ phiên đăng nhập trên các thiết bị khác đã được thu hồi.' : 'All active sessions on other devices have been revoked.'
      ),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3')}>
                <Shield color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.security_sessions_title', isVi ? 'Bảo mật & Phiên đăng nhập' : 'Security & Active Sessions')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {isVi ? 'Quản lý mật khẩu và các thiết bị đang đăng nhập' : 'Manage password and signed-in devices'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Change Password Action */}
            {onNavigateChangePassword && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateChangePassword();
                }}
                style={tw('p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex-row items-center justify-between')}
              >
                <View style={tw('flex-row items-center flex-1 mr-3')}>
                  <View style={tw('w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mr-3')}>
                    <KeyRound color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                      {t('mobile.change_password', isVi ? 'Đổi mật khẩu' : 'Change Password')}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {t(
                        'mobile.change_password_desc',
                        isVi
                          ? 'Cập nhật mật khẩu và thu hồi các phiên đăng nhập cũ'
                          : 'Update your password and revoke older login sessions'
                      )}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Active Sessions Header */}
            <View style={tw('flex-row justify-between items-center mt-1')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                {t('mobile.active_sessions_list', isVi ? 'Thiết bị đang đăng nhập' : 'Signed-in Devices')} ({sessions.length})
              </Text>
              {sessions.length > 1 && (
                <TouchableOpacity onPress={handleLogoutAllOther}>
                  <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400')}>
                    {t('mobile.revoke_all_other', isVi ? 'Đăng xuất thiết bị khác' : 'Sign out other devices')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Session Items */}
            <View style={tw('gap-3')}>
              {sessions.map((session) => {
                const DeviceIcon = session.platform === 'mobile' ? Smartphone : Laptop;
                return (
                  <View
                    key={session.id}
                    style={tw(
                      `p-4 rounded-2xl border flex-row items-center justify-between ${
                        session.isCurrent
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`
                    )}
                  >
                    <View style={tw('flex-row items-center flex-1 mr-3')}>
                      <View style={tw('w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3')}>
                        <DeviceIcon color={twInstance.color('text-slate-700 dark:text-slate-300')} size={20} />
                      </View>
                      <View style={tw('flex-1')}>
                        <View style={tw('flex-row items-center flex-wrap gap-1.5')}>
                          <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>{session.deviceName}</Text>
                          {session.isCurrent && (
                            <View style={tw('bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full flex-row items-center')}>
                              <CheckCircle2 color="#10b981" size={11} />
                              <Text style={tw('text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ml-1')}>
                                {t('mobile.current_device', isVi ? 'Thiết bị này' : 'This device')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                          {session.location} • IP: {session.ipAddress}
                        </Text>
                        <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500 mt-0.5')}>
                          {t('mobile.last_active', isVi ? 'Hoạt động gần nhất' : 'Last active')}: {session.lastActiveAt}
                        </Text>
                      </View>
                    </View>
                    {!session.isCurrent && (
                      <TouchableOpacity
                        onPress={() => handleRevokeSession(session.id)}
                        style={tw('p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50')}
                      >
                        <Trash2 color="#ef4444" size={16} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}>
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>
                {t('mobile.close', isVi ? 'Đóng' : 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

