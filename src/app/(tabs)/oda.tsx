import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Board } from '@/components/Board';
import { Button, Card, Chip, Clk, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useChessGame } from '@/features/lesson/useChessGame';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import type { Game } from '@/types/database';

function saat(sn: number) {
  const total = Math.max(0, Math.ceil(sn));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function DersOdası() {
  const { session } = useAuth();
  const router = useRouter();
  const oyun = useChessGame(session?.user.id);
  const [gecmis, setGecmis] = useState<Game[]>([]);
  const userId = session?.user.id;
  const { savedCount } = oyun;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!cancelled && data) setGecmis(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, savedCount]);

  const mac = oyun.mod === 'mac';
  const botMod = oyun.mod === 'bot';
  const turn = oyun.fen.split(' ')[1];
  const canli = mac && oyun.running && !oyun.over;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead eyebrow="Canlı ders" title="Ders Odası" lead="Tahta, 5+3 maç ve kayıtlı maçlar tek yerde." />

      <Card style={s.boardCard}>
        <View style={s.clockRow}>
          <Text style={ui.mut}>Koç (siyah)</Text>
          <Clk value={mac ? saat(oyun.remaining.b) : '—'} active={canli && turn === 'b'} />
        </View>
        <Board
          board={oyun.board}
          selected={oyun.selected}
          targets={oyun.targets}
          lastMove={oyun.lastMove}
          checkSquare={oyun.checkSquare}
          flipped={oyun.flipped}
          disabled={!!oyun.over || oyun.botDusunuyor}
          onSquarePress={oyun.press}
        />
        <View style={[s.clockRow, { marginTop: 8, marginBottom: 0 }]}>
          <Text style={ui.mut}>Öğrenci (beyaz)</Text>
          <Clk value={mac ? saat(oyun.remaining.w) : '—'} active={canli && turn === 'w'} />
        </View>
        <Text style={[ui.mut, { marginTop: 8 }]}>
          Demo: iki rol tek ekranda oynanır. Taşı seç, gideceği kareye dokun.
        </Text>
      </Card>

      <Card>
        <View style={s.head}>
          <Text style={ui.h3}>{mac ? '5+3 maç' : botMod ? 'Bota karşı' : 'Serbest çalışma'}</Text>
          <Chip
            label={mac ? (canli ? 'çalışıyor' : 'hazır') : botMod ? (oyun.botDusunuyor ? 'bot düşünüyor…' : 'senin sıran') : 'serbest'}
            tone={mac && canli ? 'wait' : botMod ? 'wait' : 'info'}
          />
        </View>
        <View style={s.row}>
          <Button sm title={mac ? 'Maçı yeniden başlat' : 'Maça başla (5+3)'} onPress={oyun.macBaslat} />
          {mac && !oyun.over ? (
            <Button sm title="Teslim ol" variant="secondary" onPress={oyun.teslim} />
          ) : null}
          <Button sm title="Bota karşı" variant={botMod ? 'cheese' : 'secondary'} onPress={oyun.botBaslat} />
          <Button sm title="Geri al" variant="secondary" onPress={oyun.geriAl} disabled={mac} />
          <Button sm title="Çevir" variant="secondary" onPress={oyun.cevir} />
          <Button sm title="Serbest mod" variant="secondary" onPress={oyun.serbestMod} />
        </View>

        {botMod ? (
          <View style={[s.row, { marginTop: 10 }]}>
            <Text style={ui.mut}>Seviye:</Text>
            {[
              { d: 1, ad: 'Basit' },
              { d: 2, ad: 'Orta' },
              { d: 3, ad: 'Zor' },
            ].map((sv) => (
              <Button
                key={sv.d}
                sm
                title={sv.ad}
                variant={oyun.botSeviye === sv.d ? 'cheese' : 'secondary'}
                onPress={() => oyun.botSeviyeSec(sv.d)}
              />
            ))}
            <Text style={ui.mut}>Beyaz sen, siyah bot.</Text>
          </View>
        ) : null}
        {oyun.over ? (
          <>
            <Msg tone="ok">
              Maç bitti: {oyun.over.sebep} ({oyun.over.sonuc})
            </Msg>
            <Button
              sm
              title="Bu maçtan ödev üret →"
              variant="cheese"
              onPress={() => router.navigate('/odev')}
            />
          </>
        ) : null}
        {oyun.mesaj ? <Msg>{oyun.mesaj}</Msg> : null}
        <Text style={[ui.mono, s.moves]}>{oyun.hamleler || 'Henüz hamle yok.'}</Text>
      </Card>

      <Card>
        <Text style={ui.h3}>Son maçlarım</Text>
        {gecmis.length ? (
          gecmis.map((g) => (
            <View key={g.id} style={ui.item}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>
                  {g.sonuc} · {g.bitis_sebebi}
                </Text>
                <Text style={ui.mut}>
                  {new Date(g.created_at).toLocaleString('tr-TR')} · {g.plies} yarım hamle
                </Text>
              </View>
              <Chip label={g.sonuc === '1-0' ? 'beyaz' : g.sonuc === '0-1' ? 'siyah' : 'berabere'} />
            </View>
          ))
        ) : (
          <Text style={ui.mut}>Henüz kayıtlı maç yok. Bir 5+3 maç oynayın.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  boardCard: { maxWidth: 520, width: '100%', alignSelf: 'center' },
  clockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  moves: { marginTop: 8, maxHeight: 120, lineHeight: 20 },
});

