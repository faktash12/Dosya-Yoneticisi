import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  Heart,
  RefreshCcwDot,
  Settings2,
  SquareStack,
} from 'lucide-react-native';

import type {MainTabParamList} from '@/app/navigation/types';
import {resolveExplorerCategoryAction} from '@/features/explorer/view-models/explorerCategoryActionResolver';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import {useAppTheme} from '@/hooks/useAppTheme';
import {ExplorerScreen} from '@/screens/ExplorerScreen';
import {FavoritesScreen} from '@/screens/FavoritesScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import {TransfersScreen} from '@/screens/TransfersScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const TAB_ICONS = {
  Explorer: SquareStack,
  Favorites: Heart,
  Transfers: RefreshCcwDot,
  Settings: Settings2,
} as const;

export const MainTabs = (): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="Explorer"
      screenOptions={({route}) => ({
        lazy: true,
        freezeOnBlur: true,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({color, size}) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon color={color} size={size} />;
        },
      })}>
      <Tab.Screen
        name="Explorer"
        component={ExplorerScreen}
        listeners={({navigation}) => ({
          tabPress: event => {
            if (!navigation.isFocused()) {
              return;
            }

            event.preventDefault();
            const explorerState = useExplorerStore.getState();
            const rootAction = resolveExplorerCategoryAction('internal-storage');

            if (explorerState.mode === 'browser' && rootAction.kind === 'directory') {
              if (explorerState.currentPath !== rootAction.path) {
                explorerState.openBrowser(rootAction.path, {
                  categoryId: rootAction.categoryId,
                  emptyState: rootAction.emptyState,
                });
                return;
              }
            }

            explorerState.openHome();
          },
        })}
        options={{title: 'Dosyalar', tabBarLabel: 'Dosyalar'}}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{title: 'Favoriler', tabBarLabel: 'Favoriler'}}
      />
      <Tab.Screen
        name="Transfers"
        component={TransfersScreen}
        options={{title: 'Aktarımlar', tabBarLabel: 'Aktarımlar'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Ayarlar', tabBarLabel: 'Ayarlar'}}
      />
    </Tab.Navigator>
  );
};
