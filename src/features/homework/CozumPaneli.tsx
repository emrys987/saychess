import { Chess, type Square } from 'chess.js';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Board } from '@/components/Board';
import { Button, Card, Chip, Msg, styles as ui } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import type { Homework } from '@/types/database';

type Props = {
  odev: Homework;
  onBitti: () => void;
  onKapat: () => void;
};

/** Tek bir ödevi tahtada çözdürür: doğru hamlede 'cozuldu', yanlışta deneme sayılır. */
export function CozumPaneli({ odev, onBitti, onKapat }: Props) {
  const game = useMemo(() => new Chess(odev.fen), [odev.fen]);
  const [fen, setFen] = useState(game.fen());
  const [seciliKare, setSeciliKare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [ipucu, setIpucu] = useState(false);
  const [bitti, setBitti] = useState(odev.durum === 'cozuldu');
  const denemeRef = useRef(odev.deneme);
  // Süre ilk hamlede başlar (render sırasında Date.now() çağırmamak için).
  const baslangic = useRef<number | null>(null);
  const [deneme, setDeneme] = useState(odev.deneme);

  const board = useMemo(() => new Chess(fen).board(), [fen]);
  const targets = useMemo(
    () => (seciliKare ? new Chess(fen).moves({ square: seciliKare as Square, verbose: true }).map((m) => m.to) : []),
    [fen, seciliKare],
  );

  async function kaydet(durum: 'cozuldu', yeniDeneme: number) {
    const sure = baslangic.current ? Math.round((Date.now() - baslangic.current) / 1000) : 0;
    setBitti(true);
    setMesaj('Doğru! Ödev çözüldü olarak işaretlendi.');
    await supabase.from('homework').update({ durum, deneme: yeniDeneme, sure_sn: sure }).eq('id', odev.id);
    onBitti();
  }

  function bas(square: string) {
    if (bitti) return;
    if (baslangic.current === null) baslangic.current = Date.now();
    if (seciliKare && targets.includes(square as Square)) {
      try {
        game.move({ from: seciliKare as Square, to: square as Square, promotion: 'q' });
      } catch {
        setSeciliKare(null);
        return;
      }
      const lan = seciliKare + square;
      setSeciliKare(null);
      if (lan === odev.cozum[0]) {
        setFen(game.fen());
        void kaydet('cozuldu', denemeRef.current);
      } else {
        game.undo();
        denemeRef.current += 1;
        setDeneme(denemeRef.current);
        setMesaj('Bu hamle çözüm değil. Tekrar dene ya da ipucu iste.');
      }
      return;
    }
    const piece = game.get(square as Square);
    setSeciliKare(piece && piece.color === game.turn() ? square : null);
  }

  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Text style={[ui.h3, { flex: 1 }]}>{odev.baslik}</Text>
        <Chip label={bitti ? 'çözüldü' : 'bekliyor'} tone={bitti ? 'ok' : 'wait'} />
      </View>
      <Text style={[ui.mut, { marginBottom: 8 }]}>
        Sıra: {new Chess(odev.fen).turn() === 'w' ? 'beyaz' : 'siyah'} · {deneme} yanlış deneme
      </Text>

      <Board
        board={board}
        selected={seciliKare}
        targets={targets}
        lastMove={null}
        checkSquare={null}
        disabled={bitti}
        onSquarePress={bas}
      />

      {ipucu ? <Msg>İpucu: {odev.ipucu}</Msg> : null}
      {mesaj ? <Msg tone={bitti ? 'ok' : 'bad'}>{mesaj}</Msg> : null}

      <View style={s.row}>
        <Button sm title="İpucu" variant="secondary" onPress={() => setIpucu(true)} disabled={bitti} />
        <Button sm title="Kapat" variant="secondary" onPress={onKapat} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 2, borderColor: colors.ink },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
