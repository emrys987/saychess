import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';

import { Card, Chip, PageHead, Msg, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { visibleNavItems } from '@/features/auth/navigation';
import { saatYaz, tarihYaz } from '@/features/booking/tarih';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/theme';

type ReminderBooking = { id: string; tarih: string; saat: number };
type ReminderHomework = { id: string; baslik: string; created_at: string };

// Future tile artwork can be added here without changing the dashboard layout.
const HOME_TILE_IMAGES: Partial<Record<string, ImageSourcePropType>> = {};

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session, profile } = useAuth();
  const [randevular, setRandevular] = useState<ReminderBooking[]>([]);
  const [odevler, setOdevler] = useState<ReminderHomework[]>([]);
  const [randevuSayisi, setRandevuSayisi] = useState(0);
  const [odevSayisi, setOdevSayisi] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const genis = width >= 900;
  const links = visibleNavItems(profile?.rol).filter(
    (item) => item.href !== '/' && item.href !== '/koc' && item.href !== '/paketler',
  );

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !profile?.rol) return;
    let cancelled = false;

    (async () => {
      setYukleniyor(true);
      setHata(null);
      const bugun = new Date();
      const bugunIso = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`;
      const simdiDakika = bugun.getHours() * 60 + bugun.getMinutes();
      let ogrenciIdleri: string[] | null = null;

      if (profile.rol === 'veli') {
        const { data, error } = await supabase.rpc('cocuklarim');
        if (error) throw error;
        ogrenciIdleri = (data ?? []).map((cocuk) => cocuk.id);
      }

      if (ogrenciIdleri?.length === 0) {
        if (!cancelled) {
          setRandevular([]);
          setOdevler([]);
          setRandevuSayisi(0);
          setOdevSayisi(0);
          setYukleniyor(false);
        }
        return;
      }

      let randevuQuery = supabase
        .from('bookings')
        .select('id, tarih, saat')
        .eq('durum', 'onaylandi')
        .gte('tarih', bugunIso)
        .order('tarih')
        .order('saat');
      let odevQuery = supabase
        .from('homework')
        .select('id, baslik, created_at', { count: 'exact' })
        .eq('durum', 'bekliyor')
        .order('created_at', { ascending: false })
        .limit(4);

      if (ogrenciIdleri) {
        randevuQuery = randevuQuery.in('ogrenci_id', ogrenciIdleri) as typeof randevuQuery;
        odevQuery = odevQuery.in('ogrenci_id', ogrenciIdleri) as typeof odevQuery;
      }

      const [
        { data: bookings, error: bookingError },
        { data: homework, error: homeworkError, count: homeworkCount },
      ] = await Promise.all([
        randevuQuery,
        odevQuery,
      ]);
      if (bookingError) throw bookingError;
      if (homeworkError) throw homeworkError;
      if (cancelled) return;
      const upcoming = (bookings ?? []).filter(
        (booking) => booking.tarih > bugunIso || (booking.tarih === bugunIso && booking.saat * 60 >= simdiDakika),
      );
      setRandevular(upcoming.slice(0, 4));
      setOdevler(homework ?? []);
      setRandevuSayisi(upcoming.length);
      setOdevSayisi(homeworkCount ?? 0);
      setYukleniyor(false);
    })().catch((err: unknown) => {
      if (cancelled) return;
      setHata(hataMesaji(err));
      setYukleniyor(false);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, profile?.rol]);

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead title={`Merhaba${profile?.ad ? `, ${profile.ad}` : ''}`} lead="Bugün ne yapmak istersin?" />

      <View style={[s.layout, genis && s.layoutWide]}>
        <View style={[s.main, genis && s.mainWide]}>
          <Text style={[ui.eyebrow, s.sectionLabel]}>Başlamak için</Text>
          <View style={s.grid}>
            {links.map((item) => {
              const image = HOME_TILE_IMAGES[item.href];
              return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                onPress={() => router.navigate(item.href as Href)}
                style={({ pressed }) => [s.tile, pressed && s.tilePressed]}
              >
                {image ? <Image source={image} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
                {image ? <View pointerEvents="none" style={s.imageWash} /> : null}
                <Text style={s.icon}>{item.icon}</Text>
                <Text style={s.tileTitle}>{item.label}</Text>
                <Text style={s.tileDescription}>{item.description}</Text>
              </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[s.reminders, genis && s.remindersWide]}>
          <Card>
            <View style={s.cardHead}>
              <Text style={ui.h3}>Yaklaşan dersler</Text>
              <Chip label={String(randevuSayisi)} />
            </View>
            {yukleniyor ? <Text style={ui.mut}>Hatırlatıcılar yükleniyor…</Text> : null}
            {!yukleniyor && randevular.length === 0 ? <Text style={ui.mut}>Yaklaşan dersin yok.</Text> : null}
            {randevular.map((randevu) => (
              <View key={randevu.id} style={s.reminderItem}>
                <Text style={s.reminderTitle}>{tarihYaz(randevu.tarih)}</Text>
                <Text style={ui.mut}>{saatYaz(randevu.saat)}</Text>
              </View>
            ))}
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/takvim')}>
              <Text style={s.link}>Takvime git →</Text>
            </Pressable>
          </Card>

          <Card>
            <View style={s.cardHead}>
              <Text style={ui.h3}>Bekleyen ödevler</Text>
              <Chip label={String(odevSayisi)} tone={odevSayisi ? 'wait' : 'ok'} />
            </View>
            {yukleniyor ? <Text style={ui.mut}>Hatırlatıcılar yükleniyor…</Text> : null}
            {!yukleniyor && odevler.length === 0 ? <Text style={ui.mut}>Bekleyen ödevin yok.</Text> : null}
            {odevler.map((odev) => (
              <View key={odev.id} style={s.reminderItem}>
                <Text style={s.reminderTitle}>{odev.baslik}</Text>
              </View>
            ))}
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/odev')}>
              <Text style={s.link}>Ödevlere git →</Text>
            </Pressable>
          </Card>
          {hata ? <Msg tone="bad">Hatırlatıcılar alınamadı: {hata}</Msg> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  layout: { width: '100%', gap: 12 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { width: '100%' },
  mainWide: { flex: 2 },
  reminders: { width: '100%' },
  remindersWide: { flex: 1 },
  sectionLabel: { marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    overflow: 'hidden',
    width: '48%',
    minHeight: 140,
    flexGrow: 1,
    flexBasis: '42%',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.card,
    padding: 16,
  },
  tilePressed: { backgroundColor: colors.pink, transform: [{ translateY: -1 }] },
  imageWash: { ...StyleSheet.absoluteFill, backgroundColor: '#fffaf0cc' },
  icon: { fontSize: 28, lineHeight: 34, color: colors.ink, marginBottom: 8 },
  tileTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  tileDescription: { color: colors.mut, fontSize: 13, lineHeight: 18 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderItem: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 9, gap: 2 },
  reminderTitle: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  link: { color: colors.ink, fontWeight: '800', marginTop: 8 },
});
