import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { storage } from './storage';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Workspace Scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory & persisted token cache (kept until explicit logout)
const TOKEN_KEY = 'seafood_google_access_token';
const AUTO_RECONNECT_KEY = 'seafood_google_auto_reconnect';
const TOKEN_SAVED_AT_KEY = 'seafood_google_token_saved_at';

let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
let isSigningIn = false;

export const isAutoReconnectEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTO_RECONNECT_KEY) === 'true';
};

export const setAutoReconnect = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(AUTO_RECONNECT_KEY, 'true');
  } else {
    localStorage.removeItem(AUTO_RECONNECT_KEY);
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken && typeof window !== 'undefined') {
        cachedAccessToken = localStorage.getItem(TOKEN_KEY);
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_SAVED_AT_KEY);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không thể lấy Access Token từ Google Workspace Auth');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, credential.accessToken);
      localStorage.setItem(AUTO_RECONNECT_KEY, 'true');
      localStorage.setItem(TOKEN_SAVED_AT_KEY, Date.now().toString());
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google:', error);
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      const customErr = new Error(
        'Cửa sổ đăng nhập đã bị trình duyệt chặn (auth/popup-blocked). Vui lòng bấm vào biểu tượng Popup trên thanh địa chỉ để Cho phép, hoặc mở ứng dụng trong Tab mới.'
      );
      (customErr as any).code = 'auth/popup-blocked';
      throw customErr;
    }
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
      const customErr = new Error('Cửa sổ đăng nhập đã được đóng trước khi hoàn tất xác thực.');
      (customErr as any).code = 'auth/popup-closed-by-user';
      throw customErr;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const refreshGoogleSession = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, credential.accessToken);
        localStorage.setItem(AUTO_RECONNECT_KEY, 'true');
        localStorage.setItem(TOKEN_SAVED_AT_KEY, Date.now().toString());
      }
      return { user: result.user, accessToken: credential.accessToken };
    }
    return null;
  } catch (err) {
    console.warn('Không thể tự động làm mới phiên Google:', err);
    return null;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_KEY);
  }
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_SAVED_AT_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_SAVED_AT_KEY);
    }
  }
};

export const googleLogout = async () => {
  // 1. Automatically create a safe backup snapshot of source data BEFORE logging out
  try {
    const currentOrders = storage.getOrders();
    const currentBatches = storage.getBatches();
    if (currentOrders.length > 0 || currentBatches.length > 0) {
      storage.createSnapshot(
        'BEFORE_ACCOUNT_SWITCH',
        'Bản sao lưu trước khi đăng xuất tài khoản Google'
      );
    }
  } catch (e) {
    console.warn('Lỗi tạo bản sao lưu an toàn khi đăng xuất:', e);
  }

  // 2. Perform clean sign out and remove auto-reconnect flag so user can connect another account
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTO_RECONNECT_KEY);
    localStorage.removeItem(TOKEN_SAVED_AT_KEY);
  }
};
