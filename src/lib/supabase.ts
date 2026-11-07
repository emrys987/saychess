import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY eksik. .env.example dosyasını .env.local olarak kopyalayıp doldurun.',
  );
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Mobilde oturum expo-sqlite tabanlı localStorage'da; web'de tarayıcının kendi localStorage'ı kullanılır.
    ...(isWeb ? {} : { storage: localStorage }),
    // PKCE: dönüşte URL'de ?code= gelir, uygulama bunu oturuma çevirir.
    // Implicit akış Expo Go'da siyah ekranda takılabiliyor.
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    // Web'de Google dönüşünde kod URL'den okunur; mobilde bunu biz yapıyoruz.
    detectSessionInUrl: isWeb,
  },
});

if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
