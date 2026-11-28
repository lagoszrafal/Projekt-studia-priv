import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

export function ScreenSecurityService(enabled: boolean) {
  useEffect(() => {
    let active = true;

    async function applyProtection() {
      try {
        if (Platform.OS === 'ios') {
          if (enabled) {
            await ScreenCapture.enableAppSwitcherProtectionAsync(0.8);
          } else {
            await ScreenCapture.disableAppSwitcherProtectionAsync();
          }
        } else if (Platform.OS === 'android') {
          if (enabled) {
            await ScreenCapture.preventScreenCaptureAsync();
          } else {
            await ScreenCapture.allowScreenCaptureAsync();
          }
        }
      } catch {
       
      }
    }

    if (active) {
      applyProtection();
    }

    return () => {
      active = false;
    };
  }, [enabled]);
}