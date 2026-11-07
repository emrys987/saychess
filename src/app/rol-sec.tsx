import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS, SELECTABLE_ROLES } from '@/features/auth/roles';
import { colors } from '@/theme';
import type { UserRole } from '@/types/database';

export default function RolSec() {
  const { profile, updateProfile, signOut } = useAuth();
  const [secim, setSecim] = useState<UserRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kaydet = async () => {
    if (!secim) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ rol: secim });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={ui.screen}>
        <PageHead
          eyebrow="İlk adım"
          title={`Hoş geldin${profile?.ad ? `, ${profile.ad}` : ''}`}
          lead="Uygulamayı nasıl kullanacaksın? Rol bir kez seçilir, sonradan değiştirilemez."
        />

        {SELECTABLE_ROLES.map(({ rol, aciklama }) => {
          const on = secim === rol;
          return (
            <Pressable
              key={rol}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSecim(rol)}
            >
              <Card style={[s.card, on && s.cardOn]}>
                <View style={s.head}>
                  <Text style={ui.h3}>{ROLE_LABELS[rol]}</Text>
                  {on ? <Chip label="seçili" tone="ok" /> : null}
                </View>
                <Text style={ui.mut}>{aciklama}</Text>
              </Card>
            </Pressable>
          );
        })}

        {error ? <Text style={[ui.error, { marginBottom: 8 }]}>{error}</Text> : null}
        <Button title={busy ? 'Kaydediliyor…' : 'Devam et'} onPress={kaydet} disabled={!secim || busy} />
        <View style={{ height: 10 }} />
        <Button title="Çıkış yap" variant="secondary" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 10 },
  cardOn: { backgroundColor: colors.pink, borderColor: colors.ink, borderWidth: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

