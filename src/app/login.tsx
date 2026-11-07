import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, styles as ui, Eyebrow } from '@/components/ui';
import { signInWithGoogle } from '@/features/auth/google';
import { colors, radius } from '@/theme';

const CHECKER = Array.from({ length: 36 }, (_, i) => i);

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[ui.screen, { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }]}>
        <View style={s.kutu}>
          <Eyebrow>Say Chess · birebir satranç dersi</Eyebrow>

        {/* .scene: siyah zemin + dama deseni + büyük at glifi + cam kart */}
        <View style={s.scene}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {CHECKER.map((i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: 56,
                  height: 56,
                  left: (i % 6) * 56,
                  top: Math.floor(i / 6) * 56,
                  backgroundColor: i % 2 ? '#ffffff0d' : 'transparent',
                }}
              />
            ))}
          </View>
          <Text style={s.bgp} pointerEvents="none">
            ♞
          </Text>
          <View style={s.glass}>
            <Text style={ui.h3}>Giriş</Text>
            <Text style={[ui.mut, { marginBottom: 12 }]}>
              Kayıt ve giriş Google hesabınla yapılır. İlk girişte rolünü seçersin.
            </Text>
            <Button
              title={busy ? 'Yönlendiriliyor…' : 'Google ile devam et'}
              variant="cheese"
              onPress={onGoogle}
              disabled={busy}
            />
            {error ? <Text style={[ui.error, { marginTop: 8 }]}>{error}</Text> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14, justifyContent: 'center' }}>
          <Chip label="demo" tone="wait" />
          <Text style={ui.mut}>Koçlar, öğrenciler ve veliler için tek uygulama.</Text>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // İçerik her ekranda ortada, en fazla 460 px genişlikte
  kutu: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  scene: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 26,
    minHeight: 330,
    backgroundColor: colors.ink,
    padding: 16,
    justifyContent: 'center',
    marginTop: 4,
  },
  bgp: {
    position: 'absolute',
    right: -8,
    bottom: -22,
    fontSize: 170,
    lineHeight: 180,
    color: colors.white,
    opacity: 0.18,
  },
  glass: {
    backgroundColor: colors.glass,
    borderRadius: radius.card - 6,
    padding: 16,
  },
});

