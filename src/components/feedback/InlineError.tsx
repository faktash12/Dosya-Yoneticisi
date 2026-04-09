import React from 'react';
import {View} from 'react-native';
import {TriangleAlert} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface InlineErrorProps {
  message: string;
}

export const InlineError = ({message}: InlineErrorProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
      }}>
      <TriangleAlert color={theme.colors.danger} size={18} />
      <AppText>{message}</AppText>
    </View>
  );
};

