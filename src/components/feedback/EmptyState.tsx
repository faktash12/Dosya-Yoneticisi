import React from 'react';
import {View} from 'react-native';
import {FolderOpen} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({
  title,
  description,
}: EmptyStateProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl,
      }}>
      <View
        style={{
          marginBottom: theme.spacing.md,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.primaryMuted,
          padding: theme.spacing.md,
        }}>
        <FolderOpen color={theme.colors.primary} size={28} />
      </View>
      <AppText style={{fontSize: theme.typography.heading}} weight="semibold">
        {title}
      </AppText>
      <AppText
        tone="muted"
        style={{
          marginTop: theme.spacing.sm,
          textAlign: 'center',
          maxWidth: 280,
        }}>
        {description}
      </AppText>
    </View>
  );
};

