/**
 * VietQR EMVCo Standard Generator & Offline QR Utility
 * Compliant with Napas 24/7 Fast Transfer QR Standard (State Bank of Vietnam)
 */
import QRCode from 'qrcode';

// Strip Vietnamese tone accents for standard banking memo compatibility
export function removeVietnameseTones(str: string = ''): string {
  let result = str;
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  result = result.replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
  // Remove special characters not allowed in Napas memo (keep alphanumeric and space)
  result = result.replace(/[^a-zA-Z0-9\s-]/g, ' ');
  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

/**
 * Format TLV (Tag-Length-Value) as required by EMVCo QR Code Specification
 */
function formatTlv(tag: string, value: string): string {
  if (!value) return '';
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Calculate CRC16 (CCITT-FALSE, polynomial 0x1021, init 0xFFFF) for EMVCo QR Code
 */
function calculateCrc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface VietQROptions {
  bin: string; // 6-digit Bank BIN (e.g. 970425 for ABBANK, 970418 for BIDV)
  accountNumber: string; // Account number (keeps leading 0s)
  accountName?: string;
  amount?: number;
  memo?: string;
}

/**
 * Generate standard EMVCo VietQR string compliant with Napas 24/7
 */
export function generateVietQREmvcoString({
  bin,
  accountNumber,
  amount = 0,
  memo = '',
}: VietQROptions): string {
  const cleanBin = (bin || '970425').trim().replace(/\D/g, '');
  // CRITICAL: Preserve leading zeros in account number! Never parse as Number
  const cleanAcc = (accountNumber || '').trim().replace(/\s+/g, '');
  if (!cleanAcc) return '';

  const cleanAmount = Math.max(0, Math.round(amount || 0));
  const cleanMemo = removeVietnameseTones(memo).slice(0, 50);

  // 1. Tag 00: Payload Format Indicator ("01")
  const tag00 = formatTlv('00', '01');

  // 2. Tag 01: Point of Initiation Method ("12" = Dynamic with amount, "11" = Static)
  const tag01 = formatTlv('01', cleanAmount > 0 ? '12' : '11');

  // 3. Tag 38: Merchant Account Information (Napas GUID A000000727 + Bank BIN + Account)
  const sub38_00 = formatTlv('00', 'A000000727');
  const sub38_01_sub00 = formatTlv('00', cleanBin);
  const sub38_01_sub01 = formatTlv('01', cleanAcc);
  const sub38_01 = formatTlv('01', sub38_01_sub00 + sub38_01_sub01);
  const sub38_02 = formatTlv('02', 'QRIBFTTA'); // Napas Fast Transfer to Account

  const tag38 = formatTlv('38', sub38_00 + sub38_01 + sub38_02);

  // 4. Tag 53: Transaction Currency (VND = 704)
  const tag53 = formatTlv('53', '704');

  // 5. Tag 54: Transaction Amount (optional if 0)
  const tag54 = cleanAmount > 0 ? formatTlv('54', cleanAmount.toString()) : '';

  // 6. Tag 58: Country Code ("VN")
  const tag58 = formatTlv('58', 'VN');

  // 7. Tag 62: Additional Data Field Template (Tag 08 = Purpose / Message)
  let tag62 = '';
  if (cleanMemo) {
    const sub62_08 = formatTlv('08', cleanMemo);
    tag62 = formatTlv('62', sub62_08);
  }

  // Combine payload before CRC
  const payloadBeforeCrc = `${tag00}${tag01}${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
  const crc = calculateCrc16(payloadBeforeCrc);

  return `${payloadBeforeCrc}${crc}`;
}

/**
 * Generate Offline Data URL (Base64 PNG) for VietQR
 * Works 100% offline with zero internet connection!
 */
export async function generateOfflineVietQRDataUrl(
  options: VietQROptions,
  size: number = 300
): Promise<string> {
  const emvco = generateVietQREmvcoString(options);
  if (!emvco) return '';

  try {
    const dataUrl = await QRCode.toDataURL(emvco, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating offline VietQR:', err);
    return '';
  }
}

/**
 * Generate Offline SVG string for crisp vector printing on A4
 */
export async function generateOfflineVietQRSvg(
  options: VietQROptions,
  size: number = 200
): Promise<string> {
  const emvco = generateVietQREmvcoString(options);
  if (!emvco) return '';

  try {
    const svg = await QRCode.toString(emvco, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return svg;
  } catch (err) {
    console.error('Error generating offline VietQR SVG:', err);
    return '';
  }
}
