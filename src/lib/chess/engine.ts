import { Chess, type Move } from 'chess.js';

/**
 * Basit negamax + alfa-beta motoru (index-3.html'deki demo motorun sadeleştirilmiş hali).
 * Amaç: maçtaki büyük hataları bulup ödeve çevirmek. Motor gücü düşük, sunucu gerekmiyor.
 */

const MATE = 100000;
const PIECE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

export function lan(m: { from: string; to: string; promotion?: string }) {
  return m.from + m.to + (m.promotion ?? '');
}

/** Pozisyon değeri (santipiyon, beyaz lehine +). FEN metninden tek geçişte hesaplanır. */
export function evaluateFen(fen: string): number {
  const yerlesim = fen.slice(0, fen.indexOf(' '));
  let skor = 0;
  let rank = 7;
  let file = 0;

  for (let i = 0; i < yerlesim.length; i++) {
    const c = yerlesim[i];
    if (c === '/') {
      rank--;
      file = 0;
      continue;
    }
    if (c >= '1' && c <= '8') {
      file += c.charCodeAt(0) - 48;
      continue;
    }
    const alt = c.toLowerCase();
    const deger = PIECE[alt];
    if (deger !== undefined) {
      // merkeze yakınlık 0..7; şah için bonus yok
      const merkez = 3.5 - Math.abs(3.5 - file) + (3.5 - Math.abs(3.5 - rank));
      const bonus = alt === 'k' ? 0 : Math.round(merkez * 4) - 14;
      // FEN'de büyük harf beyaz
      skor += c === alt ? -(deger + bonus) : deger + bonus;
    }
    file++;
  }
  return skor;
}

export function evaluate(g: Chess): number {
  return evaluateFen(g.fen());
}

function siraAlmaOnceligi(m: Move) {
  return m.captured ? PIECE[m.captured] * 10 : 0;
}

function negamax(g: Chess, depth: number, alpha: number, beta: number): number {
  if (g.isCheckmate()) return -MATE + depth; // sıra kimde ise mat oldu; hızlı mat tercih edilir
  if (g.isDraw()) return 0;
  if (depth <= 0) {
    const v = evaluateFen(g.fen());
    return g.turn() === 'w' ? v : -v;
  }

  const moves = g.moves({ verbose: true }).sort((a, b) => siraAlmaOnceligi(b) - siraAlmaOnceligi(a));

  let best = -Infinity;
  for (const m of moves) {
    g.move(m);
    const skor = -negamax(g, depth - 1, -beta, -alpha);
    g.undo();
    if (skor > best) best = skor;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export type RootMove = { move: Move; score: number };

/** Kök pozisyondaki tüm yasal hamleleri puanlar (sırayla: en iyi önce). */
export function searchRoot(fen: string, depth: number): { score: number; moves: RootMove[] } {
  const g = new Chess(fen);
  const moves = g.moves({ verbose: true });
  if (!moves.length) return { score: g.isCheckmate() ? -MATE : 0, moves: [] };

  const scored: RootMove[] = moves.map((m) => {
    g.move(m);
    const score = -negamax(g, depth - 1, -Infinity, Infinity);
    g.undo();
    return { move: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return { score: scored[0].score, moves: scored };
}

export type Hata = {
  ply: number;
  renk: 'w' | 'b';
  san: string;
  kayip: number;
  enIyi: { from: string; to: string; promotion?: string; san: string };
  fen: string;
};

export type Ilerleme = (yapilan: number, toplam: number) => void;

/**
 * PGN'i baştan oynatır, her hamlede en iyi hamleyi arar ve kaybı 150+ santipiyon olanları döndürür.
 * UI'ı kilitlememek için her yarım hamlede olay döngüsüne döner; `ilerleme` ile yüzde bildirilir.
 * Dönüş: en büyük 5 hata, hamle sırasına göre.
 */
export async function analyzeGamePgn(
  pgn: string,
  derinlik = 2,
  ilerleme?: Ilerleme,
): Promise<{ plies: number; hatalar: Hata[] }> {
  const kaynak = new Chess();
  kaynak.loadPgn(pgn);
  const gecmis = kaynak.history({ verbose: true });

  const replay = new Chess();
  const hatalar: Hata[] = [];

  for (let i = 0; i < gecmis.length; i++) {
    const m = gecmis[i];
    const fen = replay.fen();
    const { moves } = searchRoot(fen, derinlik);
    const oynanan = moves.find(
      (x) => x.move.from === m.from && x.move.to === m.to && (x.move.promotion ?? '') === (m.promotion ?? ''),
    );
    if (oynanan && moves.length) {
      const kayip = Math.max(0, moves[0].score - oynanan.score);
      if (kayip >= 150) {
        const enIyi = moves[0].move;
        hatalar.push({
          ply: i + 1,
          renk: m.color,
          san: m.san,
          kayip,
          enIyi: { from: enIyi.from, to: enIyi.to, promotion: enIyi.promotion, san: enIyi.san },
          fen,
        });
      }
    }
    replay.move(m.san);
    ilerleme?.(i + 1, gecmis.length);
    await new Promise((r) => setTimeout(r, 0));
  }

  const enBuyuk = [...hatalar].sort((a, b) => b.kayip - a.kayip).slice(0, 5);
  return { plies: gecmis.length, hatalar: enBuyuk.sort((a, b) => a.ply - b.ply) };
}

export function kayipEtiketi(kayip: number) {
  if (kayip >= 300) return 'büyük hata';
  if (kayip >= 150) return 'hata';
  if (kayip >= 70) return 'yanlış';
  return 'iyi';
}
