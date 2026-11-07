import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, PageHead, styles as ui } from '@/components/ui';
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
        const { error } = await supabase.from('coach_profiles').upsert({
          user_id: userId,
          seviye,
          elo: elo ? Number(elo) : null,
          fiyat: Number(fiyat) || 0,
          yil: Number(yil) || 0,
          tsf_belgeli: tsf,
        });
        if (error) throw error;
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
          <Text style={ui.h3}>Koç bilgileri</Text>
          <Text style={[ui.mut, { marginBottom: 10 }]}>Bu bilgiler Koç Bul listesinde görünür.</Text>
          <View style={s.row}>
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
          <View style={{ height: 10 }} />
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

