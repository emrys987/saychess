import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS } from '@/features/auth/roles';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { SEVIYELER } from '@/types/database';

export default function Profil() {
  const { session, profile, updateProfile, signOut } = useAuth();
  const userId = session?.user.id;
  const kocMu = profile?.rol === 'koc';
  const ogrenciMi = profile?.rol === 'ogrenci';
  const [veliKodu, setVeliKodu] = useState<string | null>(profile?.veli_kodu ?? null);
  const [ad, setAd] = useState(profile?.ad ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Koç alanları (Koç Bul listesini besler)
  const [seviye, setSeviye] = useState<string>('Başlangıç');
  const [elo, setElo] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [yil, setYil] = useState('');
  const [tsf, setTsf] = useState(false);
  const [basvuruNotu, setBasvuruNotu] = useState('');
  const [onayDurumu, setOnayDurumu] = useState<'beklemede' | 'onaylandi' | 'reddedildi' | null>(null);
  const [retGerekce, setRetGerekce] = useState<string | null>(null);
  const [eloDogrulandi, setEloDogrulandi] = useState(false);

  useEffect(() => {
    if (!kocMu || !userId) return;
    let iptal = false;
    (async () => {
      const { data } = await supabase.from('coach_profiles').select('*').eq('user_id', userId).maybeSingle();
      if (iptal || !data) return;
      setSeviye(data.seviye);
      setElo(data.elo ? String(data.elo) : '');
      setFiyat(String(data.fiyat));
      setYil(String(data.yil));
      setTsf(data.tsf_belgeli);
      setBasvuruNotu(data.basvuru_notu ?? '');
      setOnayDurumu(data.onay_durumu);
      setRetGerekce(data.ret_gerekce);
      setEloDogrulandi(data.elo_dogrulandi);
    })();
    return () => {
      iptal = true;
    };
  }, [kocMu, userId]);

  async function kodOlustur() {
    setBusy(true);
    const { data, error } = await supabase.rpc('veli_kodu_olustur');
    setBusy(false);
    if (error) {
      setMsg(hataMesaji(error));
      return;
    }
    setVeliKodu(data);
  }

  const kaydet = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await updateProfile({ ad: ad.trim(), bio: bio.trim() });
      if (kocMu && userId) {
        const payload: Record<string, unknown> = {
          user_id: userId,
          seviye,
          elo: elo ? Number(elo) : null,
          fiyat: Number(fiyat) || 0,
          yil: Number(yil) || 0,
          tsf_belgeli: tsf,
          basvuru_notu: basvuruNotu.trim() || null,
        };
        if (!onayDurumu || onayDurumu === 'reddedildi') {
          payload.onay_durumu = 'beklemede';
        }
        const { error } = await supabase.from('coach_profiles').upsert(payload as never);
        if (error) throw error;
        if (!onayDurumu || onayDurumu === 'reddedildi') {
          setOnayDurumu('beklemede');
          setRetGerekce(null);
        }
      }
      setMsg('Profilin kaydedildi');
    } catch (err) {
      setMsg(hataMesaji(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Hesap"
        title="Profilim"
        lead="Fotoğrafın, tanıtım yazın ve rolün tek sayfada. Koç sayfan buradan beslenir."
      />

      <Card>
        <View style={s.identity}>
          {profile?.foto_url ? (
            <Image source={{ uri: profile.foto_url }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarPh]}>
              <Text style={s.avatarGlyph}>♞</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={ui.h3}>{profile?.ad || 'Adını yaz'}</Text>
            <Text style={ui.mut}>{session?.user.email}</Text>
            {profile?.rol ? (
              <View style={{ marginTop: 6 }}>
                <Chip label={ROLE_LABELS[profile.rol]} tone="ok" />
              </View>
            ) : null}
          </View>
        </View>
      </Card>

      <Card>
        <Text style={ui.eyebrow}>Ad soyad</Text>
        <TextInput style={[ui.input, { marginBottom: 12 }]} value={ad} onChangeText={setAd} placeholder="Ad Soyad" />
        <Text style={ui.eyebrow}>Tanıtım yazısı</Text>
        <TextInput
          style={[ui.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Kendini kısaca tanıt"
        />
        <Button title={busy ? 'Kaydediliyor…' : 'Kaydet'} onPress={kaydet} disabled={busy} />
        {msg ? <Text style={[ui.mut, { marginTop: 8 }]}>{msg}</Text> : null}
      </Card>

      {kocMu ? (
        <Card>
          <Text style={ui.h3}>Koç Bilgileri & Başvuru</Text>
          <Text style={[ui.mut, { marginBottom: 10 }]}>Bu bilgiler onaylandıktan sonra Koç Bul listesinde görünür.</Text>

          <View style={{ marginBottom: 14 }}>
            {onayDurumu === 'onaylandi' ? (
              <Msg tone="ok">
                <Text style={{ fontWeight: '700' }}>✓ Koçluk Profiliniz Onaylandı</Text>
                {'\n'}Öğrenciler sizi Koç Bul listesinde görebilir ve randevu alabilir.
                {eloDogrulandi ? ' ELO puanınız moderatör tarafından onaylandı.' : ''}
              </Msg>
            ) : onayDurumu === 'reddedildi' ? (
              <Msg tone="bad">
                <Text style={{ fontWeight: '700' }}>✕ Başvurunuz Reddedildi</Text>
                {retGerekce ? `\nRed Gerekçesi: ${retGerekce}` : ''}
                {'\n'}Bilgilerinizi güncelleyip kaydettiğinizde profiliniz tekrar incelemeye alınacaktır.
              </Msg>
            ) : (
              <Msg tone="info">
                <Text style={{ fontWeight: '700' }}>⏳ Başvurunuz İnceleniyor</Text>
                {'\n'}Profiliniz moderatör onayı bekliyor. Onaylandığında otomatik olarak Koç Bul listesinde yayınlanacaktır.
              </Msg>
            )}
          </View>

          <Text style={ui.eyebrow}>Hedef Öğrenci Seviyesi</Text>
          <View style={[s.row, { marginBottom: 10 }]}>
            {SEVIYELER.map((sv) => (
              <Button
                key={sv}
                sm
                title={sv}
                variant={seviye === sv ? 'cheese' : 'secondary'}
                onPress={() => setSeviye(sv)}
              />
            ))}
          </View>

          <View style={s.row}>
            <TextInput
              style={[ui.input, { flex: 1, minWidth: 100 }]}
              value={elo}
              onChangeText={setElo}
              keyboardType="number-pad"
              placeholder="ELO"
            />
            <TextInput
              style={[ui.input, { flex: 1, minWidth: 100 }]}
              value={fiyat}
              onChangeText={setFiyat}
              keyboardType="number-pad"
              placeholder="45 dk ücret (TL)"
            />
            <TextInput
              style={[ui.input, { flex: 1, minWidth: 100 }]}
              value={yil}
              onChangeText={setYil}
              keyboardType="number-pad"
              placeholder="Deneyim (yıl)"
            />
          </View>
          <View style={{ height: 10 }} />
          <View style={s.row}>
            <Button
              sm
              title={tsf ? 'TSF belgeli ✓' : 'TSF belgeli'}
              variant={tsf ? 'cheese' : 'secondary'}
              onPress={() => setTsf((v) => !v)}
            />
          </View>

          <Text style={[ui.eyebrow, { marginTop: 14 }]}>Koçluk Başvuru Notu / Lisans No</Text>
          <TextInput
            style={[ui.input, { minHeight: 65, textAlignVertical: 'top', marginTop: 4 }]}
            value={basvuruNotu}
            onChangeText={setBasvuruNotu}
            multiline
            placeholder="TSF antrenörlük belgesi no, FIDE unvanı, turnuva başarıları veya notlarınız..."
          />
        </Card>
      ) : null}

      {ogrenciMi ? (
        <Card>
          <Text style={ui.h3}>Veli davet kodu</Text>
          <Text style={[ui.mut, { marginBottom: 10 }]}>
            Velin bu kodu Veli Paneli’ne girerek ödev/maç/ders özetini görebilir.
          </Text>
          {veliKodu ? (
            <Text style={{ fontFamily: undefined, fontSize: 26, fontWeight: '800', letterSpacing: 4, color: colors.ink }}>
              {veliKodu}
            </Text>
          ) : null}
          <View style={{ height: 10 }} />
          <Button
            sm
            title={busy ? 'Üretiliyor…' : veliKodu ? 'Yeni kod üret' : 'Kod üret'}
            onPress={kodOlustur}
            disabled={busy}
          />
        </Card>
      ) : null}

      <Button title="Çıkış yap" variant="secondary" onPress={signOut} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  identity: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 6,
  },
  // .avatar.ph: dama desenli yer tutucu + at glifi
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.squareLight,
    overflow: 'hidden',
  },
  avatarGlyph: {
    fontSize: 44,
    color: colors.pieceWhite,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.6,
  },
});

