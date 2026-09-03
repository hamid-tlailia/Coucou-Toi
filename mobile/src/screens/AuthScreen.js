import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../auth/AuthContext';
import { Input, PrimaryButton } from '../components/ui';
import { DEEP, PLUM } from '../theme';

export default function AuthScreen({ t, th, theme }) {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState('in');
  const [busy, setBusy] = useState('');
  const [f, setF] = useState({ name: '', store: '', email: '', pass: '' });
  const [err, setErr] = useState({});

  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  const submit = async () => {
    const e = {};
    if (!validEmail(f.email)) e.email = t.badEmail;
    if (f.pass.length < 8) e.pass = t.badPass;
    if (mode === 'up' && !f.name.trim()) e.name = t.required;
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy('email');
    try {
      if (mode === 'up') await signUpWithEmail({ name: f.name, store: f.store, email: f.email, password: f.pass });
      else await signInWithEmail(f.email, f.pass);
    } catch (ex) {
      setErr({ pass: ex.data?.message || t.error });
    } finally {
      setBusy('');
    }
  };

  const google = async () => {
    setBusy('google');
    try { await signInWithGoogle(); } catch { Alert.alert(t.error); } finally { setBusy(''); }
  };
  const apple = async () => {
    setBusy('apple');
    try { await signInWithApple(); } catch { /* user cancelled — no toast needed */ } finally { setBusy(''); }
  };

  return (
    <View style={{ flex: 1, padding: 26, paddingTop: 44, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 26 }}>
        <View style={[styles.logo]}><Text style={styles.logoText}>CL</Text></View>
        <Text style={[styles.title, { color: th.text }]}>{t.welcome}</Text>
        <Text style={[styles.sub, { color: th.muted }]}>{t.authSub}</Text>
      </View>

      <ButtonRow onPress={google} th={th} busy={busy === 'google'} label={t.continueGoogle} icon="G" />

      {AppleAuthentication.isAvailableAsync && (
        <View style={{ marginBottom: 18 }}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={theme === 'light' ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={{ height: 46 }}
            onPress={apple}
          />
        </View>
      )}

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: th.border }]} />
        <Text style={{ color: th.muted, fontSize: 11 }}>{t.orEmail}</Text>
        <View style={[styles.divider, { backgroundColor: th.border }]} />
      </View>

      {mode === 'up' && (
        <>
          <Input th={th} placeholder={t.fullName} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} style={{ marginBottom: err.name ? 4 : 10 }} />
          {!!err.name && <ErrText th={th}>{err.name}</ErrText>}
          <Input th={th} placeholder={t.storeName} value={f.store} onChangeText={(v) => setF({ ...f, store: v })} style={{ marginBottom: 10 }} />
        </>
      )}
      <Input th={th} placeholder={t.email} autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} style={{ marginBottom: err.email ? 4 : 10 }} />
      {!!err.email && <ErrText th={th}>{err.email}</ErrText>}
      <Input th={th} placeholder={t.password} secureTextEntry value={f.pass} onChangeText={(v) => setF({ ...f, pass: v })} style={{ marginBottom: err.pass ? 4 : 16 }} />
      {!!err.pass && <ErrText th={th}>{err.pass}</ErrText>}

      <PrimaryButton th={th} title={mode === 'in' ? t.signIn : t.signUp} onPress={submit} loading={busy === 'email'} />

      <Text onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr({}); }} style={{ textAlign: 'center', color: th.muted, fontSize: 12.5, marginTop: 16 }}>
        {mode === 'in' ? t.noAccount : t.haveAccount}
      </Text>
    </View>
  );
}

function ButtonRow({ onPress, th, busy, label, icon }) {
  return (
    <View onTouchEnd={onPress} style={[styles.oauthBtn, { borderColor: th.border, backgroundColor: th.surface }]}>
      {busy ? <ActivityIndicator size="small" color={PLUM} /> : <Text style={styles.oauthIcon}>{icon}</Text>}
      <Text style={{ color: th.text, fontWeight: '600', fontSize: 13.5 }}>{label}</Text>
    </View>
  );
}
function ErrText({ children, th }) {
  return <Text style={{ color: '#C24B44', fontSize: 11.5, marginBottom: 10 }}>{children}</Text>;
}

const styles = StyleSheet.create({
  logo: { width: 62, height: 62, borderRadius: 21, backgroundColor: DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { color: '#F3D9A8', fontWeight: '700', fontSize: 22 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 5, textAlign: 'center' },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, marginBottom: 10 },
  oauthIcon: { fontWeight: '800', color: '#4285F4' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  divider: { flex: 1, height: 1 },
});
