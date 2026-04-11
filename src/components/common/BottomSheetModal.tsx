import React from 'react';
import {Modal, Pressable, View} from 'react-native';
import {X} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface BottomSheetModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheetModal = ({
  visible,
  title,
  onClose,
  children,
}: BottomSheetModalProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(15, 23, 42, 0.34)',
        }}>
        <Pressable onPress={onClose} style={{flex: 1}} />
        <View
          style={{
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.md,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <AppText style={{fontSize: theme.typography.title}} weight="bold">
              {title}
            </AppText>
            <Pressable
              hitSlop={8}
              onPress={onClose}
              style={{
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.surfaceMuted,
                padding: theme.spacing.sm,
              }}>
              <X color={theme.colors.text} size={18} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
};
