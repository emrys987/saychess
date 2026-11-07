import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { DERS_SAATLERI, sonrakiTarih, tarihYaz } from '@/features/booking/tarih';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { GUNLER, SEVIYELER, type Availability, type CoachProfile } from '@/types/database';

type Profil = { id: string; ad: string; bio: string; foto_url: string | null };
type Satir = { cp: CoachProfile; profil?: Profil };

const s = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
  iki: { flexDirection: 'row' as const, gap: 8 },
};

export default function KocBul() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [koclar, setKoclar] = useState<Satir[]>([]);
  const [secili, setSecili] = useState<string | null>(null);
  const [slotlar, setSlotlar] = useState<Availability[]>([]);
  const [seviye, setSeviye] = useState<string>('hepsi');
  const [eloMin, setEloMin] = useState('');
  const [fiyatMax, setFiyatMax] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const [{ data: cps }, { data: pr }] = await Promise.all([
        supabase.from('coach_profiles').select('*'),
        supabase.from('profiles').select('id, ad, bio, foto_url').eq('rol', 'koc'),
      ]);
      if (iptal) return;
      const map = new Map((pr ?? []).map((p: Profil) => [p.id, p]));
      setKoclar((cps ?? []).map((cp) => ({ cp, profil: map.get(cp.user_id) })));
    })();
    return () => {
      iptal = true;
    };
  }, []);

  async function kocSec(id: string) {
    setSecili(id);
    setMesaj(null);
    const { data } = await supabase.from('availability').select('*').eq('koc_id', id);
    setSlotlar(data ?? []);
  }

  async function randevuAl(kocId: string, gun: number, saat: number) {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    const tarih = sonrakiTarih(gun);
    const { error } = await supabase.from('bookings').insert({ koc_id: kocId, ogrenci_id: userId, tarih, saat });
    setMesaj(
      error
        ? error.code === '23505'
          ? 'Bu saat dolu, başka bir saat seç.'
          : hataMesaji(error)
        : `Randevu alındı: ${tarihYaz(tarih)} ${saat}:00`,
    );
    setBusy(false);
  }

  const liste = koclar.filter(
    ({ cp }) =>
      (seviye === 'hepsi' || cp.seviye === seviye) &&
      (!eloMin || (cp.elo ?? 0) >= Number(eloMin)) &&
      (!fiyatMax || cp.fiyat <= Number(fiyatMax)),
  );
  const secilen = koclar.find((k) => k.cp.user_id === secili);

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Koç Bul"
        title="Koç Bul"
        lead="Seviye, ELO ve fiyata göre filtrele; koçun müsait saatinden randevu al."
      />

      <Card>
        <Text style={ui.h3}>Filtreler</Text>
        <View style={[s.row, { marginBottom: 10 }]}>
          <Button sm title="Tümü" variant={seviye === 'hepsi' ? 'cheese' : 'secondary'} onPress={() => setSeviye('hepsi')} />
          {SEVIYELER.map((sv) => (
            <Button key={sv} sm title={sv} variant={seviye === sv ? 'cheese' : 'secondary'} onPress={() => setSeviye(sv)} />
          ))}
        </View>
        <View style={s.iki}>
          <TextInput
            style={[ui.input, { flex: 1 }]}
            value={eloMin}
            onChangeText={setEloMin}
            keyboardType="number-pad"
            placeholder="En az ELO"
          />
          <TextInput
            style={[ui.input, { flex: 1 }]}
            value={fiyatMax}
            onChangeText={setFiyatMax}
            keyboardType="number-pad"
            placeholder="En çok fiyat (TL)"
          />
        </View>
      </Card>

      <Card>
        <Text style={ui.h3}>Koçlar · {liste.length}</Text>
        {liste.length ? (
          liste.map(({ cp, profil }, i) => (
            <View key={cp.user_id} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{profil?.ad || 'İsimsiz koç'}</Text>
                <View style={[s.row, { marginTop: 4 }]}>
                  <Chip label={cp.seviye} />
                  {cp.elo ? <Chip label={`ELO ${cp.elo}`} tone="ok" /> : null}
                  {cp.tsf_belgeli ? <Chip label="TSF" tone="wait" /> : null}
                </View>
                <Text style={ui.mut}>
                  {cp.yil} yıl deneyim · {cp.fiyat} TL / 45 dk
                  {cp.puan_sayi ? ` · puan ${cp.puan_ort} (${cp.puan_sayi})` : ' · yeni'}
                </Text>
              </View>
              <Button sm title="Randevu" onPress={() => kocSec(cp.user_id)} />
            </View>
          ))
        ) : (
          <Text style={ui.mut}>
            Henüz koç yok. Koç rolüyle bir hesap açıp Profilim → Koç bilgileri bölümünü doldurun.
          </Text>
        )}
      </Card>

      {secilen ? (
        <Card style={{ borderWidth: 2, borderColor: colors.ink }}>
          <Text style={ui.h3}>{secilen.profil?.ad || 'Koç'} · müsait saatler</Text>
          {secilen.profil?.bio ? <Text style={[ui.mut, { marginBottom: 8 }]}>{secilen.profil.bio}</Text> : null}

          {slotlar.length ? (
            <View>
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
                  <Text style={[ui.mut, { width: 46 }]}>{saat}:00</Text>
                  {GUNLER.map((g, idx) => {
                    const gun = idx + 1;
                    const dolu = slotlar.some((sl) => sl.gun === gun && sl.saat === saat);
                    return (
                      <View key={g} style={{ width: 34 }}>
                        <Button
                          sm
                          title={dolu ? '●' : '·'}
                          variant={dolu ? 'cheese' : 'secondary'}
                          disabled={!dolu || busy}
                          onPress={() => randevuAl(secilen.cp.user_id, gun, saat)}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <Text style={ui.mut}>Bu koç henüz müsait saat girmemiş.</Text>
          )}

          {mesaj ? <Msg>{mesaj}</Msg> : null}
          <View style={[s.row, { marginTop: 10 }]}>
            <Button sm title="Kapat" variant="secondary" onPress={() => setSecili(null)} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
