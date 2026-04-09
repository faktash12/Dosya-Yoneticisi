import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';

import {useAppTheme} from '@/hooks/useAppTheme';

interface SectionCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const SectionCard = ({
  children,
  style,
}: SectionCardProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
        },
        style,
      ]}>
      {children}
    </View>
  );
};

