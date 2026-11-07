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
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const kocMu = profile?.rol === 'koc';
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

      {kocMu ? (
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
