import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { Button, Card, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { SEVIYELER } from '@/types/database';

export default function KocBasvuru() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session, profile, coachApplicationStatus, updateProfile, refreshCoachApplication } = useAuth();
  const [ad, setAd] = useState(profile?.ad ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [seviye, setSeviye] = useState('Başlangıç');
  const [elo, setElo] = useState('');
  const [eloKaniti, setEloKaniti] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [yil, setYil] = useState('');
  const [tsf, setTsf] = useState(false);
  const [retGerekce, setRetGerekce] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const onayli = coachApplicationStatus === 'onaylandi';
  const wide = width >= 560;

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: coach, error: coachError }, { data: application, error: applicationError }] = await Promise.all([
        supabase
          .from('coach_profiles')
          .select('seviye, elo, tsf_belgeli, yil, fiyat')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.rpc('koc_basvurum'),
      ]);
      if (cancelled) return;
      if (coachError) throw coachError;
      if (applicationError) throw applicationError;
      if (coach) {
        setSeviye(coach.seviye);
        setElo(coach.elo == null ? '' : String(coach.elo));
        setTsf(coach.tsf_belgeli);
        setYil(String(coach.yil));
        setFiyat(String(coach.fiyat));
      }
      setEloKaniti(application?.[0]?.elo_kanit ?? '');
      setRetGerekce(application?.[0]?.ret_gerekce ?? null);
    })().catch((error: unknown) => {
      if (!cancelled) setMesaj(hataMesaji(error));
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  async function submit() {
    const rating = elo.trim() ? Number(elo) : null;
    const experience = Number(yil);
    const lessonPrice = Number(fiyat);
    if (!ad.trim() || !bio.trim() || !seviye || !yil.trim() || !fiyat.trim()) {
      setMesaj('Ad soyad, tanıtım, hedef seviye, deneyim ve ders ücreti zorunludur.');
      return;
    }
    if (!Number.isInteger(experience) || experience < 0 || !Number.isInteger(lessonPrice) || lessonPrice < 1) {
      setMesaj('Deneyim yılı ve ders ücreti geçerli bir sayı olmalıdır.');
      return;
    }
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || !eloKaniti.trim())) {
      setMesaj('ELO girdiysen geçerli bir ELO değeri ve doğrulama bağlantısı veya belge numarası ekle.');
      return;
    }

    setBusy(true);
    setMesaj(null);
    let adim = 'Profil bilgileri kaydediliyor';
    try {
      await updateProfile({ ad: ad.trim(), bio: bio.trim() });
      adim = 'Koç başvurusu kaydediliyor';
      const { error } = await supabase.rpc('koc_basvuru_gonder', {
        p_seviye: seviye,
        p_elo: rating,
        p_elo_kanit: eloKaniti.trim() || null,
        p_fiyat: lessonPrice,
        p_yil: experience,
        p_tsf_belgeli: tsf,
      });
      if (error) throw error;
      await refreshCoachApplication();
      setMesaj(onayli ? 'Koç profilin güncellendi.' : 'Başvurun moderatöre iletildi. Onaylanana kadar koçluk işlevleri kapalı kalacak.');
      router.replace('/');
    } catch (error) {
      setMesaj(`${adim}: ${hataMesaji(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <View style={{ maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <PageHead
          eyebrow={onayli ? 'Koç profili' : 'Zorunlu koç başvurusu'}
          title={onayli ? 'Koç profilini düzenle' : 'Koç profilini tamamla'}
          lead={onayli
            ? 'Profil bilgilerini güncelle. ELO değeri veya kanıtı değişirse moderatör doğrulaması yeniden gerekir.'
            : 'Bu başvuru moderatör tarafından incelenir. Başvurun onaylanana kadar koçluk özellikleri kullanıma açılmaz.'}
        />
        {retGerekce ? <Msg tone="bad">Önceki başvuru gerekçesi: {retGerekce}</Msg> : null}
        {mesaj ? (
          <Msg tone={mesaj.startsWith('Başvurun') || mesaj.startsWith('Koç profilin güncellendi') ? 'ok' : 'bad'}>
            {mesaj}
          </Msg>
        ) : null}

        <Card>
          <Text style={ui.eyebrow}>Ad soyad</Text>
          <TextInput style={[ui.input, { marginBottom: 12 }]} value={ad} onChangeText={setAd} placeholder="Ad Soyad" />
          <Text style={ui.eyebrow}>Tanıtım</Text>
          <TextInput
            style={[ui.input, { minHeight: 90, textAlignVertical: 'top', marginBottom: 12 }]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Öğrencilere nasıl yardımcı olacağını anlat"
          />
          <Text style={ui.eyebrow}>Hedef öğrenci seviyesi</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {SEVIYELER.map((item) => (
              <Button
                key={item}
                sm
                title={item}
                variant={seviye === item ? 'cheese' : 'secondary'}
                onPress={() => setSeviye(item)}
              />
            ))}
          </View>
          <Text style={ui.eyebrow}>Deneyim (yıl) ve ücret (TL / 45 dk)</Text>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8, marginBottom: 12 }}>
            <TextInput
              style={[ui.input, { flex: 1 }]}
              value={yil}
              onChangeText={setYil}
              keyboardType="number-pad"
              placeholder="Deneyim yılı"
            />
            <TextInput
              style={[ui.input, { flex: 1 }]}
              value={fiyat}
              onChangeText={setFiyat}
              keyboardType="number-pad"
              placeholder="Ders ücreti"
            />
          </View>
          <Text style={ui.eyebrow}>ELO (isteğe bağlı)</Text>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[ui.input, { flex: 1 }]}
              value={elo}
              onChangeText={setElo}
              keyboardType="number-pad"
              placeholder="ELO"
            />
            <TextInput
              style={[ui.input, { flex: 2 }]}
              value={eloKaniti}
              onChangeText={setEloKaniti}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Profil bağlantısı veya belge no"
            />
          </View>
          <Text style={[ui.mut, { marginBottom: 12 }]}>ELO değerini moderatör girdiğin kaynaktan kontrol eder.</Text>
          <Button
            sm
            title={tsf ? 'TSF belgeli ✓' : 'TSF belgeli'}
            variant={tsf ? 'cheese' : 'secondary'}
            onPress={() => setTsf((current) => !current)}
          />
          <View style={{ height: 16 }} />
          <Button title={busy ? 'Kaydediliyor…' : onayli ? 'Profil bilgilerini kaydet' : 'Başvuruyu gönder'} onPress={submit} disabled={busy} />
          {!onayli ? <Text style={[ui.mut, { marginTop: 10, color: colors.mut }]}>Başvuruyu göndermeden ana menüye geçemezsin.</Text> : null}
        </Card>
      </View>
    </ScrollView>
  );
}
