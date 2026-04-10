import React from 'react';
import {Dimensions, Pressable, ScrollView, View} from 'react-native';
import {
  FolderOpen,
  HardDrive,
  History,
  Home,
  MonitorSmartphone,
  Settings,
  Star,
  Trash2,
  X,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useAppTheme} from '@/hooks/useAppTheme';

type ExplorerDrawerTab = 'locations' | 'favorites' | 'recent';

interface DrawerLocationItem {
  id: 'home' | 'internal-storage' | 'system' | 'trash';
  title: string;
  subtitle: string;
  icon: typeof Home;
}

interface ExplorerSideDrawerProps {
  activeTab: ExplorerDrawerTab;
  favorites: FileSystemNode[];
  recentItems: FileSystemNode[];
  onClose: () => void;
  onSelectTab: (tab: ExplorerDrawerTab) => void;
  onOpenLocation: (locationId: DrawerLocationItem['id']) => void;
  onOpenSettings: () => void;
  onOpenNode: (node: FileSystemNode) => void;
}

const drawerLocations: DrawerLocationItem[] = [
  {
    id: 'home',
    title: 'Ana Ekran',
    subtitle: 'Başlangıç panosuna dön',
    icon: Home,
  },
  {
    id: 'internal-storage',
    title: 'Ana Bellek',
    subtitle: 'Gerçek cihaz depolamasını aç',
    icon: HardDrive,
  },
  {
    id: 'system',
    title: 'Sistem',
    subtitle: 'Korunan alan bilgilerini görüntüle',
    icon: MonitorSmartphone,
  },
  {
    id: 'trash',
    title: 'Çöp Kutusu',
    subtitle: 'Silinmiş öğe akışını aç',
    icon: Trash2,
  },
];

const drawerTabs = [
  {id: 'locations' as const, icon: FolderOpen, label: 'Konumlar'},
  {id: 'favorites' as const, icon: Star, label: 'Favoriler'},
  {id: 'recent' as const, icon: History, label: 'Son Açılanlar'},
];

const DrawerNodeRow = ({
  node,
  onPress,
}: {
  node: FileSystemNode;
  onPress: (node: FileSystemNode) => void;
}): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={() => onPress(node)}
      style={({pressed}) => ({
        borderRadius: theme.radii.lg,
        backgroundColor: pressed
          ? theme.colors.primaryMuted
          : theme.colors.surfaceMuted,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      })}>
      <AppText weight="semibold">{node.name}</AppText>
      <AppText
        tone="muted"
        style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
        {node.path}
      </AppText>
    </Pressable>
  );
};

export const ExplorerSideDrawer = ({
  activeTab,
  favorites,
  recentItems,
  onClose,
  onSelectTab,
  onOpenLocation,
  onOpenSettings,
  onOpenNode,
}: ExplorerSideDrawerProps): React.JSX.Element => {
  const theme = useAppTheme();
  const drawerWidth = Math.min(344, Math.max(286, Dimensions.get('window').width * 0.72));

  return (
    <View
      style={{
        width: drawerWidth,
        height: '100%',
        backgroundColor: theme.colors.surface,
        borderTopRightRadius: theme.radii.xl,
        borderBottomRightRadius: theme.radii.xl,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.lg,
        }}>
        <View>
          <AppText style={{fontSize: theme.typography.heading}} weight="bold">
            Dosya Yöneticisi
          </AppText>
          <AppText
            tone="muted"
            style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
            Hızlı gezinme paneli
          </AppText>
        </View>
        <Pressable
          onPress={onClose}
          style={{
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surfaceMuted,
            padding: theme.spacing.sm,
          }}>
          <X color={theme.colors.text} size={18} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderRadius: theme.radii.xl,
          backgroundColor: theme.colors.surfaceMuted,
          padding: theme.spacing.xs,
          gap: theme.spacing.xs,
        }}>
        {drawerTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              style={{
                flex: 1,
                borderRadius: theme.radii.lg,
                backgroundColor: isActive
                  ? theme.colors.surface
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
              <Icon
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
                size={18}
              />
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{paddingTop: theme.spacing.lg, gap: theme.spacing.sm, flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'locations'
          ? drawerLocations.map(item => {
              const Icon = item.icon;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onOpenLocation(item.id)}
                  style={({pressed}) => ({
                    borderRadius: theme.radii.lg,
                    backgroundColor: pressed
                      ? theme.colors.primaryMuted
                      : theme.colors.surfaceMuted,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                  })}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}>
                    <Icon color={theme.colors.primary} size={18} />
                    <View style={{flex: 1}}>
                      <AppText weight="semibold">{item.title}</AppText>
                      <AppText
                        tone="muted"
                        style={{
                          marginTop: theme.spacing.xs,
                          fontSize: theme.typography.caption,
                        }}>
                        {item.subtitle}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })
          : null}

        {activeTab === 'favorites'
          ? favorites.length > 0
            ? favorites.map(item => (
                <DrawerNodeRow key={item.id} node={item} onPress={onOpenNode} />
              ))
            : (
                <View
                  style={{
                    borderRadius: theme.radii.lg,
                    backgroundColor: theme.colors.surfaceMuted,
                    padding: theme.spacing.md,
                  }}>
                  <AppText weight="semibold">Henüz favori yok</AppText>
                  <AppText
                    tone="muted"
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.typography.caption,
                    }}>
                    Favorilere eklenen dosya ve klasörler burada görünecek.
                  </AppText>
                </View>
              )
          : null}

        {activeTab === 'recent'
          ? recentItems.length > 0
            ? recentItems.map(item => (
                <DrawerNodeRow key={item.id} node={item} onPress={onOpenNode} />
              ))
            : (
                <View
                  style={{
                    borderRadius: theme.radii.lg,
                    backgroundColor: theme.colors.surfaceMuted,
                    padding: theme.spacing.md,
                  }}>
                  <AppText weight="semibold">Henüz son açılan dosya yok</AppText>
                  <AppText
                    tone="muted"
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.typography.caption,
                    }}>
                    Açtığınız dosyalar burada kısayol olarak listelenecek.
                  </AppText>
                </View>
              )
          : null}

        {activeTab === 'locations' ? (
          <View style={{marginTop: 'auto', paddingTop: theme.spacing.lg}}>
            <Pressable
              onPress={onOpenSettings}
              style={({pressed}) => ({
                borderRadius: theme.radii.lg,
                backgroundColor: pressed
                  ? theme.colors.primaryMuted
                  : theme.colors.surfaceMuted,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
              })}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}>
                <Settings color={theme.colors.primary} size={18} />
                <View style={{flex: 1}}>
                  <AppText weight="semibold">Ayarlar</AppText>
                  <AppText
                    tone="muted"
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.typography.caption,
                    }}>
                    Görünüm ve dosya davranışını yönet
                  </AppText>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};
