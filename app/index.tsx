import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { BASE_URL, NATIVE_LOGIN_URL } from '../constants/config';

export default function Index() {
  const inset = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [webViewUrl, setWebViewUrl] = useState(BASE_URL);

  const handleGoogleLogin = async () => {
    // ✅ 'auth' 대신 '' (루트)로 변경
    const redirectUrl = Linking.createURL('');
    const authUrl = `${NATIVE_LOGIN_URL}?app_redirect=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    console.log('result:', result);

    if (result.type === 'success' && result.url) {
      const { queryParams } = Linking.parse(result.url);
      console.log('queryParams:', JSON.stringify(queryParams));

      if (queryParams?.status === 'success') {
        const token = queryParams?.token as string;

        if (token) {
          const decodedToken = decodeURIComponent(token);
          const injectJS = `
          (function() {
            document.cookie = "__Secure-next-auth.session-token=${decodedToken}; path=/; SameSite=None; Secure";
            document.cookie = "next-auth.session-token=${decodedToken}; path=/; SameSite=Lax";
            setTimeout(() => {
              window.location.replace("${BASE_URL}/dashboard");
            }, 300);
          })();
        `;
          setTimeout(() => {
            webViewRef.current?.injectJavaScript(injectJS);
          }, 500);
        } else {
          setTimeout(() => {
            setWebViewUrl(`${BASE_URL}/dashboard`);
            setWebViewKey((prev) => prev + 1);
          }, 500);
        }
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
      <WebView
        key={webViewKey}
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
        onMessage={(event) => {
          console.log('WebView 메시지:', event.nativeEvent.data); // 쿠키 내용 확인
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
