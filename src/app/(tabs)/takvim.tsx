import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { DERS_SAATLERI, saatYaz, tarihYaz } from '@/features/booking/tarih';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { GUNLER, type Availability, type Booking } from '@/types/database';
import { colors } from '@/theme';

const s = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
};

export default function Takvim() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const kocMu = profile?.rol === 'koc';
  const [slotlar, setSlotlar] = useState<Availability[]>([]);
  const [randevular, setRandevular] = useState<Booking[]>([]);
  const [isimler, setIsimler] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [yenile, setYenile] = useState(0);
  // Ders sonu puanlama
  const [puanlanan, setPuanlanan] = useState<string[]>([]);
  const [puanHedef, setPuanHedef] = useState<string | null>(null);
  const [puan, setPuan] = useState(5);
  const [yorum, setYorum] = useState('');

  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    (async () => {
      if (kocMu) {
        const { data } = await supabase.from('availability').select('*').eq('koc_id', userId);
        if (!iptal) setSlotlar(data ?? []);
      }
      const { data: bk } = await supabase.from('bookings').select('*').order('tarih').order('saat');
      if (iptal || !bk) return;
      setRandevular(bk);

      const karsiIdler = [...new Set(bk.map((b) => (b.koc_id === userId ? b.ogrenci_id : b.koc_id)))];
      if (!karsiIdler.length) return;
      const { data: pr } = await supabase.from('profiles').select('id, ad').in('id', karsiIdler);
      if (iptal) return;
      setIsimler(Object.fromEntries((pr ?? []).map((p) => [p.id, p.ad])));

      const { data: rv } = await supabase.from('reviews').select('booking_id').eq('yazan_id', userId);
      if (iptal) return;
      setPuanlanan((rv ?? []).map((r) => r.booking_id));
    })();
    return () => {
      iptal = true;
    };
  }, [userId, kocMu, yenile]);

  async function slotDegistir(gun: number, saat: number) {
    if (!userId) return;
    const varOlan = slotlar.find((sl) => sl.gun === gun && sl.saat === saat);
    if (varOlan) {
      await supabase.from('availability').delete().eq('id', varOlan.id);
    } else {
      await supabase.from('availability').insert({ koc_id: userId, gun, saat });
    }
    setYenile((n) => n + 1);
  }

  async function iptalEt(id: string) {
    setBusy(true);
    await supabase.from('bookings').update({ durum: 'iptal' }).eq('id', id);
    setMesaj('Randevu iptal edildi.');
    setBusy(false);
    setYenile((n) => n + 1);
  }

  async function puanVer(bookingId: string, kocId: string) {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from('reviews').insert({
      booking_id: bookingId,
      koc_id: kocId,
      yazan_id: userId,
      puan,
      yorum: yorum.trim(),
    });
    setBusy(false);
    setMesaj(error ? (error.code === '23505' ? 'Bu dersi zaten puanladın.' : hataMesaji(error)) : 'Puanın kaydedildi.');
    setPuanHedef(null);
    setYorum('');
    setPuan(5);
    setYenile((n) => n + 1);
  }

  const aktif = randevular.filter((b) => b.durum === 'onaylandi');
  const gecmis = randevular.filter((b) => b.durum !== 'onaylandi');

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Takvim"
        title={kocMu ? 'Müsait saatlerim' : 'Randevularım'}
        lead={
          kocMu
            ? 'Haftalık müsait saatlerini işaretle. Ders 45 dk + 15 dk maç tamponu olarak planlanır.'
            : 'Aldığın dersler burada. Koç Bul sekmesinden yeni randevu alabilirsin.'
        }
      />

      {kocMu ? (
        <Card>
          <View style={s.head}>
            <Text style={ui.h3}>Haftalık müsaitlik</Text>
            <Chip label={`${slotlar.length} saat`} tone="ok" />
          </View>
          <View style={s.row}>
            <Text style={[ui.mut, { width: 46 }]} />
            {GUNLER.map((g) => (
              <Text key={g} style={[ui.mut, { width: 34, textAlign: 'center', fontWeight: '700' }]}>
                {g}
              </Text>
            ))}
          </View>
          {DERS_SAATLERI.map((saat) => (
            <View key={saat} style={[s.row, { marginTop: 4 }]}>
              <Text style={[ui.mut, { width: 46 }]}>{saatYaz(saat)}</Text>
              {GUNLER.map((g, idx) => {
                const gun = idx + 1;
                const on = slotlar.some((sl) => sl.gun === gun && sl.saat === saat);
                return (
                  <View key={g} style={{ width: 34 }}>
                    <Button
                      sm
                      title={on ? '●' : '·'}
                      variant={on ? 'cheese' : 'secondary'}
                      onPress={() => slotDegistir(gun, saat)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
          <Text style={[ui.mut, { marginTop: 10 }]}>Kareye dokun: aç / kapat. Değişiklik hemen kaydedilir.</Text>
        </Card>
      ) : null}

      {mesaj ? <Msg>{mesaj}</Msg> : null}

      <Card>
        <View style={s.head}>
          <Text style={ui.h3}>Yaklaşan dersler</Text>
          <Chip label={`${aktif.length} kayıt`} tone="ok" />
        </View>
        {aktif.length ? (
          aktif.map((b, i) => {
            const karsi = b.koc_id === userId ? b.ogrenci_id : b.koc_id;
            return (
              <View key={b.id} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>
                    {tarihYaz(b.tarih)} · {saatYaz(b.saat)}
                  </Text>
                  <Text style={ui.mut}>
                    {kocMu ? 'Öğrenci' : 'Koç'}: {isimler[karsi] || '—'} · 45 dk
                  </Text>
                </View>
                <Button sm title="İptal" variant="secondary" onPress={() => iptalEt(b.id)} disabled={busy} />
                {profile?.rol === 'ogrenci' && !puanlanan.includes(b.id) ? (
                  <Button sm title="Puanla" onPress={() => setPuanHedef(b.id)} />
                ) : null}
              </View>
            );
          })
        ) : (
          <Text style={ui.mut}>
            {kocMu ? 'Henüz randevu yok. Müsait saat ekledikçe öğrenciler randevu alabilir.' : 'Randevu yok. Koç Bul sekmesinden saat seç.'}
          </Text>
        )}
      </Card>

      {puanHedef ? (
        <Card style={{ borderWidth: 2, borderColor: colors.ink }}>
          <Text style={ui.h3}>Dersi puanla</Text>
          <View style={[s.row, { marginBottom: 10 }]}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Button key={n} sm title={String(n)} variant={puan === n ? 'cheese' : 'secondary'} onPress={() => setPuan(n)} />
            ))}
          </View>
          <TextInput
            style={[ui.input, { minHeight: 70, textAlignVertical: 'top', marginBottom: 10 }]}
            value={yorum}
            onChangeText={setYorum}
            multiline
            placeholder="Yorum (isteğe bağlı)"
          />
          <View style={s.row}>
            <Button
              sm
              title={busy ? 'Kaydediliyor…' : 'Kaydet'}
              onPress={() => {
                const b = randevular.find((x) => x.id === puanHedef);
                if (b) void puanVer(b.id, b.koc_id);
              }}
              disabled={busy}
            />
            <Button sm title="Vazgeç" variant="secondary" onPress={() => setPuanHedef(null)} />
          </View>
        </Card>
      ) : null}

      {gecmis.length ? (
        <Card>
          <Text style={ui.h3}>İptal edilenler</Text>
          {gecmis.map((b, i) => (
            <View key={b.id} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
              <Text style={ui.mut}>
                {tarihYaz(b.tarih)} · {saatYaz(b.saat)}
              </Text>
              <Chip label="iptal" />
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}
