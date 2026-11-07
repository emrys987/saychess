import { Chess, type Color, type Square } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BoardCell } from '@/components/Board';
import { searchRoot } from '@/lib/chess/engine';
import { supabase } from '@/lib/supabase';

export const MATCH_SECONDS = 300; // 5 dk
export const INCREMENT_SECONDS = 3;

export type Mod = 'serbest' | 'mac' | 'bot';
export type GameOver = { sonuc: string; sebep: string };

function describeEnd(g: Chess): GameOver | null {
  if (g.isCheckmate()) return { sonuc: g.turn() === 'w' ? '0-1' : '1-0', sebep: 'Mat' };
  if (g.isDraw()) return { sonuc: '1/2-1/2', sebep: 'Beraberlik' };
  if (g.isGameOver()) return { sonuc: '1/2-1/2', sebep: 'Beraberlik' };
  return null;
}

function findKing(g: Chess, color: Color) {
  for (const row of g.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

export function useChessGame(userId: string | undefined) {
  const game = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState(game.fen());
  const [mod, setMod] = useState<Mod>('serbest');
  const [remaining, setRemaining] = useState({ w: MATCH_SECONDS, b: MATCH_SECONDS });
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState<GameOver | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  // Bota karşı oynama: bot siyah, insan beyaz. Seviye = motor derinliği.
  const [botSeviye, setBotSeviye] = useState(1);
  const [botDusunuyor, setBotDusunuyor] = useState(false);

  const board: BoardCell[][] = useMemo(() => new Chess(fen).board(), [fen]);

  const targets = useMemo(
    () => (selected ? new Chess(fen).moves({ square: selected as Square, verbose: true }).map((m) => m.to) : []),
    [fen, selected],
  );

  const checkSquare = useMemo(() => {
    const snapshot = new Chess(fen);
    return snapshot.inCheck() ? findKing(snapshot, snapshot.turn()) : null;
  }, [fen]);

  const savedRef = useRef(false);
  const remainingRef = useRef(remaining);
  const overRef = useRef<GameOver | null>(null);

  const finish = useCallback(
    (sonuc: GameOver) => {
      if (overRef.current) return;
      overRef.current = sonuc;
      setOver(sonuc);
      setRunning(false);
      if (savedRef.current) return;
      savedRef.current = true;
      if (!userId) {
        setMesaj(`Maç bitti: ${sonuc.sebep}. Kaydetmek için giriş yapın.`);
        return;
      }
      game.setHeader('Event', mod === 'mac' ? 'Say Chess 5+3 maç' : mod === 'bot' ? 'Say Chess bota karşı' : 'Say Chess serbest');
      game.setHeader('Result', sonuc.sonuc);
      void supabase
        .from('games')
        .insert({
          beyaz_id: userId,
          pgn: game.pgn(),
          sonuc: sonuc.sonuc,
          bitis_sebebi: sonuc.sebep,
          plies: game.history().length,
        })
        .then(({ error }) => {
          setMesaj(error ? `Maç kaydedilemedi: ${error.message}` : `Maç bitti: ${sonuc.sebep} · kaydedildi`);
          if (!error) setSavedCount((n) => n + 1);
        });
    },
    [game, userId, mod],
  );

  // Botun hamlesi: motoru çalıştırıp tahtaya uygular (insan beyaz, bot siyah).
  const botOyna = useCallback(() => {
    if (overRef.current) return;
    const baslangicFen = game.fen();
    setBotDusunuyor(true);
    // Kısa gecikme: "düşünüyor" göstergesi görünsün, arayüz donmasın
    setTimeout(() => {
      try {
        const { moves } = searchRoot(baslangicFen, botSeviye);
        const enIyi = moves[0];
        if (!enIyi) return;
        const m = game.move({ from: enIyi.move.from, to: enIyi.move.to, promotion: 'q' });
        setFen(game.fen());
        setLastMove({ from: m.from, to: m.to });
        const ended = describeEnd(game);
        if (ended) finish(ended);
      } catch {
        setMesaj('Bot hamle üretemedi, tekrar dene.');
      } finally {
        setBotDusunuyor(false);
      }
    }, 40);
  }, [game, botSeviye, finish]);

  const press = useCallback(
    (square: string) => {
      if (over) return;
      if (mod === 'bot' && botDusunuyor) return; // bot düşünürken dokunma
      if (selected && targets.includes(square as Square)) {
        try {
          const move = game.move({ from: selected as Square, to: square as Square, promotion: 'q' });
          setFen(game.fen());
          setLastMove({ from: move.from, to: move.to });
          setSelected(null);
          if (mod === 'mac') {
            const next = {
              ...remainingRef.current,
              [move.color]: remainingRef.current[move.color] + INCREMENT_SECONDS,
            };
            remainingRef.current = next;
            setRemaining(next);
            setRunning(true);
          }
          const ended = describeEnd(game);
          if (ended) finish(ended);
          else if (mod === 'bot') botOyna();
        } catch {
          setSelected(null);
        }
        return;
      }
      const piece = game.get(square as Square);
      setSelected(piece && piece.color === game.turn() ? square : null);
    },
    [game, mod, over, selected, targets, finish, botDusunuyor, botOyna],
  );

  // Saat: yalnızca 5+3 maçta ve maç başladıktan sonra işler.
  const ticking = mod === 'mac' && running && !over;
  useEffect(() => {
    if (!ticking) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      const turn = game.turn();
      const next = { ...remainingRef.current, [turn]: Math.max(0, remainingRef.current[turn] - dt) };
      remainingRef.current = next;
      setRemaining(next);
      if (next.w <= 0 || next.b <= 0) {
        finish({ sonuc: next.w <= 0 ? '0-1' : '1-0', sebep: 'Süre bitti' });
      }
    }, 200);
    return () => clearInterval(id);
  }, [ticking, game, finish]);

  const reset = useCallback(
    (nextMod: Mod) => {
      game.reset();
      savedRef.current = false;
      overRef.current = null;
      remainingRef.current = { w: MATCH_SECONDS, b: MATCH_SECONDS };
      setFen(game.fen());
      setMod(nextMod);
      setRemaining(remainingRef.current);
      // Maç başlar başlamaz saat işler (orijinalde sadece ilk hamleden sonra başlıyordu).
      setRunning(nextMod === 'mac');
      setOver(null);
      setSelected(null);
      setLastMove(null);
      setMesaj(null);
      setBotDusunuyor(false);
    },
    [game],
  );

  const macBaslat = useCallback(() => reset('mac'), [reset]);
  const serbestMod = useCallback(() => reset('serbest'), [reset]);

  const geriAl = useCallback(() => {
    // Maçta geri al kapalı (orijinalde de kapalı): süresi biten tarafı geri alınca
    // saat 0'da kalıp maç hemen yeniden bitiyordu.
    if (mod === 'mac' || !game.undo()) return;
    savedRef.current = false;
    overRef.current = null;
    setFen(game.fen());
    setOver(null);
    setSelected(null);
    setLastMove(null);
  }, [game, mod]);

  const teslim = useCallback(() => {
    if (mod !== 'mac' || over) return;
    finish({ sonuc: game.turn() === 'w' ? '0-1' : '1-0', sebep: 'Teslim' });
  }, [game, mod, over, finish]);

  const tarih = game.history();
  const hamleler = tarih.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' ');

  return {
    board,
    fen,
    mod,
    remaining,
    running,
    over,
    selected,
    targets,
    lastMove,
    checkSquare,
    flipped,
    mesaj,
    savedCount,
    hamleler,
    botSeviye,
    botSeviyeSec: setBotSeviye,
    botDusunuyor,
    botBaslat: () => reset('bot'),
    press,
    macBaslat,
    serbestMod,
    geriAl,
    teslim,
    cevir: () => setFlipped((f) => !f),
  };
}
