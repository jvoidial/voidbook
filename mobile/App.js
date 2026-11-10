import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import Navigator from './src/Navigator';
import { STRIPE_PUBLISHABLE_KEY, stripeEnabled } from './src/lib/stripe';

export default function App() {
  // Only mount StripeProvider when a key exists; it throws on an empty key.
  const app = (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <StatusBar style="light" backgroundColor="#000" />
          <Navigator />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );

  return stripeEnabled
    ? <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>{app}</StripeProvider>
    : app;
}

