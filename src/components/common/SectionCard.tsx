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
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
          shadowColor: '#000000',
          shadowOffset: {width: 0, height: 10},
          shadowOpacity: theme.mode === 'dark' ? 0.22 : 0.08,
          shadowRadius: 18,
          elevation: 4,
        },
        style,
      ]}>
      {children}
    </View>
  );
};
