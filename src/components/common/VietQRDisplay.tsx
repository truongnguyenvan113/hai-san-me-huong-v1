import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, WifiOff } from 'lucide-react';
import { generateVietQREmvcoString, generateOfflineVietQRDataUrl } from '../../utils/vietqrGenerator';
import { getVietQRUrl } from '../../utils/formatters';

interface VietQRDisplayProps {
  bin: string;
  accountNumber: string;
  accountName?: string;
  amount?: number;
  memo?: string;
  template?: 'compact2' | 'compact' | 'qr_only' | 'print';
  className?: string;
  sizeClass?: string;
  showCaption?: boolean;
  isPrintMode?: boolean;
  preferOffline?: boolean;
}

export const VietQRDisplay: React.FC<VietQRDisplayProps> = ({
  bin,
  accountNumber,
  accountName = '',
  amount = 0,
  memo = '',
  template = 'compact2',
  className = '',
  sizeClass = 'w-20 h-20',
  showCaption = false,
  isPrintMode = false,
  preferOffline = false,
}) => {
  // Ensure account number is a string preserving leading zeros
  const cleanAccount = useMemo(() => {
    return String(accountNumber || '').trim().replace(/\s+/g, '');
  }, [accountNumber]);

  const [offlineQrSrc, setOfflineQrSrc] = useState<string>('');
  const [useFallback, setUseFallback] = useState<boolean>(preferOffline);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Calculate online URL
  const onlineUrl = useMemo(() => {
    if (!cleanAccount) return '';
    return getVietQRUrl(bin, cleanAccount, accountName, amount, memo, template as any);
  }, [bin, cleanAccount, accountName, amount, memo, template]);

  // Generate offline QR Code locally (works with zero internet)
  useEffect(() => {
    if (!cleanAccount) {
      setOfflineQrSrc('');
      return;
    }

    let isMounted = true;
    generateOfflineVietQRDataUrl(
      {
        bin,
        accountNumber: cleanAccount,
        accountName,
        amount,
        memo,
      },
      320
    ).then((dataUrl) => {
      if (isMounted) {
        setOfflineQrSrc(dataUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [bin, cleanAccount, accountName, amount, memo]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setUseFallback(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!cleanAccount) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 rounded border border-dashed border-slate-300 ${sizeClass} ${className}`}>
        <QrCode className="w-6 h-6 opacity-40" />
        <span className="text-[9px] text-center mt-1">Chưa có STK</span>
      </div>
    );
  }

  // If print mode or offline or online failed: render offline Data URL
  const shouldRenderOffline = isPrintMode || preferOffline || !isOnline || useFallback || !onlineUrl;
  const currentSrc = shouldRenderOffline ? offlineQrSrc || onlineUrl : onlineUrl;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative bg-white p-0.5 rounded border border-slate-300 shadow-2xs">
        {currentSrc ? (
          <img
            src={currentSrc}
            alt="Mã VietQR Chuyển Khoản"
            className={`${sizeClass} object-contain bg-white block`}
            style={{ imageRendering: 'pixelated' }}
            loading="eager"
            onError={() => {
              // If online image failed (e.g. lost connection), immediately switch to offline QR
              setUseFallback(true);
            }}
          />
        ) : (
          <div className={`${sizeClass} flex items-center justify-center bg-slate-50 animate-pulse`}>
            <QrCode className="w-6 h-6 text-slate-300" />
          </div>
        )}

        {/* Offline indicator badge if not in print mode */}
        {!isPrintMode && useFallback && (
          <div
            className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-xs"
            title="Đang hiển thị mã VietQR Offline (hoạt động bình thường khi mất mạng)"
          >
            <WifiOff className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {showCaption && (
        <span className="text-[7.5px] font-black text-slate-800 uppercase tracking-tighter mt-0.5 flex items-center gap-0.5">
          <QrCode className="w-2 h-2 text-teal-800 inline" />
          QUÉT VIETQR {useFallback && '(OFFLINE)'}
        </span>
      )}
    </div>
  );
};
