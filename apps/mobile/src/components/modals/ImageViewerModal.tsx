import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Download, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tw } from '@/tw';
import { downloadMediaFileToDevice, shareMediaFile } from '@/services/nativeMedia';

interface ImageViewerModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri?: string;
  imageName?: string;
  imageSize?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  onClose,
  imageUri,
  imageName = 'Medical_Image.jpg',
  imageSize = '2.1 MB',
}) => {
  const { t } = useTranslation();
  const screenHeight = Dimensions.get('window').height;
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!imageUri) return null;

  const mimeType = imageName?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const handleDownload = async () => {
    if (!imageUri || isDownloading || isSharing) return;
    setIsDownloading(true);
    try {
      await downloadMediaFileToDevice({
        uri: imageUri,
        fileName: imageName || `Medical_Image_${Date.now()}.jpg`,
        mimeType,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!imageUri || isSharing || isDownloading) return;
    setIsSharing(true);
    try {
      await shareMediaFile({
        uri: imageUri,
        fileName: imageName || `Medical_Image_${Date.now()}.jpg`,
        mimeType,
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 bg-black/95 justify-between')}>
        {/* Top Bar */}
        <SafeAreaView style={tw('bg-black/60 z-10 border-b border-white/10')}>
          <View style={tw('flex-row items-center justify-between px-5 py-3')}>
            <View style={tw('flex-1 mr-3')}>
              <Text style={tw('text-white font-bold text-base')} numberOfLines={1}>
                {imageName}
              </Text>
              <Text style={tw('text-slate-400 text-xs')}>
                {imageSize} • {t('mobile.images', 'Medical Photo')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw('w-10 h-10 rounded-full bg-white/20 items-center justify-center active:opacity-70')}
            >
              <X color="#ffffff" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Image Content */}
        <View style={tw('flex-1 items-center justify-center p-2')}>
          <Image
            source={{ uri: imageUri }}
            style={{
              width: '100%',
              height: screenHeight * 0.68,
            }}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Bar Actions */}
        <SafeAreaView style={tw('bg-black/75 border-t border-white/10')}>
          <View style={tw('px-5 pt-3 pb-4 gap-3')}>
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity
                onPress={handleShare}
                disabled={isSharing || isDownloading}
                style={tw(
                  `flex-1 py-3 rounded-xl bg-white/15 border border-white/20 items-center flex-row justify-center ${
                    isSharing || isDownloading ? 'opacity-60' : ''
                  }`
                )}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#ffffff" style={tw('mr-2')} />
                ) : (
                  <Share2 color="#ffffff" size={16} style={tw('mr-2')} />
                )}
                <Text style={tw('text-white font-bold text-sm')}>
                  {t('mobile.share_or_open', 'Mở / Chia sẻ')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDownload}
                disabled={isDownloading || isSharing}
                style={tw(
                  `flex-1 py-3 rounded-xl bg-brand items-center flex-row justify-center ${
                    isDownloading || isSharing ? 'opacity-60' : ''
                  }`
                )}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
                ) : (
                  <Download color="#0f172a" size={16} style={tw('mr-2')} />
                )}
                <Text style={tw('text-slate-900 font-bold text-sm')}>
                  {isDownloading
                    ? t('mobile.downloading_file', 'Đang tải...')
                    : t('mobile.download', 'Tải về')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={tw('text-slate-400 text-xs text-center')}>
              {t('mobile.tap_to_view_full', 'Zoom or pan with touch gestures')}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
