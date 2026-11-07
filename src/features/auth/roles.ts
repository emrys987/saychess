import type { UserRole } from '@/types/database';

export const ROLE_LABELS: Record<UserRole, string> = {
  koc: 'Koç',
  ogrenci: 'Öğrenci',
  veli: 'Veli',
  moderator: 'Moderatör',
};

/** Kullanıcının kendisinin seçebileceği roller (moderatör elle atanır). */
export const SELECTABLE_ROLES: { rol: Exclude<UserRole, 'moderator'>; aciklama: string }[] = [
  { rol: 'koc', aciklama: 'Ders verir, ödev atar, profil ve blog yazısı yayınlar.' },
  { rol: 'ogrenci', aciklama: 'Derslere katılır, maç oynar, ödev çözer.' },
  { rol: 'veli', aciklama: 'Çocuğunun ilerlemesini izler, koç bulur, ders sonrası puan verir.' },
];
