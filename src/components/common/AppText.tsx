import React from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';

import {useAppTheme} from '@/hooks/useAppTheme';

interface AppTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: 'default' | 'muted' | 'accent';
  weight?: 'regular' | 'semibold' | 'bold';
}

export const AppText = ({
  children,
  style,
  tone = 'default',
  weight = 'regular',
}: AppTextProps): React.JSX.Element => {
  const theme = useAppTheme();

  const color =
    tone === 'muted'
      ? theme.colors.textMuted
      : tone === 'accent'
        ? theme.colors.primary
        : theme.colors.text;

  return (
    <Text
      style={[
        {
          color,
          fontSize: theme.typography.body,
          fontWeight:
            weight === 'bold'
              ? '700'
              : weight === 'semibold'
                ? '600'
                : '400',
        },
        style,
      ]}>
      {children}
    </Text>
  );
};

