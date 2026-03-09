import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';

WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  const inset = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [webViewKey, setWebViewKey] = useState(0); // ✅ 리마운트용 key
  const [webViewUrl, setWebViewUrl] = useState('');

  const BASE_URL =
    Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000';

  const NATIVE_LOGIN_URL = `${BASE_URL}/api/auth/native-login`;

  // ✅ 초기 URL 설정
  useEffect(() => {
    setWebViewUrl(BASE_URL);
  }, []);

  const handleGoogleLogin = async () => {
    const redirectUrl = Linking.createURL('auth');
    const authUrl = `${NATIVE_LOGIN_URL}?app_redirect=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    console.log('result:', result);

    if (result.type === 'success' && result.url) {
      const { queryParams } = Linking.parse(result.url);

      if (queryParams?.status === 'success') {
        // ✅ 쿠키 동기화 대기 후 WebView 완전히 새로 마운트
        setTimeout(() => {
          setWebViewUrl(`${BASE_URL}/dashboard`);
          setWebViewKey((prev) => prev + 1); // WebView 리마운트
        }, 500);
      }
    }
  };

  const handleShouldStartLoad = (request: { url: string }) => {
    const { url } = request;
    if (
      url.includes('accounts.google.com') ||
      url.includes('/api/auth/signin/google')
    ) {
      handleGoogleLogin();
      return false;
    }
    return true;
  };

  const customUserAgent =
    Platform.OS === 'ios'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';

  return (
    <View style={styles.container}>
      {webViewUrl ? (
        <WebView
          key={webViewKey} // ✅ key 바뀌면 WebView 완전히 새로 시작
          ref={webViewRef}
          style={{ marginTop: inset.top }}
          source={{ uri: webViewUrl }}
          userAgent={customUserAgent}
          sharedCookiesEnabled={true}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={(navState: WebViewNavigation) => {
            if (
              navState.url.includes('accounts.google.com') ||
              navState.url.includes('/api/auth/signin/google')
            ) {
              webViewRef.current?.stopLoading();
              handleGoogleLogin();
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
