import { Tabs, usePathname } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

export default function TabsLayout() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const active =
    pathname.startsWith('/multiplayer') || pathname.startsWith('/tek-oyunculu')
      ? '/oda'
      : ['/oda', '/odev', '/koc', '/canli', '/takvim', '/rehber', '/veli', '/paketler', '/profil', '/yonetim'].find((p) => pathname.startsWith(p)) ?? '/';

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        header: () => <AppHeader active={active} />,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="oda" options={{ title: 'Oyna' }} />
      <Tabs.Screen name="multiplayer" options={{ title: 'Multiplayer' }} />
      <Tabs.Screen name="tek-oyunculu" options={{ title: 'Tek Oyunculu' }} />
      <Tabs.Screen name="odev" options={{ title: 'Ödev' }} />
      <Tabs.Screen name="koc" options={{ title: 'Koç Bul' }} />
      <Tabs.Screen name="canli" options={{ title: 'Canlı Ders' }} />
      <Tabs.Screen name="takvim" options={{ title: 'Takvim' }} />
      <Tabs.Screen name="rehber" options={{ title: 'Rehber' }} />
      <Tabs.Protected guard={profile?.rol === 'veli'} redirectTo="/">
        <Tabs.Screen name="veli" options={{ title: 'Veli Paneli' }} />
      </Tabs.Protected>
      <Tabs.Screen name="paketler" options={{ title: 'Paketler' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profilim' }} />
      <Tabs.Protected guard={profile?.rol === 'moderator'} redirectTo="/">
        <Tabs.Screen name="yonetim" options={{ title: 'Yönetim' }} />
      </Tabs.Protected>
    </Tabs>
  );
}

