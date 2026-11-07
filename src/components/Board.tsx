import type { Color, PieceSymbol } from 'chess.js';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

export type BoardPiece = { square: string; type: PieceSymbol; color: Color };
export type BoardCell = BoardPiece | null;

// index-3.html'deki taş sembolleri: iki renk de dolu glif, renk + gölge ile ayrışır.
const GLYPHS: Record<PieceSymbol, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

type Props = {
  board: BoardCell[][];
  selected: string | null;
  targets: readonly string[];
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  flipped?: boolean;
  disabled?: boolean;
  onSquarePress: (square: string) => void;
};

export function Board({ board, selected, targets, lastMove, checkSquare, flipped, disabled, onSquarePress }: Props) {
  const [width, setWidth] = useState(0);
  const fontSize = width ? (width / 8) * 0.68 : 28;

  const pieces = new Map<string, BoardPiece>();
  for (const row of board) for (const cell of row) if (cell) pieces.set(cell.square, cell);

  const files = flipped ? [...FILES].reverse() : FILES;
  const ranks = flipped ? [...RANKS].reverse() : RANKS;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={styles.board}
      accessibilityRole="grid"
      accessibilityLabel="Satranç tahtası"
    >
      {ranks.map((rank, rankIdx) => (
        <View key={rank} style={styles.row}>
          {files.map((file, fileIdx) => {
            const square = `${file}${rank}`;
            const piece = pieces.get(square);
            const isTarget = targets.includes(square);
            const isLight = (FILES.indexOf(file) + rank) % 2 === 0; // a8 açık, a1 koyu
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);

            return (
              <Pressable
                key={square}
                accessibilityRole="button"
                accessibilityLabel={`${square}${piece ? ` ${piece.color === 'w' ? 'beyaz' : 'siyah'} ${piece.type}` : ''}`}
                disabled={disabled}
                onPress={() => onSquarePress(square)}
                style={[
                  styles.square,
                  { backgroundColor: isLight ? colors.squareLight : colors.squareDark },
                  selected === square && styles.selected,
                  checkSquare === square && styles.check,
                ]}
              >
                {isLast ? <View style={styles.lm} pointerEvents="none" /> : null}
                {piece ? (
                  <Text
                    style={[
                      styles.piece,
                      { fontSize },
                      piece.color === 'w' ? styles.pieceWhite : styles.pieceBlack,
                    ]}
                  >
                    {GLYPHS[piece.type]}
                  </Text>
                ) : null}
                {isTarget ? <View style={styles.dot} pointerEvents="none" /> : null}
                {fileIdx === 0 ? <Text style={styles.rank}>{rank}</Text> : null}
                {rankIdx === ranks.length - 1 ? <Text style={styles.file}>{file}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: radius.board,
    overflow: 'hidden',
    backgroundColor: '#000',
    gap: 1,
  },
  row: { flex: 1, flexDirection: 'row', gap: 1 },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  piece: { includeFontPadding: false, textAlign: 'center' },
  // .p.w / .p.b: krem taş + siyah kontur (RN'de stroke yerine 0 ofsetli gölge)
  pieceWhite: {
    color: colors.pieceWhite,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.6,
  },
  pieceBlack: {
    color: colors.pieceBlack,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.1,
  },
  selected: { backgroundColor: colors.pink },
  lm: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.lastMove },
  check: { backgroundColor: colors.check },
  dot: {
    position: 'absolute',
    width: '26%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#0e0e1055',
  },
  rank: {
    position: 'absolute',
    left: 3,
    top: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    fontFamily: fonts.mono,
  },
  file: {
    position: 'absolute',
    right: 3,
    bottom: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    fontFamily: fonts.mono,
  },
});
