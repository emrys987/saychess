import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession(); // yalnızca web için gerekli

// Expo Go'da exp://<ip>:8081/--/auth-callback, dev build'de saychess://auth-callback üretir.
const redirectTo = makeRedirectUri({ path: 'auth-callback' });

/** Supabase dönüş URL'sindeki `?query` ve `#fragment` parametrelerini birleştirir. */
export function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => {
      params[key] = value;
    });
  }
  return params;
}

async function createSessionFromUrl(url: string) {
  const params = parseAuthParams(url);
  if (params.error) throw new Error(params.error_description ?? params.error);

  // PKCE akışı: dönüş adresinde ?code=... gelir
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return;
  }

  // Yedek: implicit akış (#access_token=...)
  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

/**
 * Uygulamaya gelen herhangi bir derin bağlantıyı oturuma çevirir.
 * Tarayıcı/oturum penceresi kapanmasa bile Expo Go bağlantıyı uygulamaya iletir;
 * bu dinleyici sayesinde giriş tamamlanır.
 */
export async function handleAuthUrl(url: string) {
  if (!url.includes('code=') && !url.includes('access_token=') && !url.includes('error=')) return;
  await createSessionFromUrl(url);
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    // Tarayıcı Google'a gider, dönüşte supabase oturumu URL'den kendisi okur.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type === 'success') {
    await createSessionFromUrl(res.url);
  }
}
