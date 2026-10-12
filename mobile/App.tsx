import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  NotoSansTamil_400Regular,
  NotoSansTamil_500Medium,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
} from '@expo-google-fonts/noto-sans-tamil';

import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansTamil_400Regular,
    NotoSansTamil_500Medium,
    NotoSansTamil_600SemiBold,
    NotoSansTamil_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require('./assets/branding/app-logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
          accessibilityLabel="Government College Connect"
        />
        <View style={styles.emblemBox}>
          <Text style={styles.emblemTamil}>அறிவே ஆற்றல்</Text>
          <Text style={styles.emblemGov}>GOVT OF TAMIL NADU</Text>
        </View>
        <Text style={styles.collegeTitle}>Government Arts & Science College</Text>
        <Text style={styles.collegeSub}>Kuthalam, Mayiladuthurai District</Text>
        <ActivityIndicator
          size="small"
          color="#16A34A"
          style={{ marginTop: 24 }}
        />
        <Text style={styles.loadingText}>Initializing College Connect...</Text>

        {/* Developer Credit */}
        <View style={styles.splashFooter}>
          <Text style={styles.splashCreditText}>Developed by Abishek Shanmugavadivel</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emblemBox: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  emblemTamil: {
    color: '#DCE7DC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emblemGov: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  collegeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  collegeSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  splashLogo: {
    width: 72,
    height: 72,
    marginBottom: 16,
    borderRadius: 16,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  splashCreditText: {
    fontSize: 11,
    color: '#8A9B8A',
    letterSpacing: 0.4,
    fontWeight: '500',
  },
});
