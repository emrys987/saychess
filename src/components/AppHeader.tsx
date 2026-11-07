import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS } from '@/features/auth/roles';
import { colors, fonts, layout, radius } from '@/theme';

// Sık kullanılan sayfalar üstte; geri kalanı "Daha fazla" menüsünde.
const ANA_NAV = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/oda', label: 'Ders Odası' },
  { href: '/odev', label: 'Ödev' },
  { href: '/canli', label: 'Canlı Ders' },
  { href: '/takvim', label: 'Takvim' },
] as const;

const DAHA_NAV = [
  { href: '/koc', label: 'Koç Bul' },
  { href: '/rehber', label: 'Satranç Rehberi' },
  { href: '/veli', label: 'Veli Paneli' },
  { href: '/paketler', label: 'Paketler' },
  { href: '/profil', label: 'Profilim' },
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
  const [dahaAcik, setDahaAcik] = useState(false);
  const dahaAktif = DAHA_NAV.some((i) => i.href === active);

  const git = (href: Href) => {
    setDahaAcik(false);
    router.navigate(href);
  };

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profilime git"
            onPress={() => git('/profil')}
            style={({ pressed }) => [styles.rolePill, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.roleText}>{ROLE_LABELS[profile.rol]}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navScroll}
        contentContainerStyle={styles.nav}
      >
        {ANA_NAV.map((item) => {
          const on = active === item.href;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => git(item.href)}
              style={({ pressed }) => [styles.navBtn, on && styles.navBtnOn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.navText}>{item.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diğer sayfalar"
          onPress={() => setDahaAcik(true)}
          style={({ pressed }) => [styles.navBtn, dahaAktif && styles.navBtnOn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.navText}>Daha fazla</Text>
          <Text style={styles.plus}>+</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={dahaAcik} transparent animationType="fade" onRequestClose={() => setDahaAcik(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDahaAcik(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Sayfalar</Text>
            {DAHA_NAV.map((item) => {
              const on = active === item.href;
              return (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  onPress={() => git(item.href)}
                  style={({ pressed }) => [
                    styles.sheetItem,
                    on && { backgroundColor: colors.pink },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.sheetText}>{item.label}</Text>
                  {on ? <Text style={styles.sheetText}>•</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
  plus: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: colors.ink, marginLeft: 2 },

  backdrop: {
    flex: 1,
    backgroundColor: '#0e0e1066',
    alignItems: 'center',
    paddingTop: 96,
    paddingHorizontal: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.card - 4,
    padding: 12,
  },
  sheetTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.mut,
    marginBottom: 8,
    marginLeft: 6,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.input,
  },
  sheetText: { fontWeight: '700', fontSize: 15, color: colors.ink },
});
