// constants/config.ts

/**
 * ngrok URL이 바뀔 때마다 이 부분만 수정하면 됩니다.
 */
const NGROK_URL = 'https://b13d-121-138-205-164.ngrok-free.app'; // 여기에 발급받은 ngrok 주소를 입력하세요.
const PRODUCTION_URL = 'https://your-production-app.com';

// 개발 모드(__DEV__) 여부에 따라 BASE_URL 자동 결정
export const BASE_URL = NGROK_URL;

// 네이티브 로그인 엔드포인트
export const NATIVE_LOGIN_URL = `${BASE_URL}/api/auth/native-login`;
