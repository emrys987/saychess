import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { saatYaz, tarihYaz } from '@/features/booking/tarih';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import type { Booking } from '@/types/database';

const s = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
  stat: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 8 },
};

type Ozet = { odevToplam: number; odevCozulen: number; mac: number; dersler: Booking[] };

export default function VeliPaneli() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const veliMi = profile?.rol === 'veli';
  const [cocuklar, setCocuklar] = useState<{ id: string; ad: string }[]>([]);
  const [secili, setSecili] = useState<string | null>(null);
  const [ozet, setOzet] = useState<{ ogrenci: string; veri: Ozet } | null>(null);
  const [kod, setKod] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [yenile, setYenile] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    (async () => {
      const { data, error } = await supabase.rpc('cocuklarim');
      if (iptal) return;
      if (error) {
        setMesaj(hataMesaji(error));
        return;
      }
      const liste = data ?? [];
      setCocuklar(liste);
      setSecili((onceki) => onceki ?? liste[0]?.id ?? null);
    })();
    return () => {
      iptal = true;
    };
  }, [userId, yenile]);

  useEffect(() => {
    if (!secili) return;
    let iptal = false;
    (async () => {
      const [{ data: hw }, { data: gm }, { data: bk }] = await Promise.all([
        supabase.from('homework').select('id, durum').eq('ogrenci_id', secili),
        supabase.from('games').select('id').eq('beyaz_id', secili),
        supabase
          .from('bookings')
          .select('*')
          .eq('ogrenci_id', secili)
          .eq('durum', 'onaylandi')
          .order('tarih')
          .order('saat'),
      ]);
      if (iptal) return;
      const odev = hw ?? [];
      setOzet({
        ogrenci: secili,
        veri: {
          odevToplam: odev.length,
          odevCozulen: odev.filter((h) => h.durum === 'cozuldu').length,
          mac: (gm ?? []).length,
          dersler: bk ?? [],
        },
      });
    })();
    return () => {
      iptal = true;
    };
  }, [secili, yenile]);

  async function baglan() {
    setBusy(true);
    setMesaj(null);
    const { data, error } = await supabase.rpc('veli_bagkur', { p_kod: kod.trim() });
    setBusy(false);
    if (error) {
      setMesaj(hataMesaji(error));
      return;
    }
    if (!data) {
      // Sunucu, kod bulunamadığında veya çok fazla yanlış denemede null döner.
      setMesaj('Kod bulunamadı. Çok sık denediysen 30 dakika sonra tekrar dene.');
      return;
    }
    setKod('');
    setMesaj(`Bağlandı: ${data}`);
    setYenile((n) => n + 1);
  }

  const cocuk = cocuklar.find((c) => c.id === secili);
  const veri = ozet?.ogrenci === secili ? ozet.veri : null;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Veli Paneli"
        title="Veli Paneli"
        lead="Çocuğunun ödev, maç ve ders özeti. Bağlanmak için çocuğunun profilindeki veli kodunu gir."
      />

      {veliMi ? (
        <Card>
          <Text style={ui.h3}>Çocuğa bağlan</Text>
          <Text style={[ui.mut, { marginBottom: 8 }]}>
            Çocuğun Profilim → “Veli davet kodu” bölümünden 10 haneli kodu al ve buraya yaz.
          </Text>
          <TextInput
            style={[ui.input, { marginBottom: 10 }]}
            value={kod}
            onChangeText={setKod}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            placeholder="Örn. A1B2C3D4E5"
          />
          <Button
            title={busy ? 'Bağlanıyor…' : 'Bağlan'}
            onPress={baglan}
            disabled={busy || kod.trim().length < 10}
          />
        </Card>
      ) : (
        <Msg>Bu ekran veli rolü için. Veli hesabıyla giriş yapınca kod alanı görünür.</Msg>
      )}

      {mesaj ? <Msg>{mesaj}</Msg> : null}

      {cocuklar.length ? (
        <Card>
          <Text style={ui.h3}>Çocuklar</Text>
          <View style={s.row}>
            {cocuklar.map((c) => (
              <Button
                key={c.id}
                sm
                title={c.ad || 'İsimsiz'}
                variant={secili === c.id ? 'cheese' : 'secondary'}
                onPress={() => setSecili(c.id)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {cocuk ? (
        <Card>
          <View style={s.head}>
            <Text style={ui.h3}>{cocuk.ad || 'Öğrenci'} · özet</Text>
            <Chip label="son durum" tone="ok" />
          </View>
          {veri ? (
            <>
              <View style={s.stat}>
                <Text style={{ color: colors.ink, fontWeight: '600' }}>Çözülen ödev</Text>
                <Text style={{ fontWeight: '800', color: colors.ink }}>
                  {veri.odevCozulen}/{veri.odevToplam}
                </Text>
              </View>
              <View style={s.stat}>
                <Text style={{ color: colors.ink, fontWeight: '600' }}>Oynanan maç</Text>
                <Text style={{ fontWeight: '800', color: colors.ink }}>{veri.mac}</Text>
              </View>
              <View style={s.stat}>
                <Text style={{ color: colors.ink, fontWeight: '600' }}>Yaklaşan ders</Text>
                <Text style={{ fontWeight: '800', color: colors.ink }}>{veri.dersler.length}</Text>
              </View>
              {veri.dersler.length ? (
                <Text style={[ui.mut, { marginTop: 6 }]}>
                  Sıradaki: {tarihYaz(veri.dersler[0].tarih)} · {saatYaz(veri.dersler[0].saat)}
                </Text>
              ) : (
                <Text style={[ui.mut, { marginTop: 6 }]}>Planlanmış ders yok.</Text>
              )}
            </>
          ) : (
            <Text style={ui.mut}>Yükleniyor…</Text>
          )}
        </Card>
      ) : null}

      <Card dark>
        <Text style={[ui.h3, { color: colors.cheese }]}>Not</Text>
        <Text style={{ color: '#ffffffd9', fontSize: 14, lineHeight: 20 }}>
          Veli, çocuğunun yalnızca özetini görür; ödev çözümleri ve maç içerikleri gösterilmez. Ders sonu
          puanlamayı Takvim sekmesinden yapabilirsin.
        </Text>
      </Card>
    </ScrollView>
  );
}
