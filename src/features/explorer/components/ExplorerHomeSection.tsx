import React from 'react';
import {View} from 'react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerHomeSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ExplorerHomeSection = ({
  title,
  description,
  children,
}: ExplorerHomeSectionProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View style={{marginBottom: theme.spacing.xl}}>
      <View style={{marginBottom: theme.spacing.md}}>
        <AppText style={{fontSize: theme.typography.heading}} weight="bold">
          {title}
        </AppText>
        {description ? (
          <AppText
            tone="muted"
            style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
};
