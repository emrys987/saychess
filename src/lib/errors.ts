/**
 * Supabase/PostgREST hatalarını Türkçe, kullanıcıya gösterilebilir mesaja çevirir.
 * Teknik mesajlar (İngilizce, SQL ayrıntısı) doğrudan ekrana basılmaz.
 */
export function hataMesaji(e: unknown): string {
  if (!e) return 'Bilinmeyen bir hata oluştu.';

  const err = e as { code?: string; message?: string; details?: string };
  const metin = `${err.message ?? ''} ${err.details ?? ''}`.toLowerCase();

  switch (err.code) {
    case '23505':
      return 'Bu kayıt zaten var.';
    case '23503':
      return 'Bağlı kayıt bulunamadı.';
    case '23514':
      return 'Girilen değer kabul edilmedi.';
    case '42501':
      return 'Bu işlem için yetkiniz yok.';
    case '42P01':
    case 'PGRST205':
      return 'Gerekli tablo yok. Supabase’de migration dosyaları çalıştırıldı mı?';
    case 'PGRST116':
      return 'Kayıt bulunamadı.';
  }

  if (metin.includes('jwt') || metin.includes('invalid claim') || metin.includes('refresh token')) {
    return 'Oturumun süresi doldu. Lütfen tekrar giriş yapın.';
  }
  if (metin.includes('failed to fetch') || metin.includes('network') || metin.includes('timeout')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
  }
  if (metin.includes('duplicate key')) return 'Bu kayıt zaten var.';
  if (metin.includes('row-level security')) return 'Bu işlem için yetkiniz yok.';

  return err.message || 'İşlem tamamlanamadı.';
}
