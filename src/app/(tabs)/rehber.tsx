import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import type { Post } from '@/types/database';

const s = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
};

export default function Rehber() {
  const { session, profile, coachApplicationStatus } = useAuth();
  const userId = session?.user.id;
  const kocMu = profile?.rol === 'koc';
  const aktifKocMu = kocMu && coachApplicationStatus === 'onaylandi';
  const modMu = profile?.rol === 'moderator';
  const [yazilar, setYazilar] = useState<Post[]>([]);
  const [baslik, setBaslik] = useState('');
  const [metin, setMetin] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [yenile, setYenile] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    (async () => {
      const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (!iptal && data) setYazilar(data);
    })();
    return () => {
      iptal = true;
    };
  }, [userId, yenile]);

  async function gonder() {
    if (!userId) return;
    if (!baslik.trim() || !metin.trim()) {
      setMesaj('Başlık ve yazı boş olamaz.');
      return;
    }
    setBusy(true);
    setMesaj(null);
    const { error } = await supabase.from('posts').insert({ yazar_id: userId, baslik: baslik.trim(), metin: metin.trim() });
    setBusy(false);
    if (error) {
      setMesaj(hataMesaji(error));
      return;
    }
    setBaslik('');
    setMetin('');
    setMesaj('Yazı moderatör onayına gönderildi.');
    setYenile((n) => n + 1);
  }

  async function karar(id: string, durum: 'yayinda' | 'red', gerekce?: string) {
    setBusy(true);
    const { error } = await supabase.from('posts').update({ durum, ret_gerekce: gerekce ?? null }).eq('id', id);
    setBusy(false);
    setMesaj(error ? hataMesaji(error) : durum === 'yayinda' ? 'Yayınlandı.' : 'Yazı reddedildi.');
    setYenile((n) => n + 1);
  }

  const yayinda = yazilar.filter((y) => y.durum === 'yayinda');
  const bekleyen = yazilar.filter((y) => y.durum === 'bekliyor');
  const benim = yazilar.filter((y) => y.yazar_id === userId && y.durum !== 'yayinda');

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Satranç Rehberi"
        title="Satranç Rehberi"
        lead="Koçların yazdığı, moderatör onaylı yazılar. Çocuklar için yorum yoktur."
      />

      <Card>
        <Text style={ui.h3}>Bir satranç konusunu anlatma akışı</Text>
        <Text style={[ui.mut, { marginBottom: 8 }]}>Koçlar için özgün başlangıç taslağı. Her bölümde tek bir hedef seç; öğrencinin seviyesine göre örnekleri değiştir.</Text>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>1. Hedefi söyle</Text>
        <Text style={[ui.mut, { marginBottom: 8 }]}>Örneğin: “Bu konumda çatal tehdidini fark edeceğiz.”</Text>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>2. Düşünmeyi göster</Text>
        <Text style={[ui.mut, { marginBottom: 8 }]}>Tahtada bir örnek kur; aday hamleleri ve kontrol ettiğin ipuçlarını sesli anlat.</Text>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>3. Öğrenciye denet</Text>
        <Text style={[ui.mut, { marginBottom: 8 }]}>Benzer bir konum ver. Cevabı hemen söylemek yerine “Rakibin tehdidi ne?” gibi bir soru sor.</Text>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>4. Kısa tekrar yap</Text>
        <Text style={[ui.mut, { marginBottom: 12 }]}>Öğrenciden bulduğu fikri kendi cümlesiyle açıklamasını iste ve bir alıştırmayla bitir.</Text>
        <Text style={ui.h3}>Profesyonel kaynaklar</Text>
        <Text style={[ui.mut, { marginBottom: 8 }]}>FIDE EDU’nun öğretmen hazırlığı ve satrancı eğitim aracı olarak kullanma materyalleri. Kaynak metinleri kopyalamadan, kendi anlatımımızı oluşturup moderatör onayına sunacağız.</Text>
        <Text selectable style={{ color: colors.ink, fontWeight: '700' }}>FIDE EDU · Öğretmen hazırlığı</Text>
        <Text selectable style={[ui.mut, { marginBottom: 8 }]}>https://edu.fide.com/post/65c3c6f003f66659083c9d85</Text>
        <Text selectable style={{ color: colors.ink, fontWeight: '700' }}>FIDE EDU · Eğitim portalı</Text>
        <Text selectable style={ui.mut}>https://edu.fide.com/</Text>
      </Card>

      {kocMu && !aktifKocMu ? <Msg tone="info">Yazı gönderme başvurun onaylandıktan sonra açılacak.</Msg> : null}

      {aktifKocMu ? (
        <Card>
          <Text style={ui.h3}>Yazı gönder</Text>
          <Text style={[ui.mut, { marginBottom: 8 }]}>Gönderdiğin yazı moderatör onaylayınca yayınlanır.</Text>
          <TextInput
            style={[ui.input, { marginBottom: 8 }]}
            value={baslik}
            onChangeText={setBaslik}
            placeholder="Başlık"
          />
          <TextInput
            style={[ui.input, { minHeight: 90, textAlignVertical: 'top', marginBottom: 10 }]}
            value={metin}
            onChangeText={setMetin}
            multiline
            placeholder="Yazı metni"
          />
          <Button title={busy ? 'Gönderiliyor…' : 'Onaya gönder'} onPress={gonder} disabled={busy} />
        </Card>
      ) : null}

      {mesaj ? <Msg>{mesaj}</Msg> : null}

      {modMu && bekleyen.length ? (
        <Card>
          <View style={s.head}>
            <Text style={ui.h3}>Onay bekleyenler</Text>
            <Chip label={`${bekleyen.length}`} tone="wait" />
          </View>
          {bekleyen.map((y, i) => (
            <View key={y.id} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{y.baslik}</Text>
                <Text style={ui.mut} numberOfLines={2}>
                  {y.metin}
                </Text>
              </View>
              <View style={s.row}>
                <Button sm title="Onayla" onPress={() => karar(y.id, 'yayinda')} disabled={busy} />
                <Button sm title="Reddet" variant="secondary" onPress={() => karar(y.id, 'red', 'Konu dışı')} disabled={busy} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {benim.length ? (
        <Card>
          <Text style={ui.h3}>Yazılarım</Text>
          {benim.map((y, i) => (
            <View key={y.id} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{y.baslik}</Text>
                {y.durum === 'red' && y.ret_gerekce ? <Text style={ui.mut}>Gerekçe: {y.ret_gerekce}</Text> : null}
              </View>
              <Chip label={y.durum} tone={y.durum === 'red' ? 'info' : 'wait'} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <View style={s.head}>
          <Text style={ui.h3}>Yayında</Text>
          <Chip label={`${yayinda.length} yazı`} tone="ok" />
        </View>
        {yayinda.length ? (
          yayinda.map((y, i) => (
            <View key={y.id} style={[i > 0 && ui.item]}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{y.baslik}</Text>
              <Text style={[ui.mut, { marginTop: 4 }]}>{y.metin}</Text>
              <Text style={[ui.mut, { marginTop: 6 }]}>{new Date(y.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
          ))
        ) : (
          <Text style={ui.mut}>Henüz yayınlanmış yazı yok.</Text>
        )}
      </Card>
    </ScrollView>
  );
}
