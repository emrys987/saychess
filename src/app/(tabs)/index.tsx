import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS } from '@/features/auth/roles';
import { colors, radius } from '@/theme';

const ADIMLAR = [
  { no: 1, metin: 'Rolünü seç', done: true },
  { no: 2, metin: 'Ders odasında maç yap', done: true },
  { no: 3, metin: 'Ödevini çöz', done: false },
  { no: 4, metin: 'Koç bul, randevu al', done: false },
];

// index-3.html sekmeleri; taşındıkça gerçek ekranlara bağlanacak.
const YOL_HARITASI = [
  ['Ödev', 'Maçtan otomatik ödev, tema setleri, tahtada çözme (Faz 3)', 'hazır'],
  ['Koç Bul & Takvim', 'Filtreler, müsaitlik, randevu (Faz 4)', 'hazır'],
  ['Canlı ders', 'Ortak tahta (Realtime) + Jitsi görüntülü görüşme (Faz 5)', 'hazır'],
  ['Veli Paneli', 'Çocuğun özeti, veli davet kodu, ders puanlama (Faz 6)', 'hazır'],
  ['Satranç Rehberi', 'Koç yazısı + moderatör onayı (Faz 6)', 'hazır'],
  ['Paketler', '1, 3 ve 6 aylık paketler — ödeme kapsam dışı (Faz 7)', 'tasarım'],
] as const;

const DUYURULAR = [
  'Dersler 45 dk + 15 dk maç tamponu olarak planlanır',
  'Koç yazıları moderatör onayıyla yayınlanır',
  'Paketlerde 3 ve 6 aylık indirim',
];

export default function Home() {
  const { profile } = useAuth();

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        title={`Merhaba${profile?.ad ? `, ${profile.ad}` : ''}`}
        lead="Koç, öğrenci ve veli aynı yerde: canlı ders tahtası, 5+3 maç, ödev ve haftalık rapor."
      />

      <Card>
        <View style={s.head}>
          <Text style={ui.h3}>Nereden başlamalı?</Text>
          <Chip label={profile?.rol ? ROLE_LABELS[profile.rol] : 'rol yok'} tone="ok" />
        </View>
        <View style={s.steps}>
          {ADIMLAR.map((a) => (
            <View key={a.no} style={s.step}>
              <Text style={[s.stepNo, a.done && s.stepNoDone]}>{a.no}</Text>
              <Text style={s.stepText}>{a.metin}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card dark>
        <Text style={[ui.h3, { color: colors.cheese }]}>Duyurular</Text>
        {DUYURULAR.map((d, i) => (
          <Text key={d} style={[s.darkItem, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
            {d}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={ui.h3}>Yol haritası</Text>
        {YOL_HARITASI.map(([baslik, detay, durum], i) => (
          <View key={baslik} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{baslik}</Text>
              <Text style={ui.mut}>{detay}</Text>
            </View>
            <Chip label={durum} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: '#ffffffd9',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 14,
  },
  stepNo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.pink,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
  },
  stepNoDone: { backgroundColor: colors.ink, color: colors.cheese },
  stepText: { fontWeight: '700', fontSize: 13, color: colors.ink },
  darkItem: {
    color: '#ffffffd9',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ffffff26',
  },
});

