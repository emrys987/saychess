import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

function RootNavigator() {
  const { session, profile, loading, coachApplicationStatus, coachApplicationLoading } = useAuth();

  if (loading || coachApplicationLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const signedIn = !!session;
  const hasRole = !!profile?.rol;
  const kocFormunaErisilebilir = signedIn && profile?.rol === 'koc';
  const uygulamayaGirebilir =
    signedIn &&
    hasRole &&
    (profile?.rol !== 'koc' || coachApplicationStatus === 'beklemede' || coachApplicationStatus === 'onaylandi');
  const tabsRedirect = !signedIn ? '/login' : profile?.rol === 'koc' ? '/koc-basvuru' : '/rol-sec';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasRole}>
        <Stack.Screen name="rol-sec" />
      </Stack.Protected>
      <Stack.Protected guard={uygulamayaGirebilir} redirectTo={tabsRedirect}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={kocFormunaErisilebilir} redirectTo="/">
        <Stack.Screen name="koc-basvuru" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
