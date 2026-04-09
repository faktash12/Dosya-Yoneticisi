import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppTheme} from '@/hooks/useAppTheme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ScreenContainer = ({
  children,
  style,
}: ScreenContainerProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={{flex: 1, backgroundColor: theme.colors.background}}>
      <View
        style={[
          {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
          },
          style,
        ]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

