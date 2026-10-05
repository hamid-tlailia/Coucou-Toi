import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { usePrefs } from '../context/Prefs';
import { Txt, Input, Button, FadeIn, haptic } from '../components/ui';
import { RED } from '../theme';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { t, th } = usePrefs();
  const [mode, setMode] = useState('in');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', store: '', email: '', pass: '' });
  const [err, setErr] = useState('');

  const submit = async () => {
    const email = f.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setErr(t.badEmail);
    if (f.pass.length < 8) return setErr(t.badPass);
    if (mode === 'up' && !f.name.trim()) return setErr(t.required);
    setErr('');
    setBusy(true);
    try {
      if (mode === 'up') await signUp({ name: f.name.trim(), store: f.store.trim() || undefined, email, password: f.pass });
      else await signIn(email, f.pass);
      haptic('success');
    } catch (e) {
      haptic('error');
      setErr(e.code === 'network' ? t.offline : e.code === 'email_taken' ? t.emailTaken : e.status === 401 ? t.badLogin : t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={th.mode === 'dark' ? ['#2B1A31', '#0F0A11', '#0F0A11'] : ['#EFE3D3', '#F7F3ED', '#F7F3ED']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 26 }} keyboardShouldPersistTaps="handled">
            <FadeIn style={{ alignItems: 'center', marginBottom: 34 }}>
              <Image source={require('../../assets/icon.png')} style={{ width: 96, height: 96, borderRadius: 30, marginBottom: 20 }} />
              <Txt w="x" size={30}>{t.welcome}</Txt>
              <Txt size={14.5} color={th.muted} style={{ marginTop: 6, textAlign: 'center' }}>{t.authSub}</Txt>
            </FadeIn>

            <FadeIn delay={120}>
              <View style={{ flexDirection: 'row', backgroundColor: th.raised, borderRadius: 16, padding: 4, marginBottom: 8, borderWidth: 1, borderColor: th.border }}>
                {[['in', t.signIn], ['up', t.signUp]].map(([k, l]) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Button small title={l} variant={mode === k ? 'gold' : 'ghost'} onPress={() => { setMode(k); setErr(''); }}
                      style={mode !== k && { opacity: 0.8 }} />
                  </View>
                ))}
              </View>

              {mode === 'up' && (
                <>
                  <Input icon="person-outline" label={t.fullName} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
                  <Input icon="storefront-outline" label={t.storeName} value={f.store} onChangeText={(v) => setF({ ...f, store: v })} />
                </>
              )}
              <Input icon="mail-outline" label={t.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email"
                value={f.email} onChangeText={(v) => setF({ ...f, email: v })} />
              <Input icon="lock-closed-outline" label={t.password} secureTextEntry autoComplete="password"
                value={f.pass} onChangeText={(v) => setF({ ...f, pass: v })} onSubmitEditing={submit} />

              {!!err && <Txt w="m" size={13} color={RED} style={{ marginTop: 12, textAlign: 'center' }}>{err}</Txt>}

              <Button title={mode === 'in' ? t.signIn : t.signUp} icon={mode === 'in' ? 'log-in-outline' : 'sparkles-outline'}
                onPress={submit} loading={busy} style={{ marginTop: 24 }} />
            </FadeIn>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
