import { Tabs, usePathname } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/theme';

export default function TabsLayout() {
  const pathname = usePathname();
  const active = ['/oda', '/odev', '/koc', '/canli', '/takvim', '/rehber', '/veli', '/paketler', '/profil', '/yonetim'].find((p) => pathname.startsWith(p)) ?? '/';

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        header: () => <AppHeader active={active} />,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="oda" options={{ title: 'Ders Odası' }} />
      <Tabs.Screen name="odev" options={{ title: 'Ödev' }} />
      <Tabs.Screen name="koc" options={{ title: 'Koç Bul' }} />
      <Tabs.Screen name="canli" options={{ title: 'Canlı Ders' }} />
      <Tabs.Screen name="takvim" options={{ title: 'Takvim' }} />
      <Tabs.Screen name="rehber" options={{ title: 'Rehber' }} />
      <Tabs.Screen name="veli" options={{ title: 'Veli Paneli' }} />
      <Tabs.Screen name="paketler" options={{ title: 'Paketler' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profilim' }} />
      <Tabs.Screen name="yonetim" options={{ title: 'Yönetim' }} />
    </Tabs>
  );
}

