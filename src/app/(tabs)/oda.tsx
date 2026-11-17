import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Card, PageHead, styles as ui } from '@/components/ui';
import { colors, radius } from '@/theme';

const MODLAR = [
  {
    baslik: 'Bota karşı',
    aciklama: 'Kendi seviyene göre bir bot seç ve tek başına oyna.',
    simge: '♞',
    yol: '/tek-oyunculu?mod=bot',
  },
  {
    baslik: 'Serbest çalışma',
    aciklama: 'Tahtada kendi hızında çalış veya 5+3 maç başlat.',
    simge: '♟',
    yol: '/tek-oyunculu?mod=serbest',
  },
  {
    baslik: 'Multiplayer',
    aciklama: 'Oda kodu oluştur, arkadaşını davet et veya gelen kodla katıl.',
    simge: '♚',
    yol: '/multiplayer',
  },
] as const;

export default function Oyna() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const ikiSutun = width >= 620;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead eyebrow="Oyun alanı" title="Oyna" lead="Bir oyun modu seç ve satranç tahtasına geç." />
      <View style={[s.grid, ikiSutun && s.gridWide]}>
        {MODLAR.map((mod) => (
          <Pressable
            key={mod.baslik}
            accessibilityRole="button"
            onPress={() => router.push(mod.yol)}
            style={({ pressed }) => [s.tile, ikiSutun && s.tileWide, pressed && s.pressed]}
          >
            <Card style={s.card}>
              <Text style={s.icon}>{mod.simge}</Text>
              <Text style={ui.h3}>{mod.baslik}</Text>
              <Text style={ui.mut}>{mod.aciklama}</Text>
              <Text style={s.action}>Modu seç →</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: { width: '100%', gap: 10, maxWidth: 840, alignSelf: 'center' },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: '100%' },
  tileWide: { flexBasis: '48%', flexGrow: 1, maxWidth: '50%' },
  card: { minHeight: 180, borderWidth: 1.5, borderColor: colors.ink, marginBottom: 0 },
  icon: { fontSize: 34, lineHeight: 42, color: colors.ink, marginBottom: 8 },
  action: { color: colors.ink, fontWeight: '800', marginTop: 14 },
  pressed: { transform: [{ translateY: -1 }], borderRadius: radius.card, opacity: 0.88 },
});
