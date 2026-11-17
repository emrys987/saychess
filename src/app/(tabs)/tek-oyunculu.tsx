import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Board } from '@/components/Board';
import { Card, Chip, Clk, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useChessGame } from '@/features/lesson/useChessGame';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/theme';
import type { Game } from '@/types/database';

function saat(sn: number) {
  const total = Math.max(0, Math.ceil(sn));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function BuyukDugme({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.start, pressed && s.startPressed]}>
      <View style={s.pawnPlay}>
        <Text style={s.pawn}>♟</Text>
        <Text style={s.play}>▶</Text>
      </View>
      <Text style={s.startText}>{title}</Text>
    </Pressable>
  );
}

function Aksiyon({ title, onPress, active = false, disabled = false }: { title: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [s.action, active && s.actionActive, disabled && s.actionDisabled, pressed && !disabled && s.actionPressed]}>
      <Text style={s.actionText}>{title}</Text>
    </Pressable>
  );
}

export default function TekOyunculu() {
  const { session } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { mod } = useLocalSearchParams<{ mod?: string }>();
  const oyun = useChessGame(session?.user.id);
  const { botBaslat, serbestMod } = oyun;
  const [gecmis, setGecmis] = useState<Game[]>([]);
  const wide = width >= 920;

  useEffect(() => {
    if (mod === 'bot') botBaslat();
    else serbestMod();
  }, [mod, botBaslat, serbestMod]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: false }).limit(5);
      if (!cancelled && !error && data) setGecmis(data);
    })();
    return () => { cancelled = true; };
  }, [session?.user.id, oyun.savedCount]);

  const botMod = oyun.mod === 'bot';
  const mac = oyun.mod === 'mac';
  const turn = oyun.fen.split(' ')[1];
  const running = mac && oyun.running && !oyun.over;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead eyebrow="Oyna · tek oyunculu" title={botMod ? 'Bota karşı' : 'Serbest çalışma'} lead="Tahtada oyna, modunu ve maçını yan panelden yönet." />
      <View style={[s.layout, wide && s.layoutWide]}>
        <Card style={[s.boardCard, wide && s.boardCardWide]}>
          <View style={s.clockRow}>
            <Text style={ui.mut}>{botMod ? 'Bot (siyah)' : 'Siyah'}</Text>
            <Clk value={mac ? saat(oyun.remaining.b) : '—'} active={running && turn === 'b'} />
          </View>
          <Board board={oyun.board} selected={oyun.selected} targets={oyun.targets} lastMove={oyun.lastMove} checkSquare={oyun.checkSquare} flipped={oyun.flipped} disabled={!!oyun.over || oyun.botDusunuyor} onSquarePress={oyun.press} />
          <View style={[s.clockRow, { marginTop: 8, marginBottom: 0 }]}>
            <Text style={ui.mut}>Beyaz (sen)</Text>
            <Clk value={mac ? saat(oyun.remaining.w) : '—'} active={running && turn === 'w'} />
          </View>
        </Card>

        <View style={[s.side, wide && s.sideWide]}>
          <Card>
            <View style={s.head}>
              <Text style={ui.h3}>{mac ? '5+3 maç' : botMod ? 'Bota karşı' : 'Serbest çalışma'}</Text>
              <Chip label={mac ? (running ? 'çalışıyor' : 'hazır') : botMod ? 'tek oyuncu' : 'serbest'} />
            </View>
            <BuyukDugme title={mac && running ? 'Yeni maç başlat' : 'Oyunu başlat'} onPress={oyun.macBaslat} />
            <Text style={[ui.eyebrow, { marginTop: 16 }]}>Oyun seçenekleri</Text>
            <View style={s.actions}>
              {mac && !oyun.over ? <Aksiyon title="Teslim ol" onPress={oyun.teslim} /> : null}
              <Aksiyon title="Bota karşı" onPress={oyun.botBaslat} active={botMod} />
              <Aksiyon title="Serbest çalışma" onPress={oyun.serbestMod} active={!botMod && !mac} />
              <Aksiyon title="Geri al" onPress={oyun.geriAl} disabled={mac} />
              <Aksiyon title="Tahtayı çevir" onPress={oyun.cevir} />
            </View>
            {botMod ? (
              <>
                <Text style={[ui.eyebrow, { marginTop: 16 }]}>Bot seviyesi</Text>
                <View style={s.actions}>
                  {[{ d: 1, ad: 'Basit' }, { d: 2, ad: 'Orta' }, { d: 3, ad: 'Zor' }].map((level) => (
                    <Aksiyon key={level.d} title={level.ad} active={oyun.botSeviye === level.d} onPress={() => oyun.botSeviyeSec(level.d)} />
                  ))}
                </View>
              </>
            ) : null}
            {oyun.over ? <>
              <Msg tone="ok">Maç bitti: {oyun.over.sebep} ({oyun.over.sonuc})</Msg>
              <Aksiyon title="Bu maçtan ödev üret →" onPress={() => router.navigate('/odev')} active />
            </> : null}
            {oyun.mesaj ? <Msg>{oyun.mesaj}</Msg> : null}
            <Text style={[ui.mono, s.moves]}>{oyun.hamleler || 'Henüz hamle yok.'}</Text>
          </Card>
          <Card>
            <Text style={ui.h3}>Son maçlarım</Text>
            {gecmis.length ? gecmis.map((game) => (
              <View key={game.id} style={ui.item}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{game.sonuc} · {game.bitis_sebebi}</Text>
                  <Text style={ui.mut}>{new Date(game.created_at).toLocaleString('tr-TR')} · {game.plies} yarım hamle</Text>
                </View>
                <Chip label={game.sonuc === '1-0' ? 'beyaz' : game.sonuc === '0-1' ? 'siyah' : 'berabere'} />
              </View>
            )) : <Text style={ui.mut}>Henüz kayıtlı maç yok. Bir oyun başlat.</Text>}
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  layout: { width: '100%', gap: 12 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  boardCard: { width: '100%' },
  boardCardWide: { flex: 2, maxWidth: 820 },
  side: { width: '100%', gap: 12 },
  sideWide: { flex: 1, maxWidth: 390 },
  clockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: 42, minWidth: 100, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill },
  actionActive: { backgroundColor: colors.pink, borderColor: colors.ink },
  actionDisabled: { opacity: 0.45 },
  actionPressed: { transform: [{ translateY: -1 }] },
  actionText: { color: colors.ink, fontWeight: '700' },
  start: { minHeight: 78, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.cheese, borderWidth: 2, borderColor: colors.ink, borderRadius: radius.card, paddingHorizontal: 18, paddingVertical: 14 },
  startPressed: { transform: [{ translateY: -2 }], opacity: 0.9 },
  pawnPlay: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pawn: { fontSize: 40, lineHeight: 44, color: colors.ink },
  play: { position: 'absolute', right: -2, bottom: 2, color: colors.white, fontSize: 15, textShadowColor: colors.ink, textShadowRadius: 3, textShadowOffset: { width: 1, height: 1 } },
  startText: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  moves: { marginTop: 8, maxHeight: 120, lineHeight: 20 },
});
