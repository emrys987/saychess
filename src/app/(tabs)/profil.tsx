import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS } from '@/features/auth/roles';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function Profil() {
  const router = useRouter();
  const { session, profile, coachApplicationStatus, updateProfile, signOut } = useAuth();
  const ogrenciMi = profile?.rol === 'ogrenci';
  const [veliKodu, setVeliKodu] = useState<string | null>(profile?.veli_kodu ?? null);
  const [ad, setAd] = useState(profile?.ad ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [silOnay, setSilOnay] = useState(false);

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

  /** KVKK m.7 / GDPR m.17: kullanıcı kendi hesabını ve bağlı tüm verisini silebilir. */
  async function hesabiSil() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc('hesabimi_sil');
    if (error) {
      setBusy(false);
      setMsg(hataMesaji(error));
      return;
    }
    await signOut().catch(() => undefined);
    setBusy(false);
  }

  const kaydet = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await updateProfile({ ad: ad.trim(), bio: bio.trim() });
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

      {profile?.rol === 'koc' ? (
        <Card>
          <Text style={ui.h3}>Koç başvuru durumu</Text>
          {coachApplicationStatus === 'onaylandi' ? (
            <Msg tone="ok">Koç profilin onaylandı ve Koç Bul’da listeleniyor.</Msg>
          ) : (
            <Msg tone="info">Koç başvurun moderatör incelemesinde. Onaylanınca koçluk özellikleri açılacak.</Msg>
          )}
          <Button sm title="Koç bilgilerini düzenle" variant="secondary" onPress={() => router.navigate('/koc-basvuru')} />
        </Card>
      ) : null}

      {ogrenciMi ? (
        <Card>
          <Text style={ui.h3}>Veli davet kodu</Text>
          <Text style={[ui.mut, { marginBottom: 10 }]}>
            Velin bu kodu Veli Paneli’ne girerek ödev/maç/ders özetini görebilir.
          </Text>
          {veliKodu ? (
            <Text style={{ fontFamily: undefined, fontSize: 22, fontWeight: '800', letterSpacing: 2, color: colors.ink }}>
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

      <Card>
        <Text style={ui.h3}>Hesabımı sil</Text>
        <Text style={[ui.mut, { marginBottom: 10 }]}>
          Profilin, ödevlerin, maçların ve randevuların kalıcı olarak silinir. Bu işlem geri alınamaz.
        </Text>
        {silOnay ? (
          <View style={s.row}>
            <Button
              title={busy ? 'Siliniyor…' : 'Evet, kalıcı olarak sil'}
              variant="secondary"
              onPress={hesabiSil}
              disabled={busy}
            />
            <Button title="Vazgeç" variant="secondary" onPress={() => setSilOnay(false)} disabled={busy} />
          </View>
        ) : (
          <Button title="Hesabımı sil" variant="secondary" onPress={() => setSilOnay(true)} />
        )}
      </Card>

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

