import { Chess, type Square } from 'chess.js';
import { getRandomBytes } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { LiveSession } from '@/types/database';

const HARFLER = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Kriptografik rastgele kod (Math.random tahmin edilebilir). */
function kodUret() {
  const baytlar = getRandomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += HARFLER[baytlar[i] % HARFLER.length];
  return s;
}

export function useLiveDers(userId: string | undefined) {
  const [oturum, setOturum] = useState<LiveSession | null>(null);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [secili, setSecili] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bagli, setBagli] = useState(false);
  const [busy, setBusy] = useState(false);
  const sonPly = useRef(0);

  const game = useMemo(() => new Chess(fen), [fen]);
  const targets = useMemo(
    () => (secili ? game.moves({ square: secili as Square, verbose: true }).map((m) => m.to) : []),
    [game, secili],
  );

  /** Gelen hamleyi uygular; aynı ply iki kez uygulanmaz. */
  function uygula(san: string, ply: number) {
    if (ply <= sonPly.current) return;
    sonPly.current = ply;
    setFen((onceki) => {
      const g = new Chess(onceki);
      try {
        g.move(san);
      } catch {
        return onceki;
      }
      return g.fen();
    });
  }

  // Oturuma girince eski hamleleri yükle + realtime dinle
  const oturumId = oturum?.id;
  useEffect(() => {
    if (!oturumId) return;
    let iptal = false;

    (async () => {
      const { data } = await supabase
        .from('live_moves')
        .select('*')
        .eq('session_id', oturumId)
        .order('ply', { ascending: true });
      if (iptal || !data) return;
      let s = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const g = new Chess(s);
      for (const m of data) {
        try {
          g.move(m.san);
        } catch {
          continue;
        }
        sonPly.current = m.ply;
      }
      s = g.fen();
      setFen(s);
    })();

    const kanal = supabase
      .channel(`canli:${oturumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_moves', filter: `session_id=eq.${oturumId}` },
        (payload) => {
          const m = payload.new as { san: string; ply: number };
          uygula(m.san, m.ply);
        },
      )
      .subscribe((durum) => setBagli(durum === 'SUBSCRIBED'));

    return () => {
      iptal = true;
      setBagli(false);
      void supabase.removeChannel(kanal);
    };
  }, [oturumId]);

  async function olustur() {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    const kod = kodUret();
    const { data, error } = await supabase
      .from('live_sessions')
      .insert({ kod, beyaz_id: userId })
      .select('*')
      .single();
    setBusy(false);
    if (error) {
      setMesaj(error.message);
      return;
    }
    setOturum(data);
  }

  async function katil(girilen: string) {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    // Katılma sunucu tarafında atomik yapılır: bekleyen ders listesi istemciye
    // açılmadığı için kod tahmini / başkasının dersini ele geçirme engellenir.
    const { data, error } = await supabase.rpc('live_katil', { p_kod: girilen.trim().toUpperCase() });
    setBusy(false);
    if (error || !data) {
      setMesaj(error?.message ?? 'Bu kodla açık ders bulunamadı.');
      return;
    }
    setOturum(data);
  }

  async function hamleYap(square: string) {
    if (!oturum || !userId) return;
    const benimRengim = oturum.beyaz_id === userId ? 'w' : 'b';
    if (game.turn() !== benimRengim) {
      setMesaj('Sıra rakipte.');
      setSecili(null);
      return;
    }

    if (secili && targets.includes(square as Square)) {
      let san: string;
      let tasinan: { from: string; to: string; promotion?: string };
      try {
        const kopya = new Chess(fen);
        const m = kopya.move({ from: secili as Square, to: square as Square, promotion: 'q' });
        san = m.san;
        tasinan = { from: m.from, to: m.to, promotion: m.promotion };
      } catch {
        setSecili(null);
        return;
      }
      setSecili(null);
      const ply = sonPly.current + 1;
      uygula(san, ply);
      const { error } = await supabase.from('live_moves').insert({
        session_id: oturum.id,
        ply,
        san,
        from_sq: tasinan.from,
        to_sq: tasinan.to,
        promotion: tasinan.promotion ?? null,
        user_id: userId,
      });
      if (error && error.code !== '23505') setMesaj(error.message);
      return;
    }

    const tas = game.get(square as Square);
    setSecili(tas && tas.color === game.turn() ? square : null);
  }

  function ayril() {
    setOturum(null);
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setSecili(null);
    setMesaj(null);
    sonPly.current = 0;
  }

  const benimRengim: 'w' | 'b' = oturum && oturum.beyaz_id === userId ? 'w' : 'b';
  const hamleler = game.history();

  return {
    oturum,
    fen,
    board: game.board(),
    secili,
    targets,
    mesaj,
    bagli,
    busy,
    benimRengim,
    sira: game.turn(),
    hamleler,
    press: hamleYap,
    olustur,
    katil,
    ayril,
  };
}
