import { Chess, type Square } from 'chess.js';
import { getRandomBytes } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { LiveSession } from '@/types/database';

const BASLANGIC_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const HARFLER = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export type OdaTuru = 'ders' | 'oyun';
export type SaatModu = 'yok' | '5+3';

/** Kriptografik rastgele kod (Math.random tahmin edilebilir). */
function kodUret() {
  const baytlar = getRandomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += HARFLER[baytlar[i] % HARFLER.length];
  return s;
}

function bitisBilgisi(game: Chess) {
  if (game.isCheckmate()) return { sonuc: game.turn() === 'w' ? '0-1' : '1-0', sebep: 'Mat' };
  if (game.isDraw() || game.isGameOver()) return { sonuc: '1/2-1/2', sebep: 'Beraberlik' };
  return null;
}

function sonucBilgisi(game: Chess, sebep: string) {
  if (sebep === 'Beraberlik') return '1/2-1/2';
  return game.turn() === 'w' ? '0-1' : '1-0';
}

export function useLiveDers(userId: string | undefined, odaTuru: OdaTuru = 'ders') {
  const [oturum, setOturum] = useState<LiveSession | null>(null);
  const [fen, setFen] = useState(BASLANGIC_FEN);
  const [secili, setSecili] = useState<string | null>(null);
  const [sonHamle, setSonHamle] = useState<{ from: string; to: string } | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bagli, setBagli] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clockNow, setClockNow] = useState(0);
  const [serverSaatFarki, setServerSaatFarki] = useState(0);
  const sonPly = useRef(0);
  const bitisIstendi = useRef(false);

  const game = useMemo(() => new Chess(fen), [fen]);
  const oturumUygula = useCallback((next: LiveSession) => {
    setOturum(next);
    const serverUpdatedAt = new Date(next.updated_at).getTime();
    if (Number.isFinite(serverUpdatedAt)) setServerSaatFarki(Date.now() - serverUpdatedAt);
  }, []);
  const targets = useMemo(
    () => (secili ? game.moves({ square: secili as Square, verbose: true }).map((move) => move.to) : []),
    [game, secili],
  );

  function uygula(san: string, ply: number, from: string, to: string) {
    if (ply <= sonPly.current) return;
    sonPly.current = ply;
    setSonHamle({ from, to });
    setFen((previous) => {
      const current = new Chess(previous);
      try {
        current.move(san);
      } catch {
        return previous;
      }
      return current.fen();
    });
  }

  const oyunBitir = useCallback(
    async (sebep: string, position: Chess, plies: number) => {
      if (!oturum || odaTuru !== 'oyun' || !userId || oturum.durum === 'bitti' || bitisIstendi.current) return;
      bitisIstendi.current = true;
      const sonuc = sonucBilgisi(position, sebep);
      position.setHeader('Event', 'Say Chess multiplayer');
      position.setHeader('Result', sonuc);
      const { data, error } = await supabase.rpc('live_oyun_bitir', {
        p_session_id: oturum.id,
        p_bitis_sebebi: sebep,
        p_pgn: position.pgn(),
        p_plies: plies,
      });
      if (error) {
        bitisIstendi.current = false;
        setMesaj(error.message);
        return;
      }
      if (data) setOturum(data);
    },
    [odaTuru, oturum, userId],
  );

  // Hamle geçmişini yükle ve hem hamleleri hem de saat/oda güncellemelerini dinle.
  const oturumId = oturum?.id;
  useEffect(() => {
    if (!oturumId) return;
    let cancelled = false;
    sonPly.current = 0;
    bitisIstendi.current = false;

    (async () => {
      const [{ data: moves, error: movesError }, { data: session, error: sessionError }] = await Promise.all([
        supabase
          .from('live_moves')
          .select('ply, san, from_sq, to_sq')
          .eq('session_id', oturumId)
          .order('ply', { ascending: true }),
        supabase.from('live_sessions').select('*').eq('id', oturumId).single(),
      ]);
      if (cancelled) return;
      if (movesError || sessionError) {
        setMesaj(movesError?.message ?? sessionError?.message ?? 'Oda verileri alınamadı.');
        return;
      }
      const nextGame = new Chess(BASLANGIC_FEN);
      let lastMove: { from: string; to: string } | null = null;
      for (const move of moves ?? []) {
        try {
          nextGame.move(move.san);
          sonPly.current = move.ply;
          lastMove = { from: move.from_sq, to: move.to_sq };
        } catch {
          continue;
        }
      }
      setFen(nextGame.fen());
      setSonHamle(lastMove);
      oturumUygula(session);
    })();

    const channel = supabase
      .channel(`canli:${oturumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_moves', filter: `session_id=eq.${oturumId}` },
        (payload) => {
          const move = payload.new as { san: string; ply: number; from_sq: string; to_sq: string };
          uygula(move.san, move.ply, move.from_sq, move.to_sq);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${oturumId}` },
        (payload) => {
          oturumUygula(payload.new as LiveSession);
        },
      )
      .subscribe((status) => setBagli(status === 'SUBSCRIBED'));

    return () => {
      cancelled = true;
      setBagli(false);
      void supabase.removeChannel(channel);
    };
  }, [oturumId, oturumUygula]);

  const saatAktif = odaTuru === 'oyun' && oturum?.durum === 'aktif' && oturum.saat_modu === '5+3' && !!oturum.saat_basladi_at;
  const kalan = useMemo(() => {
    if (!oturum) return { w: 300, b: 300 };
    if (!saatAktif) return { w: oturum.beyaz_saniye, b: oturum.siyah_saniye };
    const turn = new Chess(fen).turn();
    const serverNow = clockNow === 0 ? new Date(oturum.saat_basladi_at as string).getTime() : clockNow - serverSaatFarki;
    const elapsed = Math.max(0, (serverNow - new Date(oturum.saat_basladi_at as string).getTime()) / 1000);
    return {
      w: Math.max(0, oturum.beyaz_saniye - (turn === 'w' ? elapsed : 0)),
      b: Math.max(0, oturum.siyah_saniye - (turn === 'b' ? elapsed : 0)),
    };
  }, [clockNow, fen, oturum, saatAktif, serverSaatFarki]);

  // Sunucu saati, hamle sırası ve kaydedilmiş kalan süre birlikte kullanılır.
  useEffect(() => {
    if (!saatAktif || !oturum) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      const turn = new Chess(fen).turn();
      const elapsed = Math.max(0, (now - serverSaatFarki - new Date(oturum.saat_basladi_at as string).getTime()) / 1000);
      const remaining = (turn === 'w' ? oturum.beyaz_saniye : oturum.siyah_saniye) - elapsed;
      if (remaining <= 0) void oyunBitir('Süre bitti', new Chess(fen), oturum.plies);
    }, 200);
    return () => clearInterval(interval);
  }, [fen, oyunBitir, oturum, saatAktif, serverSaatFarki]);

  async function olustur(saatModu: SaatModu = 'yok') {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    bitisIstendi.current = false;
    const kod = kodUret();
    const { data, error } = await supabase
      .from('live_sessions')
      .insert({ kod, beyaz_id: userId, oyun_turu: odaTuru, saat_modu: odaTuru === 'oyun' ? saatModu : 'yok' })
      .select('*')
      .single();
    setBusy(false);
    if (error) {
      setMesaj(error.message);
      return;
    }
    oturumUygula(data);
  }

  async function katil(girilen: string) {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    const { data, error } = await supabase.rpc('live_katil', {
      p_kod: girilen.trim().toUpperCase(),
      p_oyun_turu: odaTuru,
    });
    setBusy(false);
    if (error || !data) {
      setMesaj(error?.message ?? 'Bu kodla açık oda bulunamadı.');
      return;
    }
    bitisIstendi.current = false;
    oturumUygula(data);
  }

  async function hamleYap(square: string) {
    if (!oturum || !userId || oturum.durum === 'bitti') return;
    if (!oturum.siyah_id) {
      setMesaj('Rakibin katılınca oyun başlayacak.');
      return;
    }
    const benimRengim = oturum.beyaz_id === userId ? 'w' : 'b';
    if (game.turn() !== benimRengim) {
      setMesaj('Sıra rakipte.');
      setSecili(null);
      return;
    }

    if (secili && targets.includes(square as Square)) {
      let moveSan: string;
      let moveData: { from: string; to: string; promotion?: string };
      const nextGame = new Chess(fen);
      try {
        const move = nextGame.move({ from: secili as Square, to: square as Square, promotion: 'q' });
        moveSan = move.san;
        moveData = { from: move.from, to: move.to, promotion: move.promotion };
      } catch {
        setSecili(null);
        return;
      }
      setSecili(null);
      setSonHamle({ from: moveData.from, to: moveData.to });
      const ply = sonPly.current + 1;
      sonPly.current = ply;
      setFen(nextGame.fen());
      nextGame.setHeader('Event', odaTuru === 'oyun' ? 'Say Chess multiplayer' : 'Say Chess canlı ders');
      if (odaTuru === 'oyun') nextGame.setHeader('Result', '*');
      const { data, error } = await supabase.rpc('live_hamle_yap', {
        p_session_id: oturum.id,
        p_ply: ply,
        p_san: moveSan,
        p_from: moveData.from,
        p_to: moveData.to,
        p_promotion: moveData.promotion ?? null,
        p_fen: nextGame.fen(),
        p_pgn: nextGame.pgn(),
      });
      if (error) {
        setFen(oturum.fen);
        sonPly.current = Math.max(0, ply - 1);
        setMesaj(error.message);
        return;
      }
      if (data) oturumUygula(data);
      setMesaj(null);
      if (odaTuru === 'oyun') {
        const end = bitisBilgisi(nextGame);
        if (end) await oyunBitir(end.sebep, nextGame, ply);
      }
      return;
    }

    const piece = game.get(square as Square);
    setSecili(piece && piece.color === game.turn() ? square : null);
  }

  function ayril() {
    setOturum(null);
    setFen(BASLANGIC_FEN);
    setSecili(null);
    setSonHamle(null);
    setMesaj(null);
    sonPly.current = 0;
    bitisIstendi.current = false;
  }

  const teslim = useCallback(async () => {
    await oyunBitir('Teslim', new Chess(fen), sonPly.current);
  }, [fen, oyunBitir]);

  return {
    oturum,
    fen,
    board: game.board(),
    secili,
    targets,
    sonHamle,
    mesaj,
    bagli,
    busy,
    kalan,
    benimRengim: oturum && oturum.beyaz_id === userId ? 'w' : 'b',
    sira: game.turn(),
    hamleler: game.history(),
    press: hamleYap,
    olustur,
    katil,
    ayril,
    teslim,
  };
}
