import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Board } from '@/components/Board';
import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLiveDers } from '@/features/live/useLiveDers';
import { colors } from '@/theme';

const s = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
  // Ders Odası'ndaki tahta kartıyla aynı ölçü
  boardCard: { maxWidth: 520, width: '100%' as const, alignSelf: 'center' as const },
};

export default function CanliDers() {
  const { session } = useAuth();
  const ders = useLiveDers(session?.user.id);
  const [kod, setKod] = useState('');

  if (!ders.oturum) {
    return (
      <ScrollView contentContainerStyle={ui.screen}>
        <PageHead
          eyebrow="Canlı ders"
          title="Canlı Ders"
          lead="Ortak tahta: dersi başlat, kodu paylaş; karşı taraf kodla katılır."
        />
        <Card>
          <Text style={ui.h3}>Ders başlat</Text>
          <Text style={[ui.mut, { marginBottom: 10 }]}>
            Beyaz taşlarla sen başlarsın. Kod oluşunca karşı tarafa gönder.
          </Text>
          <Button title={ders.busy ? 'Oluşturuluyor…' : 'Ders oluştur'} onPress={ders.olustur} disabled={ders.busy} />
        </Card>
        <Card>
          <Text style={ui.h3}>Koda katıl</Text>
          <TextInput
            style={[ui.input, { marginBottom: 10 }]}
            value={kod}
            onChangeText={setKod}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="Örn. K7QP2M"
          />
          <Button
            title={ders.busy ? 'Katılınıyor…' : 'Katıl'}
            onPress={() => ders.katil(kod)}
            disabled={ders.busy || kod.trim().length < 6}
          />
        </Card>
        {ders.mesaj ? <Msg tone="bad">{ders.mesaj}</Msg> : null}
        <Text style={ui.mut}>
          Aynı hesabı iki pencerede açarak da deneyebilirsin: birinde ders oluştur, diğerinde kodla katıl.
        </Text>
      </ScrollView>
    );
  }

  const siradaBen = ders.sira === ders.benimRengim;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Canlı ders"
        title={`Ders ${ders.oturum.kod}`}
        lead={`Sen ${ders.benimRengim === 'w' ? 'beyaz' : 'siyah'} taşlarla oynuyorsun. Kodu karşı tarafa gönder.`}
      />

      <Card style={s.boardCard}>
        <View style={s.head}>
          <Chip label={ders.bagli ? 'bağlı' : 'bağlanıyor…'} tone={ders.bagli ? 'ok' : 'wait'} />
          <Chip label={siradaBen ? 'sıra sende' : 'sıra rakipte'} />
          <Chip label={ders.oturum.siyah_id ? '2 oyuncu' : 'tek başına'} />
        </View>

        <Board
          board={ders.board}
          selected={ders.secili}
          targets={ders.targets}
          lastMove={null}
          checkSquare={null}
          flipped={ders.benimRengim === 'b'}
          disabled={!siradaBen}
          onSquarePress={ders.press}
        />

        <Text style={[ui.mono, { marginTop: 10 }]}>
          {ders.hamleler.length ? ders.hamleler.join(' ') : 'Henüz hamle yok.'}
        </Text>

        {ders.mesaj ? <Msg>{ders.mesaj}</Msg> : null}

        <View style={[s.row, { marginTop: 10 }]}>
          <Button sm title="Ayrıl" variant="secondary" onPress={ders.ayril} />
        </View>
      </Card>

      <Card dark>
        <Text style={[ui.h3, { color: colors.cheese }]}>Nasıl çalışır</Text>
        <Text style={{ color: '#ffffffd9', fontSize: 14, lineHeight: 20 }}>
          1. Bir taraf “Ders oluştur” der, çıkan 6 haneli kodu paylaşır.{'\n'}
          2. Diğer taraf kodu girer; tahta iki cihazda eşitlenir.{'\n'}
          3. Hamleler Supabase Realtime ile sırayla iletilir; sıra kimde ise sadece o oynayabilir.{'\n'}
          4. Ses/görüntü bu sürümde yok — telefon görüşmesi ya da ayrı bir uygulama yeterli.
        </Text>
      </Card>
    </ScrollView>
  );
}
