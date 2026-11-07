import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, Card, Chip, Msg, PageHead, styles as ui } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { CozumPaneli } from '@/features/homework/CozumPaneli';
import { analyzeGamePgn } from '@/lib/chess/engine';
import { hataMesaji } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { TEMA_ADLARI, type Game, type Homework } from '@/types/database';

const TEMALAR = ['mat1', 'catal', 'kazan'] as const;

const s = {
  head: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
};

export default function Odev() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const kocMu = profile?.rol === 'koc';
  const [liste, setListe] = useState<Homework[]>([]);
  const [secili, setSecili] = useState<Homework | null>(null);
  const [tema, setTema] = useState<string>('mat1');
  const [ilerleme, setIlerleme] = useState<{ yapilan: number; toplam: number } | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [yenile, setYenile] = useState(0);
  const [ogrenciler, setOgrenciler] = useState<{ id: string; ad: string }[]>([]);
  const [hedef, setHedef] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    (async () => {
      const { data } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
      if (!iptal && data) setListe(data);
    })();
    return () => {
      iptal = true;
    };
  }, [userId, yenile]);

  // Koç ise: randevu aldığı öğrencileri yükle (koç_students, randevuyla otomatik oluşur)
  useEffect(() => {
    if (!kocMu || !userId) return;
    let iptal = false;
    (async () => {
      const { data: cs } = await supabase.from('coach_students').select('ogrenci_id').eq('koc_id', userId);
      const ids = (cs ?? []).map((c) => c.ogrenci_id);
      if (!ids.length) return;
      const { data: pr } = await supabase.from('profiles').select('id, ad').in('id', ids);
      if (iptal) return;
      setOgrenciler((pr ?? []).map((p) => ({ id: p.id, ad: p.ad || 'İsimsiz' })));
    })();
    return () => {
      iptal = true;
    };
  }, [kocMu, userId]);

  const cozulen = liste.filter((h) => h.durum === 'cozuldu').length;

  async function mactanUret() {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    setSecili(null);
    try {
      const { data: mac, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<Game>();
      if (error) throw error;
      if (!mac) {
        setMesaj("Önce Ders Odası'nda bir maç oynayın.");
        return;
      }
      setIlerleme({ yapilan: 0, toplam: 1 });
      const { hatalar } = await analyzeGamePgn(mac.pgn, 2, (yapilan, toplam) => setIlerleme({ yapilan, toplam }));
      if (!hatalar.length) {
        setMesaj('Bu maçta belirgin bir hata bulunamadı.');
        return;
      }
      const satirlar = hatalar.map((h) => ({
        ogrenci_id: userId,
        koc_id: null,
        kaynak: 'mac',
        tema: null,
        baslik: `${Math.ceil(h.ply / 2)}. hamle · ${h.san} yerine ne oynamalıydın?`,
        fen: h.fen,
        cozum: [h.enIyi.from + h.enIyi.to + (h.enIyi.promotion ?? '')],
        ipucu: 'Rakibin son hamlesinin ne tehdit ettiğine ve korunmasız taşlara bak.',
      }));
      const { error: insErr } = await supabase.from('homework').insert(satirlar);
      if (insErr) throw insErr;
      setMesaj(`${satirlar.length} ödev eklendi (en büyük kayıp ${(hatalar[0].kayip / 100).toFixed(1)} piyon).`);
      setYenile((n) => n + 1);
    } catch (e) {
      setMesaj(hataMesaji(e));
    } finally {
      setIlerleme(null);
      setBusy(false);
    }
  }

  async function temaEkle(hedefId?: string) {
    if (!userId) return;
    setBusy(true);
    setMesaj(null);
    const ogrenciId = hedefId ?? userId;
    try {
      const { data: pz, error } = await supabase.from('puzzles').select('*').eq('tema', tema);
      if (error) throw error;
      if (!pz?.length) {
        setMesaj('Bu temada hazır set yok. (SQL migration çalıştırıldı mı?)');
        return;
      }
      const mevcut = new Set(liste.filter((h) => h.ogrenci_id === ogrenciId).map((h) => h.baslik));
      const yeni = pz.filter((p) => !mevcut.has(p.baslik));
      if (!yeni.length) {
        setMesaj('Bu temadaki ödevler zaten ekli.');
        return;
      }
      const { error: insErr } = await supabase.from('homework').insert(
        yeni.map((p) => ({
          ogrenci_id: ogrenciId,
          koc_id: hedefId ? userId : null,
          kaynak: 'tema',
          tema: p.tema,
          baslik: p.baslik,
          fen: p.fen,
          cozum: p.cozum,
          ipucu: p.ipucu,
        })),
      );
      if (insErr) throw insErr;
      setMesaj(
        hedefId
          ? `${yeni.length} ödev öğrenciye atandı.`
          : `${yeni.length} ödev eklendi.`,
      );
      setYenile((n) => n + 1);
    } catch (e) {
      setMesaj(hataMesaji(e));
    } finally {
      setBusy(false);
    }
  }

  async function sil(id: string) {
    await supabase.from('homework').delete().eq('id', id);
    if (secili?.id === id) setSecili(null);
    setYenile((n) => n + 1);
  }

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <PageHead
        eyebrow="Ödev"
        title="Ödev"
        lead="Maçtan ya da tema setinden gelen pozisyonlar. Tahtada çöz, ipucu al, tekrar dene."
      />

      <Card>
        <View style={s.head}>
          <Text style={ui.h3}>Maçtan ödev üret</Text>
          <Chip label="motor" tone="wait" />
        </View>
        <Text style={[ui.mut, { marginBottom: 10 }]}>
          Son maçını motorla tarar, en büyük hatalarını ödev olarak ekler. Analiz birkaç saniye sürer.
        </Text>
        <Button
          title={ilerleme ? `Analiz: ${ilerleme.yapilan}/${ilerleme.toplam}` : busy ? 'Çalışıyor…' : 'Son maçı analiz et'}
          onPress={mactanUret}
          disabled={busy}
        />
      </Card>

      <Card>
        <Text style={ui.h3}>Tema seti ekle</Text>
        <View style={s.row}>
          {TEMALAR.map((t) => (
            <Button
              key={t}
              sm
              title={TEMA_ADLARI[t]}
              variant={tema === t ? 'cheese' : 'secondary'}
              onPress={() => setTema(t)}
            />
          ))}
        </View>
        <View style={{ height: 10 }} />
        <Button sm title="Seti ödevlerime ekle" onPress={() => temaEkle()} disabled={busy} />
      </Card>

      {kocMu ? (
        <Card>
          <Text style={ui.h3}>Öğrenciye ödev ata</Text>
          {ogrenciler.length ? (
            <>
              <Text style={[ui.mut, { marginBottom: 8 }]}>Randevu aldığın öğrenciler. Önce öğrenci, sonra tema seç.</Text>
              <View style={s.row}>
                {ogrenciler.map((o) => (
                  <Button
                    key={o.id}
                    sm
                    title={o.ad}
                    variant={hedef === o.id ? 'cheese' : 'secondary'}
                    onPress={() => setHedef(o.id)}
                  />
                ))}
              </View>
              <View style={{ height: 10 }} />
              <Button
                sm
                title={hedef ? 'Seçili öğrenciye ata' : 'Önce öğrenci seç'}
                onPress={() => hedef && temaEkle(hedef)}
                disabled={busy || !hedef}
              />
            </>
          ) : (
            <Text style={ui.mut}>
              Henüz öğrencin yok. Koç Bul’dan biri senden randevu alınca burada görünür (öğrenci hesabı gerekir).
            </Text>
          )}
        </Card>
      ) : null}

      {mesaj ? <Msg>{mesaj}</Msg> : null}

      {secili ? (
        <CozumPaneli odev={secili} onBitti={() => setYenile((n) => n + 1)} onKapat={() => setSecili(null)} />
      ) : null}

      <Card>
        <View style={s.head}>
          <Text style={ui.h3}>Ödevler</Text>
          <Chip label={`${cozulen}/${liste.length} çözüldü`} tone="ok" />
        </View>
        {liste.length ? (
          liste.map((h, i) => (
            <View key={h.id} style={[ui.item, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>{h.baslik}</Text>
                <Text style={ui.mut}>
                  {h.kaynak === 'mac' ? 'Maçından' : `Tema: ${TEMA_ADLARI[h.tema ?? ''] ?? h.tema}`}
                  {h.durum === 'cozuldu'
                    ? ` · ${h.deneme} yanlış · ${h.sure_sn} sn`
                    : h.deneme
                      ? ` · ${h.deneme} yanlış`
                      : ''}
                </Text>
              </View>
              <View style={s.row}>
                <Chip label={h.durum === 'cozuldu' ? 'çözüldü' : 'bekliyor'} tone={h.durum === 'cozuldu' ? 'ok' : 'wait'} />
                <Button sm title={h.durum === 'cozuldu' ? 'Tekrar' : 'Çöz'} onPress={() => setSecili(h)} />
                <Button sm title="Sil" variant="secondary" onPress={() => sil(h.id)} />
              </View>
            </View>
          ))
        ) : (
          <Text style={ui.mut}>Henüz ödev yok. Yukarıdan maç analiz et ya da tema seti ekle.</Text>
        )}
      </Card>
    </ScrollView>
  );
}
