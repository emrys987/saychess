import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Board } from '@/components/Board';
import { Button, Card, Chip, Clk, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLiveDers, type SaatModu } from '@/features/live/useLiveDers';
import { colors } from '@/theme';

function saatYaz(saniye: number) {
  const total = Math.max(0, Math.ceil(saniye));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function Multiplayer() {
  const { session } = useAuth();
  const oyun = useLiveDers(session?.user.id, 'oyun');
  const [kod, setKod] = useState('');
  const [saatModu, setSaatModu] = useState<SaatModu>('yok');

  if (!oyun.oturum) {
    return (
      <ScrollView contentContainerStyle={ui.screen}>
        <PageHead eyebrow="Oyna · multiplayer" title="Arkadaşınla oyna" lead="Oda kodu paylaşarak bir arkadaşınla satranç oyna." />
        <Card>
          <Text style={ui.h3}>Oda oluştur</Text>
          <Text style={[ui.mut, { marginBottom: 10 }]}>Saat modunu seç. Odayı açınca oluşan kodu arkadaşına gönder.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Button title="Saatsiz" variant={saatModu === 'yok' ? 'cheese' : 'secondary'} onPress={() => setSaatModu('yok')} />
            <Button title="5+3" variant={saatModu === '5+3' ? 'cheese' : 'secondary'} onPress={() => setSaatModu('5+3')} />
          </View>
          <Button title={oyun.busy ? 'Oluşturuluyor…' : 'Oda oluştur'} onPress={() => oyun.olustur(saatModu)} disabled={oyun.busy} />
        </Card>
        <Card>
          <Text style={ui.h3}>Oda koduyla katıl</Text>
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
            title={oyun.busy ? 'Katılınıyor…' : 'Katıl'}
            onPress={() => oyun.katil(kod)}
            disabled={oyun.busy || kod.trim().length < 6}
          />
        </Card>
        {oyun.mesaj ? <Msg tone="bad">{oyun.mesaj}</Msg> : null}
      </ScrollView>
    );
  }

  const oturum = oyun.oturum;
  const siraBende = oyun.sira === oyun.benimRengim;
  const ikiOyuncu = !!oturum.siyah_id;
  const tamamlandi = oturum.durum === 'bitti';

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Oyna · multiplayer"
        title={`Oda ${oturum.kod}`}
        lead={`Sen ${oyun.benimRengim === 'w' ? 'beyaz' : 'siyah'} taşlarla oynuyorsun.`}
      />
      <Card style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <Chip label={oyun.bagli ? 'bağlı' : 'bağlanıyor…'} tone={oyun.bagli ? 'ok' : 'wait'} />
          <Chip label={ikiOyuncu ? '2 oyuncu' : 'rakip bekleniyor'} />
          <Chip label={oturum.saat_modu === '5+3' ? '5+3' : 'saatsiz'} />
        </View>
        {!ikiOyuncu ? (
          <Msg tone="info">Arkadaşın katılana kadar bu kodu paylaş: <Text selectable style={{ fontWeight: '800' }}>{oturum.kod}</Text></Msg>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={ui.mut}>Siyah</Text>
          <Clk value={oturum.saat_modu === '5+3' ? saatYaz(oyun.kalan.b) : '—'} active={!tamamlandi && siraBende && oyun.benimRengim === 'b'} />
        </View>
        <Board
          board={oyun.board}
          selected={oyun.secili}
          targets={oyun.targets}
          lastMove={oyun.sonHamle}
          checkSquare={null}
          flipped={oyun.benimRengim === 'b'}
          disabled={tamamlandi || !ikiOyuncu || !oyun.bagli || !siraBende}
          onSquarePress={oyun.press}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={ui.mut}>Beyaz</Text>
          <Clk value={oturum.saat_modu === '5+3' ? saatYaz(oyun.kalan.w) : '—'} active={!tamamlandi && siraBende && oyun.benimRengim === 'w'} />
        </View>
        <Text style={[ui.mono, { marginTop: 10 }]}>{oyun.hamleler.length ? oyun.hamleler.join(' ') : 'Henüz hamle yok.'}</Text>
        {oyun.mesaj ? <Msg>{oyun.mesaj}</Msg> : null}
        {tamamlandi ? (
          <Msg tone="ok">Oyun bitti: {oturum.bitis_sebebi} · {oturum.sonuc}</Msg>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {!tamamlandi && ikiOyuncu ? (
            <Button sm title="Teslim ol" variant="secondary" onPress={oyun.teslim} disabled={!siraBende} />
          ) : null}
          <Button sm title="Ayrıl" variant="secondary" onPress={oyun.ayril} />
        </View>
      </Card>
      <Card dark>
        <Text style={[ui.h3, { color: colors.cheese }]}>Nasıl oynanır?</Text>
        <Text style={{ color: '#ffffffd9', fontSize: 14, lineHeight: 20 }}>
          Oda kodunu arkadaşına gönder. İkinci oyuncu katıldığında oyun başlar. Hamleler ve seçilen saat modu iki tarafta eşitlenir.
        </Text>
      </Card>
    </ScrollView>
  );
}
