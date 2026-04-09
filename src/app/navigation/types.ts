import type {NavigatorScreenParams} from '@react-navigation/native';

export type MainTabParamList = {
  Explorer: undefined;
  Favorites: undefined;
  Transfers: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  StorageAnalysis: undefined;
};

