import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {FolderLock} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {useAppTheme} from '@/hooks/useAppTheme';

interface StorageAccessPromptProps {
  onGrantAccess: () => void;
}

export const StorageAccessPrompt = ({
  onGrantAccess,
}: StorageAccessPromptProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <SectionCard style={{marginBottom: theme.spacing.lg}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing.md,
        }}>
        <View
          style={{
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.primaryMuted,
            padding: theme.spacing.sm,
          }}>
          <FolderLock color={theme.colors.primary} size={18} />
        </View>
        <View style={{flex: 1}}>
          <AppText weight="semibold">Tüm klasörlere erişim gerekli</AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            Android bu izni kurulum anında vermez. Dosya yöneticisinin tüm
            klasörlere erişebilmesi için sistem ekranından izin vermeniz gerekir.
          </AppText>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={onGrantAccess}
            style={{
              marginTop: theme.spacing.md,
              alignSelf: 'flex-start',
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}>
            <AppText style={{color: '#FFFFFF'}} weight="semibold">
              Erişim izni ver
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </SectionCard>
  );
};
