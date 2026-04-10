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
          borderRadius: theme.radii.md,
          padding: theme.spacing.md,
          shadowColor: '#000000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: theme.mode === 'dark' ? 0.14 : 0.04,
          shadowRadius: 8,
          elevation: 1,
        },
        style,
      ]}>
      {children}
    </View>
  );
};
