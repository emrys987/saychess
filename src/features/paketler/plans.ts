/**
 * Ders paketleri — yalnızca tanıtım/vitrin amaçlı sabit veri.
 * Ödeme altyapısı (iyzico/PayTR) kapsam dışı bırakıldı; raporda da böyle belirtildi.
 */

export type Plan = {
  id: 'ay1' | 'ay3' | 'ay6';
  ad: string;
  ay: number;
  dersSayisi: number;
  fiyat: number;
  indirim?: number;
  ozellikler: string[];
  populer?: boolean;
};

const DERS_BASI = 500; // TL, 45 dk

export const PLANLAR: Plan[] = [
  {
    id: 'ay1',
    ad: 'Aylık',
    ay: 1,
    dersSayisi: 4,
    fiyat: 4 * DERS_BASI,
    ozellikler: ['Haftada 1 canlı ders (45 dk)', 'Ödev kontrolü', 'Maç analizi'],
  },
  {
    id: 'ay3',
    ad: '3 Aylık',
    ay: 3,
    dersSayisi: 12,
    fiyat: 12 * DERS_BASI * 0.9,
    indirim: 10,
    ozellikler: ['12 canlı ders', 'Ödev takibi', 'Aylık veli raporu', 'Maç analizi'],
    populer: true,
  },
  {
    id: 'ay6',
    ad: '6 Aylık',
    ay: 6,
    dersSayisi: 24,
    fiyat: 24 * DERS_BASI * 0.8,
    indirim: 20,
    ozellikler: ['24 canlı ders', 'Açılış repertuvarı', 'Veli raporu', 'Turnuva hazırlığı'],
  },
];
