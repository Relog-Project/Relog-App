import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { BASE_URL, NATIVE_LOGIN_URL } from '../constants/config';

// 카드앱 및 결제 관련 URL 스킴 목록
const CARD_APP_SCHEMES = [
  'ispmobile',       // ISP/페이북
  'shinhan-sr-ansimclick', // 신한카드
  'kb-acp',          // KB국민카드
  'liiv',            // KB리브
  'lottesmartpay',   // 롯데카드
  'lotteappcard',    // 롯데앱카드
  'cloudpay',        // 하나카드
  'nhallonepayapp',  // NH올원페이
  'nhcard',          // NH카드
  'citispay',        // 씨티카드
  'citicardglobal',
  'kakaotalk',       // 카카오페이
  'tossapp',         // 토스
  'supertoss',       // 토스
  'lpayapp',         // L페이
  'samsungpay',      // 삼성페이
  'wooripay',        // 우리카드
  'com.wooricard.wapps',
  'hyundaicardappcardansimclick', // 현대카드
  'ansimclick',
  'hdcardappcardansimclick',
  'smhyundaiansimclick',
  'shinhanansimclick',
  'bankpaynow',      // 뱅크페이
  'mpocket.online.ansimclick',
  'scardcertiapp',   // 삼성카드
  'monimopay',       // 모니모
];

function isCardAppUrl(url: string): boolean {
  if (url.startsWith('intent://')) return true;
  return CARD_APP_SCHEMES.some((scheme) => url.startsWith(`${scheme}://`));
}

// intent://path#Intent;scheme=xxx;package=yyy;end → xxx://path 로 재조합
function parseIntentUrl(url: string): { appUrl: string | null; packageName: string | null; fallback: string | null } {
  const schemeMatch = url.match(/scheme=([^;]+)/);
  const packageMatch = url.match(/package=([^;]+)/);
  const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);

  const path = url.replace('intent://', '').replace(/#Intent;.*$/, '');
  const scheme = schemeMatch?.[1] ?? null;
  const appUrl = scheme && path ? `${scheme}://${path}` : null;
  const packageName = packageMatch?.[1] ?? null;
  const fallback = fallbackMatch ? decodeURIComponent(fallbackMatch[1]) : null;

  return { appUrl, packageName, fallback };
}

async function openCardApp(url: string) {
  try {
    if (url.startsWith('intent://')) {
      const { appUrl, packageName, fallback } = parseIntentUrl(url);

      // 1순위: scheme://path 형태로 앱 직접 실행
      if (appUrl) {
        try {
          await Linking.openURL(appUrl);
          return;
        } catch {
          // 앱 미설치 등으로 실패 → 다음 단계로
        }
      }

      // 2순위: Play Store로 이동
      if (packageName) {
        try {
          await Linking.openURL(`market://details?id=${packageName}`);
          return;
        } catch {
          // Play Store 실패 → fallback
        }
      }

      // 3순위: fallback URL
      if (fallback) {
        await Linking.openURL(fallback);
      }
      return;
    }

    // iOS / Android 카드앱 스킴 직접 실행
    await Linking.openURL(url);
  } catch (e) {
    console.warn('카드앱 실행 실패:', url, e);
  }
}

export default function Index() {
  const inset = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [webViewUrl, setWebViewUrl] = useState(BASE_URL);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    const redirectUrl = Linking.createURL('');
    const authUrl = `${NATIVE_LOGIN_URL}?provider=${provider}&app_redirect=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type === 'success' && result.url) {
      const { queryParams } = Linking.parse(result.url);

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

    // Google 로그인
    if (url.includes('accounts.google.com') || url.includes('/api/auth/signin/google')) {
      handleSocialLogin('google');
      return false;
    }

    // Apple 로그인
    if (url.includes('appleid.apple.com') || url.includes('/api/auth/signin/apple')) {
      handleSocialLogin('apple');
      return false;
    }

    // 카드앱 딥링크 — 네이티브로 처리
    if (isCardAppUrl(url)) {
      openCardApp(url);
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
        // intent://, 카드앱 스킴 등 비표준 URL도 핸들러로 전달
        originWhitelist={['*']}
        // 팝업 없이 현재 WebView에서 리디렉션 처리
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={(navState: WebViewNavigation) => {
          if (
            navState.url.includes('accounts.google.com') ||
            navState.url.includes('/api/auth/signin/google') ||
            navState.url.includes('appleid.apple.com') ||
            navState.url.includes('/api/auth/signin/apple')
          ) {
            webViewRef.current?.stopLoading();
            const provider = navState.url.includes('apple') ? 'apple' : 'google';
            handleSocialLogin(provider);
          }
        }}
        onMessage={(event) => {
          console.log('WebView 메시지:', event.nativeEvent.data);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
