import CustomSafeAreaView from '@/providers/CustomSafeAreaView';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <CustomSafeAreaView>
      <Stack screenOptions={{ headerShown: false }} />
    </CustomSafeAreaView>
  );
}
