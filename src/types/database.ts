// Elle yazıldı; Supabase projesi bağlanınca şu komutla yeniden üretin:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// Şema: supabase/migrations/20261107000000_profiles.sql

export type UserRole = 'koc' | 'ogrenci' | 'veli' | 'moderator';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          rol: UserRole | null;
          ad: string;
          bio: string;
          foto_url: string | null;
          veli_kodu: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          rol?: UserRole | null;
          ad?: string;
          bio?: string;
          foto_url?: string | null;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          beyaz_id: string | null;
          siyah_id: string | null;
          pgn: string;
          sonuc: string;
          bitis_sebebi: string | null;
          plies: number;
          live_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          beyaz_id?: string | null;
          siyah_id?: string | null;
          pgn: string;
          sonuc: string;
          bitis_sebebi?: string | null;
          plies?: number;
          live_session_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      homework: {
        Row: {
          id: string;
          ogrenci_id: string;
          koc_id: string | null;
          kaynak: string;
          tema: string | null;
          baslik: string;
          fen: string;
          cozum: string[];
          ipucu: string;
          durum: 'bekliyor' | 'cozuldu';
          deneme: number;
          sure_sn: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          ogrenci_id: string;
          koc_id?: string | null;
          kaynak: string;
          tema?: string | null;
          baslik: string;
          fen: string;
          cozum: string[];
          ipucu: string;
          durum?: 'bekliyor' | 'cozuldu';
          deneme?: number;
          sure_sn?: number;
          created_at?: string;
        };
        Update: {
          durum?: 'bekliyor' | 'cozuldu';
          deneme?: number;
          sure_sn?: number;
        };
        Relationships: [];
      };
      puzzles: {
        Row: {
          id: string;
          tema: string;
          baslik: string;
          fen: string;
          cozum: string[];
          ipucu: string;
          created_at: string;
        };
        Insert: {
          id: string;
          tema: string;
          baslik: string;
          fen: string;
          cozum: string[];
          ipucu: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      coach_profiles: {
        Row: {
          user_id: string;
          seviye: string;
          elo: number | null;
          elo_dogrulandi: boolean;
          tsf_belgeli: boolean;
          yil: number;
          fiyat: number;
          puan_ort: number;
          puan_sayi: number;
          created_at: string;
          onay_durumu: 'beklemede' | 'onaylandi' | 'reddedildi';
          basvuru_notu: string | null;
          ret_gerekce: string | null;
          onaylayan_id: string | null;
          onay_tarihi: string | null;
          elo_kanit: string | null;
        };
        Insert: {
          user_id: string;
          seviye?: string;
          elo?: number | null;
          elo_dogrulandi?: boolean;
          tsf_belgeli?: boolean;
          yil?: number;
          fiyat?: number;
          puan_ort?: number;
          puan_sayi?: number;
          onay_durumu?: 'beklemede' | 'onaylandi' | 'reddedildi';
          basvuru_notu?: string | null;
          ret_gerekce?: string | null;
          onaylayan_id?: string | null;
          onay_tarihi?: string | null;
          elo_kanit?: string | null;
        };
        Update: {
          seviye?: string;
          elo?: number | null;
          elo_dogrulandi?: boolean;
          tsf_belgeli?: boolean;
          yil?: number;
          fiyat?: number;
          puan_ort?: number;
          puan_sayi?: number;
          onay_durumu?: 'beklemede' | 'onaylandi' | 'reddedildi';
          basvuru_notu?: string | null;
          ret_gerekce?: string | null;
          onaylayan_id?: string | null;
          onay_tarihi?: string | null;
          elo_kanit?: string | null;
        };
        Relationships: [];
      };
      availability: {
        Row: { id: string; koc_id: string; gun: number; saat: number };
        Insert: { id?: string; koc_id: string; gun: number; saat: number };
        Update: never;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          koc_id: string;
          ogrenci_id: string;
          tarih: string;
          saat: number;
          durum: 'onaylandi' | 'iptal';
          created_at: string;
        };
        Insert: {
          id?: string;
          koc_id: string;
          ogrenci_id: string;
          tarih: string;
          saat: number;
          durum?: 'onaylandi' | 'iptal';
        };
        Update: { durum?: 'onaylandi' | 'iptal' };
        Relationships: [];
      };
      live_sessions: {
        Row: {
          id: string;
          kod: string;
          beyaz_id: string;
          siyah_id: string | null;
          fen: string;
          durum: 'bekliyor' | 'aktif' | 'bitti';
          oyun_turu: 'ders' | 'oyun';
          saat_modu: 'yok' | '5+3';
          beyaz_saniye: number;
          siyah_saniye: number;
          saat_basladi_at: string | null;
          sonuc: string | null;
          bitis_sebebi: string | null;
          pgn: string | null;
          plies: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kod: string;
          beyaz_id: string;
          siyah_id?: string | null;
          fen?: string;
          durum?: 'bekliyor' | 'aktif' | 'bitti';
          oyun_turu?: 'ders' | 'oyun';
          saat_modu?: 'yok' | '5+3';
          beyaz_saniye?: number;
          siyah_saniye?: number;
          saat_basladi_at?: string | null;
          sonuc?: string | null;
          bitis_sebebi?: string | null;
          pgn?: string | null;
          plies?: number;
        };
        Update: {
          siyah_id?: string | null;
          fen?: string;
          durum?: 'bekliyor' | 'aktif' | 'bitti';
          oyun_turu?: 'ders' | 'oyun';
          saat_modu?: 'yok' | '5+3';
          beyaz_saniye?: number;
          siyah_saniye?: number;
          saat_basladi_at?: string | null;
          sonuc?: string | null;
          bitis_sebebi?: string | null;
          pgn?: string | null;
          plies?: number;
        };
        Relationships: [];
      };
      live_moves: {
        Row: {
          id: number;
          session_id: string;
          ply: number;
          san: string;
          from_sq: string;
          to_sq: string;
          promotion: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          ply: number;
          san: string;
          from_sq: string;
          to_sq: string;
          promotion?: string | null;
          user_id?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      coach_students: {
        Row: { koc_id: string; ogrenci_id: string; created_at: string };
        Insert: { koc_id: string; ogrenci_id: string };
        Update: never;
        Relationships: [];
      };
      parent_children: {
        Row: { veli_id: string; ogrenci_id: string; created_at: string };
        Insert: { veli_id: string; ogrenci_id: string };
        Update: never;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          koc_id: string;
          yazan_id: string;
          puan: number;
          yorum: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          koc_id: string;
          yazan_id: string;
          puan: number;
          yorum?: string;
        };
        Update: never;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          yazar_id: string;
          baslik: string;
          metin: string;
          durum: 'bekliyor' | 'yayinda' | 'red';
          ret_gerekce: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          yazar_id: string;
          baslik: string;
          metin: string;
          durum?: 'bekliyor' | 'yayinda' | 'red';
          ret_gerekce?: string | null;
        };
        Update: { durum?: 'bekliyor' | 'yayinda' | 'red'; ret_gerekce?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      cocuklarim: { Args: Record<string, never>; Returns: { id: string; ad: string }[] };
      veli_kodu_olustur: { Args: Record<string, never>; Returns: string };
      // Bulunamadı / çok fazla deneme durumunda null döner.
      veli_bagkur: { Args: { p_kod: string }; Returns: string | null };
      // Katılma sunucuda atomik yapılır (yanlış kod → hata fırlatır).
      live_katil: {
        Args: { p_kod: string; p_oyun_turu: 'ders' | 'oyun' };
        Returns: Database['public']['Tables']['live_sessions']['Row'];
      };
      live_hamle_yap: {
        Args: {
          p_session_id: string;
          p_ply: number;
          p_san: string;
          p_from: string;
          p_to: string;
          p_promotion: string | null;
          p_fen: string;
          p_pgn: string;
        };
        Returns: Database['public']['Tables']['live_sessions']['Row'];
      };
      live_oyun_bitir: {
        Args: { p_session_id: string; p_bitis_sebebi: string; p_pgn: string; p_plies: number };
        Returns: Database['public']['Tables']['live_sessions']['Row'];
      };
      // PII: yalnızca kişinin kendi başvuru notu/gerekçesi.
      koc_basvurum: {
        Args: Record<string, never>;
        Returns: {
          basvuru_notu: string | null;
          ret_gerekce: string | null;
          onay_durumu: string;
          onay_tarihi: string | null;
          elo_kanit: string | null;
        }[];
      };
      koc_basvuru_gonder: {
        Args: {
          p_seviye: string;
          p_elo: number | null;
          p_elo_kanit: string | null;
          p_fiyat: number;
          p_yil: number;
          p_tsf_belgeli: boolean;
        };
        Returns: string;
      };
      // PII: yalnızca moderatör için dolu döner.
      moderator_basvurular: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['coach_profiles']['Row'][];
      };
      hesabimi_sil: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Homework = Database['public']['Tables']['homework']['Row'];
export type Puzzle = Database['public']['Tables']['puzzles']['Row'];
export type CoachProfile = Database['public']['Tables']['coach_profiles']['Row'];
export type Availability = Database['public']['Tables']['availability']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type LiveSession = Database['public']['Tables']['live_sessions']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type CoachStudent = Database['public']['Tables']['coach_students']['Row'];
export type ParentChild = Database['public']['Tables']['parent_children']['Row'];

export const SEVIYELER = ['Başlangıç', 'Orta', 'İleri'] as const;

export const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

export const TEMA_ADLARI: Record<string, string> = {
  mat1: 'Tek hamlede mat',
  catal: 'Çatal',
  kazan: 'Taş kazan',
};

