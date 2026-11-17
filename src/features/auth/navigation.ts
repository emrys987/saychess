import type { UserRole } from '@/types/database';

export const NAV_ITEMS = [
  { href: '/', label: 'Ana Sayfa', description: 'Başlangıç ekranına dön.', icon: '⌂', group: 'main' },
  { href: '/oda', label: 'Oyna', description: 'Tek başına ya da arkadaşınla satranç oyna.', icon: '♞', group: 'main' },
  { href: '/odev', label: 'Ödevler', description: 'Çözmen gereken bulmacaları gör.', icon: '✦', group: 'main' },
  { href: '/canli', label: 'Canlı Ders', description: 'Kodla ortak satranç tahtası aç.', icon: '♟', group: 'main' },
  { href: '/takvim', label: 'Takvim', description: 'Derslerini ve müsaitlik saatlerini yönet.', icon: '◷', group: 'main' },
  { href: '/koc', label: 'Koç Bul', description: 'Koçları incele ve ders planla.', icon: '♔', group: 'more' },
  { href: '/rehber', label: 'Satranç Rehberi', description: 'Satranç yazılarını keşfet.', icon: '▤', group: 'more' },
  { href: '/veli', label: 'Veli Paneli', description: 'Çocuğunun ilerlemesini takip et.', icon: '⌂', group: 'more' },
  { href: '/paketler', label: 'Paketler', description: 'Ders paketlerini incele.', icon: '◇', group: 'more' },
  { href: '/profil', label: 'Profilim', description: 'Hesap ve profil bilgilerini düzenle.', icon: '○', group: 'more' },
  { href: '/yonetim', label: 'Yönetim Paneli', description: 'Koç başvurularını incele.', icon: '🛡️', group: 'more' },
] as const;

export function canAccessPage(role: UserRole | null | undefined, href: string) {
  if (href === '/veli') return role === 'veli';
  if (href === '/yonetim') return role === 'moderator';
  return true;
}

export function visibleNavItems(role: UserRole | null | undefined) {
  return NAV_ITEMS.filter((item) => canAccessPage(role, item.href));
}
