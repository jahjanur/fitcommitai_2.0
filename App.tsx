import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/screens/SplashScreen/SplashScreen';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Pre-load fonts here if you have any custom fonts
        // await Font.loadAsync({
        //   'YourFont': require('./assets/fonts/YourFont.ttf'),
        // });

        // Simulate a long loading process for demonstration
        // await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <CustomSplashScreen onFinish={onLayoutRootView} />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
