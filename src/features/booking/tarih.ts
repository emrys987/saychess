/** 1 = Pazartesi ... 7 = Pazar. Bugünden sonraki ilk aynı günü ISO (YYYY-MM-DD) olarak verir. */
export function sonrakiTarih(gun: number): string {
  const d = new Date();
  const bugun = d.getDay() === 0 ? 7 : d.getDay();
  const ekle = (gun - bugun + 7) % 7 || 7;
  d.setDate(d.getDate() + ekle);
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${ay}-${g}`;
}

/** '2026-11-09' → '9 Kasım 2026' */
export function tarihYaz(iso: string): string {
  const [y, m, g] = iso.split('-').map(Number);
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${g} ${aylar[m - 1]} ${y}`;
}

export function saatYaz(saat: number): string {
  return `${String(saat).padStart(2, '0')}:00`;
}

/** Ders saatleri: 09:00 - 21:00 */
export const DERS_SAATLERI = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
