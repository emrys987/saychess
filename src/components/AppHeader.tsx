import { useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS } from '@/features/auth/roles';
import { colors, fonts, layout, radius } from '@/theme';

const NAV = [
  { href: '/', label: 'Ana Sayfa', badge: '' },
  { href: '/oda', label: 'Ders Odası', badge: 'çalışıyor' },
  { href: '/odev', label: 'Ödev', badge: 'yeni' },
  { href: '/koc', label: 'Koç Bul', badge: '' },
  { href: '/canli', label: 'Canlı Ders', badge: 'yeni' },
  { href: '/takvim', label: 'Takvim', badge: '' },
  { href: '/rehber', label: 'Rehber', badge: 'yeni' },
  { href: '/veli', label: 'Veli Paneli', badge: '' },
  { href: '/paketler', label: 'Paketler', badge: '' },
  { href: '/profil', label: 'Profilim', badge: '' },
] as const;

/** index-3.html: .logo .mark — 2x2 dama deseni */
function LogoMark() {
  return (
    <View style={styles.mark}>
      {[colors.squareDark, colors.squareLight, colors.squareLight, colors.squareDark].map((c, i) => (
        <View key={i} style={{ width: '50%', height: '50%', backgroundColor: c }} />
      ))}
    </View>
  );
}

export function AppHeader({ active }: { active: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <LogoMark />
          <View>
            <Text style={styles.logoTitle}>Say Chess</Text>
            <Text style={styles.logoSub}>birebir satranç dersi</Text>
          </View>
        </View>
        {profile?.rol ? (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{ROLE_LABELS[profile.rol]}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navScroll}
        contentContainerStyle={styles.nav}
      >
        {NAV.map((item) => {
          const on = active === item.href;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => router.navigate(item.href)}
              style={({ pressed }) => [styles.navBtn, on && styles.navBtnOn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.navText}>{item.label}</Text>
              {item.badge ? <Text style={[styles.badge, styles.badgeLive]}>{item.badge}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.headerBg,
    width: '100%',
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxWidth: layout.maxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  logoTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.6, color: colors.ink, lineHeight: 22 },
  logoSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: colors.mut,
  },
  rolePill: {
    marginLeft: 'auto',
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  roleText: { fontWeight: '700', fontSize: 13, color: colors.ink },

  navScroll: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  nav: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  navBtnOn: { backgroundColor: colors.pink },
  navText: { fontWeight: '700', fontSize: 14, color: colors.ink },
  badge: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#0e0e1014',
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
    color: colors.ink,
    overflow: 'hidden',
  },
  badgeLive: { backgroundColor: colors.cheese },
});
