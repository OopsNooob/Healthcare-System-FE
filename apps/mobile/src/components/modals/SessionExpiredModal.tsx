import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LogOut } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

interface SessionExpiredModalProps {
  visible: boolean;
  onConfirm: () => void;
}

/**
 * Non-dismissible global modal displayed when the user's authentication session
 * expires or fails refresh so they are never stranded on protected mobile screens.
 */
export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  visible,
  onConfirm,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={tw('flex-1 justify-center items-center bg-black/70 px-5')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl'
          )}
        >
          <View
            style={tw(
              'p-5 items-center bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40'
            )}
          >
            <View
              style={tw(
                'w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 items-center justify-center mb-3'
              )}
            >
              <AlertTriangle size={28} color={twInstance.color('text-amber-600 dark:text-amber-400')} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.session_expired_title', 'Phiên đăng nhập đã hết hạn')}
            </Text>
          </View>

          <View style={tw('p-5 gap-3')}>
            <Text style={tw('text-sm text-slate-600 dark:text-slate-300 text-center leading-5')}>
              {t(
                'mobile.session_expired_desc',
                'Phiên đăng nhập của bạn đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.'
              )}
            </Text>

            <View
              style={tw(
                'bg-slate-50 dark:bg-slate-800/70 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 dark:border-slate-700/70'
              )}
            >
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center leading-4')}>
                {t(
                  'mobile.session_expired_note',
                  'Thông tin phiên cũ trên thiết bị đã được xóa để bảo vệ tài khoản của bạn.'
                )}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.85}
              style={tw(
                'mt-2 bg-slate-900 dark:bg-white py-3.5 px-4 rounded-2xl flex-row items-center justify-center shadow-sm'
              )}
            >
              <LogOut
                size={18}
                color={twInstance.color('text-white dark:text-slate-900')}
                style={tw('mr-2')}
              />
              <Text style={tw('text-white dark:text-slate-900 font-bold text-base')}>
                {t('mobile.session_expired_action', 'Đăng nhập lại')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

