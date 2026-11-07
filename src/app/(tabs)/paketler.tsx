import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { PLANLAR, type Plan } from '@/features/paketler/plans';
import { colors } from '@/theme';

export default function Paketler() {
  const [secili, setSecili] = useState<Plan | null>(null);

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Paketler"
        title="Ders Paketleri"
        lead="1, 3 ve 6 aylık paketler. Çok aylık paketlerde indirim uygulanır."
      />
      <Chip label="ödeme entegrasyonu kapsam dışı" tone="wait" />

      <View style={{ height: 12 }} />

      {PLANLAR.map((p) => {
        const on = secili?.id === p.id;
        return (
          <Card key={p.id} style={on ? { borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.pink } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={ui.h3}>{p.ad}</Text>
              {p.populer ? <Chip label="en çok seçilen" tone="ok" /> : null}
              {p.indirim ? <Chip label={`%${p.indirim} indirim`} tone="wait" /> : null}
            </View>

            <Text style={{ fontWeight: '800', fontSize: 26, color: colors.ink, marginVertical: 4 }}>
              {Math.round(p.fiyat).toLocaleString('tr-TR')} TL
            </Text>
            <Text style={ui.mut}>
              {p.dersSayisi} ders · ayda {Math.round(p.dersSayisi / p.ay)} ders · 45 dk
            </Text>

            {p.ozellikler.map((o) => (
              <Text key={o} style={{ color: colors.ink, fontSize: 14, marginTop: 6 }}>
                · {o}
              </Text>
            ))}

            <View style={{ height: 10 }} />
            <Button
              sm
              title={on ? 'Seçildi' : 'Paketi seç'}
              variant={on ? 'cheese' : 'secondary'}
              onPress={() => setSecili(p)}
            />
          </Card>
        );
      })}

      {secili ? (
        <Msg>
          <Text style={{ fontWeight: '700' }}>{secili.ad} paket seçildi.</Text>
          {'\n'}Ödeme entegrasyonu bu sürümde yok. Gerçek akışta: paket → ödeme (iyzico/PayTR) → ders kredisi →
          randevuda krediden düşme.
        </Msg>
      ) : null}

      <Card dark>
        <Text style={[ui.h3, { color: colors.cheese }]}>Neden ödeme yok?</Text>
        <Text style={{ color: '#ffffffd9', fontSize: 14, lineHeight: 21 }}>
          1. iyzico/PayTR sandbox için ticari hesap ve vergi levhası gerekiyor.{'\n'}
          2. Mobil mağazalarda dijital paket satışı, mağazanın kendi ödeme sistemiyle yapılmak zorunda.{'\n'}
          3. Bu sürümde paketler ve fiyatlar tanımlandı; tahsilat/sözleşme/iptal akışı kapsam dışı bırakıldı.
        </Text>
      </Card>
    </ScrollView>
  );
}
