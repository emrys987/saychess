import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/theme';
import type { CoachProfile } from '@/types/database';

type Profil = { id: string; ad: string; bio: string; foto_url: string | null; rol: string | null };
type KocDetay = { cp: CoachProfile; profil?: Profil };

type Filtre = 'beklemede' | 'onaylandi' | 'reddedildi' | 'hepsi';

export default function YonetimPaneli() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const modMu = profile?.rol === 'moderator';

  const [koclar, setKoclar] = useState<KocDetay[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('beklemede');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [redGerekceMap, setRedGerekceMap] = useState<Record<string, string>>({});
  const [redAcikMap, setRedAcikMap] = useState<Record<string, boolean>>({});
  const [yenile, setYenile] = useState(0);

  useEffect(() => {
    if (!modMu || !userId) return;
    let iptal = false;
    (async () => {
      const [{ data: cps, error: errCps }, { data: pr }] = await Promise.all([
        supabase.from('coach_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, ad, bio, foto_url, rol'),
      ]);

      if (iptal) return;
      if (errCps) {
        setMesaj(hataMesaji(errCps));
        return;
      }

      const map = new Map((pr ?? []).map((p) => [p.id, p]));
      setKoclar((cps ?? []).map((cp) => ({ cp, profil: map.get(cp.user_id) })));
    })();

    return () => {
      iptal = true;
    };
  }, [modMu, userId, yenile]);

  if (!modMu) {
    return (
      <ScrollView contentContainerStyle={ui.screen}>
        <PageHead
          eyebrow="Erişim Kısıtlı"
          title="Yetkisiz Erişim"
          lead="Bu sayfaya yalnızca 'moderator' rolüne sahip yöneticiler erişebilir."
        />
        <Card>
          <Msg tone="bad">Moderatör yetkiniz bulunmamaktadır.</Msg>
          <View style={{ height: 14 }} />
          <Button title="Ana Sayfaya Dön" onPress={() => router.replace('/')} />
        </Card>
      </ScrollView>
    );
  }

  async function onayla(kocId: string) {
    setBusyId(kocId);
    setMesaj(null);
    const { error } = await supabase
      .from('coach_profiles')
      .update({
        onay_durumu: 'onaylandi',
        ret_gerekce: null,
      })
      .eq('user_id', kocId);

    setBusyId(null);
    if (error) {
      setMesaj(hataMesaji(error));
    } else {
      setMesaj('Koç başvurusu onaylandı ve yayına alındı.');
      setYenile((n) => n + 1);
    }
  }

  async function reddet(kocId: string) {
    const gerekce = (redGerekceMap[kocId] ?? '').trim();
    if (!gerekce) {
      setMesaj('Lütfen bir red gerekçesi yazın.');
      return;
    }

    setBusyId(kocId);
    setMesaj(null);
    const { error } = await supabase
      .from('coach_profiles')
      .update({
        onay_durumu: 'reddedildi',
        ret_gerekce: gerekce,
      })
      .eq('user_id', kocId);

    setBusyId(null);
    if (error) {
      setMesaj(hataMesaji(error));
    } else {
      setMesaj('Koç başvurusu reddedildi.');
      setRedAcikMap((m) => ({ ...m, [kocId]: false }));
      setYenile((n) => n + 1);
    }
  }

  async function eloToggle(kocId: string, simdiki: boolean) {
    setBusyId(kocId);
    setMesaj(null);
    const { error } = await supabase
      .from('coach_profiles')
      .update({
        elo_dogrulandi: !simdiki,
      })
      .eq('user_id', kocId);

    setBusyId(null);
    if (error) {
      setMesaj(hataMesaji(error));
    } else {
      setMesaj(!simdiki ? 'Koçun ELO puanı doğrulandı.' : 'ELO doğrulama işareti kaldırıldı.');
      setYenile((n) => n + 1);
    }
  }

  const bekleyenler = koclar.filter((k) => k.cp.onay_durumu === 'beklemede');
  const onaylananlar = koclar.filter((k) => k.cp.onay_durumu === 'onaylandi');
  const reddedilenler = koclar.filter((k) => k.cp.onay_durumu === 'reddedildi');

  const gosterilen =
    filtre === 'beklemede'
      ? bekleyenler
      : filtre === 'onaylandi'
      ? onaylananlar
      : filtre === 'reddedildi'
      ? reddedilenler
      : koclar;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="🛡️ Yönetim & Moderasyon"
        title="Moderatör Paneli"
        lead="Koçluk başvurularını incele, belgeleri doğrula, onay/red kararı ver."
      />

      {mesaj ? (
        <View style={{ marginBottom: 12 }}>
          <Msg tone={mesaj.includes('reddedildi') || mesaj.includes('Lütfen') ? 'bad' : 'ok'}>
            {mesaj}
          </Msg>
        </View>
      ) : null}

      {/* İstatistik & Filtre Sekmeleri */}
      <Card>
        <Text style={ui.h3}>Başvuru Durumu</Text>
        <View style={s.row}>
          <Button
            sm
            title={`⏳ Bekleyen (${bekleyenler.length})`}
            variant={filtre === 'beklemede' ? 'cheese' : 'secondary'}
            onPress={() => setFiltre('beklemede')}
          />
          <Button
            sm
            title={`✓ Onaylanan (${onaylananlar.length})`}
            variant={filtre === 'onaylandi' ? 'cheese' : 'secondary'}
            onPress={() => setFiltre('onaylandi')}
          />
          <Button
            sm
            title={`✕ Reddedilen (${reddedilenler.length})`}
            variant={filtre === 'reddedildi' ? 'cheese' : 'secondary'}
            onPress={() => setFiltre('reddedildi')}
          />
          <Button
            sm
            title={`Tümü (${koclar.length})`}
            variant={filtre === 'hepsi' ? 'cheese' : 'secondary'}
            onPress={() => setFiltre('hepsi')}
          />
        </View>
      </Card>

      {/* Koç Listesi */}
      <Card>
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
          <Text style={ui.h3}>
            {filtre === 'beklemede'
              ? 'Onay Bekleyen Başvurular'
              : filtre === 'onaylandi'
              ? 'Onaylı Koçlar'
              : filtre === 'reddedildi'
              ? 'Reddedilen Başvurular'
              : 'Tüm Koçlar'}{' '}
            ({gosterilen.length})
          </Text>
          <Button sm title="Yenile" variant="secondary" onPress={() => setYenile((n) => n + 1)} />
        </View>

        {gosterilen.length ? (
          gosterilen.map(({ cp, profil }, i) => {
            const isBusy = busyId === cp.user_id;
            const redAcik = !!redAcikMap[cp.user_id];
            const gerekceMetin = redGerekceMap[cp.user_id] ?? '';

            return (
              <View
                key={cp.user_id}
                style={[
                  ui.item,
                  i === 0 && { borderTopWidth: 0, paddingTop: 0 },
                  { flexDirection: 'column', alignItems: 'stretch' },
                ]}
              >
                {/* Koç Üst Bilgi */}
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {profil?.foto_url ? (
                    <Image source={{ uri: profil.foto_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarPh]}>
                      <Text style={s.avatarGlyph}>♞</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                      {profil?.ad || 'İsimsiz Koç'}
                    </Text>
                    <View style={[s.row, { marginTop: 4 }]}>
                      {cp.onay_durumu === 'onaylandi' ? (
                        <Chip label="✓ Onaylandı" tone="ok" />
                      ) : cp.onay_durumu === 'reddedildi' ? (
                        <Chip label="✕ Reddedildi" />
                      ) : (
                        <Chip label="⏳ Beklemede" tone="wait" />
                      )}
                      <Chip label={cp.seviye} />
                      {cp.tsf_belgeli ? <Chip label="TSF Belgeli" tone="wait" /> : null}
                    </View>
                  </View>
                </View>

                {/* Koç Detayları */}
                <View style={s.detayKutusu}>
                  <Text style={s.detayBaslik}>Eğitmen Detayları:</Text>
                  <Text style={s.detayYazi}>
                    • Deneyim: {cp.yil} Yıl  |  Ders Ücreti: {cp.fiyat} TL / 45 dk  |  ELO: {cp.elo ?? 'Belirtilmedi'}
                    {cp.elo_dogrulandi ? ' (Doğrulandı ✓)' : ''}
                  </Text>
                  {profil?.bio ? (
                    <Text style={[s.detayYazi, { marginTop: 4, fontStyle: 'italic' }]}>
                      {`"${profil.bio}"`}
                    </Text>
                  ) : null}

                  {cp.basvuru_notu ? (
                    <View style={{ marginTop: 6, padding: 8, backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink }}>Başvuru & Lisans Notu:</Text>
                      <Text style={{ fontSize: 13, color: colors.ink, marginTop: 2 }}>{cp.basvuru_notu}</Text>
                    </View>
                  ) : null}

                  {cp.ret_gerekce ? (
                    <View style={{ marginTop: 6, padding: 8, backgroundColor: colors.msgBad, borderRadius: radius.card }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink }}>Red Gerekçesi:</Text>
                      <Text style={{ fontSize: 13, color: colors.ink, marginTop: 2 }}>{cp.ret_gerekce}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Aksiyon Butonları */}
                <View style={[s.row, { marginTop: 10 }]}>
                  {cp.onay_durumu !== 'onaylandi' ? (
                    <Button
                      sm
                      title={isBusy ? 'İşleniyor…' : '✓ Onayla & Yayınla'}
                      variant="cheese"
                      disabled={isBusy}
                      onPress={() => onayla(cp.user_id)}
                    />
                  ) : null}

                  {cp.elo ? (
                    <Button
                      sm
                      title={cp.elo_dogrulandi ? 'ELO Onayını Kaldır' : '⭐ ELO Doğrula'}
                      variant="secondary"
                      disabled={isBusy}
                      onPress={() => eloToggle(cp.user_id, cp.elo_dogrulandi)}
                    />
                  ) : null}

                  {cp.onay_durumu !== 'reddedildi' ? (
                    <Button
                      sm
                      title={redAcik ? 'Vazgeç' : '✕ Reddet'}
                      variant="secondary"
                      disabled={isBusy}
                      onPress={() => setRedAcikMap((m) => ({ ...m, [cp.user_id]: !redAcik }))}
                    />
                  ) : null}
                </View>

                {/* Red Gerekçesi Formu */}
                {redAcik ? (
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink, marginBottom: 4 }}>
                      Red Gerekçesi Yazın:
                    </Text>
                    <TextInput
                      style={[ui.input, { minHeight: 60, textAlignVertical: 'top', marginBottom: 8 }]}
                      placeholder="Örn: TSF antrenör belgesi doğrulanamadı, lütfen belge numaranızı güncelleyin..."
                      value={gerekceMetin}
                      onChangeText={(t) => setRedGerekceMap((m) => ({ ...m, [cp.user_id]: t }))}
                      multiline
                    />
                    <Button
                      sm
                      title={isBusy ? 'Kaydediliyor…' : 'Reddetmeyi Onayla'}
                      disabled={isBusy || !gerekceMetin.trim()}
                      onPress={() => reddet(cp.user_id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <Text style={ui.mut}>Bu filtrede görüntülenecek koç başvurusu bulunmuyor.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.squareLight,
  },
  avatarGlyph: {
    fontSize: 28,
    color: colors.pieceWhite,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.5,
  },
  detayKutusu: {
    marginTop: 8,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  detayBaslik: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  detayYazi: {
    fontSize: 13,
    color: colors.mut,
    lineHeight: 18,
  },
});
