import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, layout, radius } from '@/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'cheese';
  sm?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', sm, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        sm && styles.btnSm,
        variant === 'secondary' && styles.btnSec,
        variant === 'cheese' && styles.btnCheese,
        pressed && !disabled && { transform: [{ translateY: -1 }] },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.btnText, sm && { fontSize: 13 }, variant !== 'primary' && { color: colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}

/* eyebrow: mono, büyük harf (.eyebrow) */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

/* .chip / .chip.ok / .chip.wait */
export function Chip({ label, tone = 'info' }: { label: string; tone?: 'info' | 'ok' | 'wait' }) {
  return (
    <Text
      style={[
        styles.chip,
        tone === 'ok' && { backgroundColor: colors.peri, borderColor: colors.ink },
        tone === 'wait' && { backgroundColor: colors.cheese, borderColor: colors.ink },
      ]}
    >
      {label}
    </Text>
  );
}

export function Card({ children, style, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;
}

/* .draft: kesikli çerçeveli not */
export function Draft({ children }: { children: ReactNode }) {
  return <Text style={styles.draft}>{children}</Text>;
}

/* .msg: renkli bilgi kutusu */
export function Msg({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'ok' | 'bad' }) {
  return (
    <View
      style={[
        styles.msg,
        tone === 'ok' && { backgroundColor: colors.msgOk },
        tone === 'bad' && { backgroundColor: colors.msgBad },
      ]}
    >
      <Text style={{ color: colors.ink, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

/* .clk: mono saat */
export function Clk({ value, active }: { value: string; active?: boolean }) {
  return <Text style={[styles.clk, active && styles.clkActive]}>{value}</Text>;
}

/* .phead: bulanık renk lekeli sayfa başlığı */
const BLOBS = [
  { size: 240, top: -60, right: -40, color: colors.squareDark },
  { size: 200, top: 30, left: -50, color: colors.cheese },
  { size: 180, bottom: -60, right: 70, color: colors.peri },
  { size: 200, bottom: -100, left: '42%', color: '#4f7a58' },
];

export function PageHead({ title, lead, eyebrow = 'Say Chess' }: { title: string; lead?: string; eyebrow?: string }) {
  return (
    <View style={styles.phead}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BLOBS.map((b) => (
          <View
            key={`${b.color}-${b.size}`}
            style={{
              position: 'absolute',
              width: b.size,
              height: b.size,
              borderRadius: b.size,
              opacity: 0.42,
              backgroundColor: b.color,
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
            }}
          />
        ))}
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h1}>{title}</Text>
      {lead ? <Text style={styles.lead}>{lead}</Text> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  btnSm: { paddingVertical: 5, paddingHorizontal: 13 },
  btnSec: { backgroundColor: colors.white },
  btnCheese: { backgroundColor: colors.cheese },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 14,
  },
  cardDark: { backgroundColor: colors.ink, borderColor: colors.ink },

  h1: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.ink,
  },
  h3: {
    fontFamily: fonts.serif,
    fontSize: 19,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  lead: { fontSize: 14, color: colors.ink, marginTop: 8, maxWidth: 520 },
  mut: { color: colors.mut, fontSize: 13 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 10,
    color: colors.ink,
  },

  chip: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    borderRadius: radius.chip,
    paddingVertical: 3,
    paddingHorizontal: 9,
    backgroundColor: '#0e0e1010',
    borderWidth: 1,
    borderColor: '#0e0e1033',
    color: colors.ink,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  draft: {
    backgroundColor: colors.draft,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    borderRadius: radius.input,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 12,
    color: colors.ink,
  },
  msg: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
    backgroundColor: colors.cheeseLight,
  },
  clk: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: '800',
    backgroundColor: colors.ink,
    color: colors.white,
    borderRadius: radius.clock,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 88,
    textAlign: 'center',
    overflow: 'hidden',
  },
  clkActive: { backgroundColor: colors.cheese, color: colors.ink },

  phead: {
    overflow: 'hidden',
    borderRadius: radius.head,
    padding: 22,
    marginVertical: 4,
    marginBottom: 16,
    backgroundColor: '#ffffff80',
  },

  input: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.input,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    fontSize: 15,
    color: colors.ink,
  },
  screen: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.pad,
    paddingBottom: 40,
    backgroundColor: colors.bg,
  },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: colors.mut },
  error: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
