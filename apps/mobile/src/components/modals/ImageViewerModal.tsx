import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ZoomIn, Download, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tw, twInstance } from '@/tw';

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

  if (!imageUri) return null;

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
              height: screenHeight * 0.72,
            }}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Bar Info */}
        <SafeAreaView style={tw('bg-black/60 border-t border-white/10')}>
          <View style={tw('p-4 items-center')}>
            <Text style={tw('text-slate-400 text-xs text-center')}>
              {t('mobile.tap_to_view_full', 'Zoom or pan with touch gestures')}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
