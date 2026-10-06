import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Entry point with a safety net: any error during startup (while modules
 * load, while rendering, or a fatal JS error later) is shown on screen
 * instead of leaving the user stuck on the splash screen or crashing.
 */
SplashScreen.preventAutoHideAsync().catch(() => {});

let fatal = null;
let notify = null;
const report = (e) => { fatal = e; notify?.(e); };

const defaultHandler = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  if (isFatal) report(error);
  else defaultHandler?.(error, isFatal);
});

let App = null;
try {
  App = require('./App').default;
} catch (e) {
  report(e);
}

function Fatal({ error }) {
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#120C14', paddingTop: 70, paddingHorizontal: 22 }}>
      <Text style={{ color: '#F0D49A', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>حدث خطأ أثناء التشغيل</Text>
      <Text style={{ color: '#A3949F', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 18 }}>
        أرسل لقطة شاشة لهذه الصفحة لإصلاح المشكلة
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text selectable style={{ color: '#F6F0E8', fontSize: 12.5, writingDirection: 'ltr', textAlign: 'left' }}>
          {String(error?.message || error)}
          {'\n\n'}
          {String(error?.stack || '').split('\n').slice(0, 14).join('\n')}
        </Text>
      </ScrollView>
    </View>
  );
}

class Boundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <Fatal error={this.state.error} /> : this.props.children; }
}

function Root() {
  const [error, setError] = useState(fatal);
  useEffect(() => { notify = setError; return () => { notify = null; }; }, []);
  if (error || !App) return <Fatal error={error || new Error('App failed to load')} />;
  return <Boundary><App /></Boundary>;
}

registerRootComponent(Root);
