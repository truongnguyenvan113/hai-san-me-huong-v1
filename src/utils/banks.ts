export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  bin: string;
  logo?: string;
  isPopular?: boolean;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    code: 'ABBANK',
    name: 'Ngân hàng TMCP An Bình (ABBANK)',
    shortName: 'ABBANK',
    bin: '970425',
    isPopular: true,
  },
  {
    code: 'BIDV',
    name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
    shortName: 'BIDV',
    bin: '970418',
    isPopular: true,
  },
  {
    code: 'VIETCOMBANK',
    name: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    shortName: 'Vietcombank',
    bin: '970436',
    isPopular: true,
  },
  {
    code: 'VIETINBANK',
    name: 'Ngân hàng TMCP Công thương Việt Nam (VietinBank)',
    shortName: 'VietinBank',
    bin: '970415',
    isPopular: true,
  },
  {
    code: 'TECHCOMBANK',
    name: 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)',
    shortName: 'Techcombank',
    bin: '970407',
    isPopular: true,
  },
  {
    code: 'MBBANK',
    name: 'Ngân hàng TMCP Quân đội (MBBank)',
    shortName: 'MBBank',
    bin: '970422',
    isPopular: true,
  },
  {
    code: 'ACB',
    name: 'Ngân hàng TMCP Á Châu (ACB)',
    shortName: 'ACB',
    bin: '970416',
    isPopular: true,
  },
  {
    code: 'VPBANK',
    name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)',
    shortName: 'VPBank',
    bin: '970432',
    isPopular: true,
  },
  {
    code: 'TPBANK',
    name: 'Ngân hàng TMCP Tiên Phong (TPBank)',
    shortName: 'TPBank',
    bin: '970423',
    isPopular: true,
  },
  {
    code: 'SACOMBANK',
    name: 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)',
    shortName: 'Sacombank',
    bin: '970403',
    isPopular: true,
  },
  {
    code: 'HDBANK',
    name: 'Ngân hàng TMCP Phát triển TP.HCM (HDBank)',
    shortName: 'HDBank',
    bin: '970437',
    isPopular: true,
  },
  {
    code: 'VIB',
    name: 'Ngân hàng TMCP Quốc tế Việt Nam (VIB)',
    shortName: 'VIB',
    bin: '970441',
    isPopular: true,
  },
  {
    code: 'MSB',
    name: 'Ngân hàng TMCP Hàng Hải Việt Nam (MSB)',
    shortName: 'MSB',
    bin: '970426',
    isPopular: true,
  },
  {
    code: 'SEABANK',
    name: 'Ngân hàng TMCP Đông Nam Á (SeABank)',
    shortName: 'SeABank',
    bin: '970440',
  },
  {
    code: 'OCB',
    name: 'Ngân hàng TMCP Phương Đông (OCB)',
    shortName: 'OCB',
    bin: '970448',
  },
  {
    code: 'EXIMBANK',
    name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam (Eximbank)',
    shortName: 'Eximbank',
    bin: '970431',
  },
  {
    code: 'LPBANK',
    name: 'Ngân hàng TMCP Lộc Phát Việt Nam (LPBank / LienVietPostBank)',
    shortName: 'LPBank',
    bin: '970449',
  },
  {
    code: 'SHB',
    name: 'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)',
    shortName: 'SHB',
    bin: '970443',
  },
  {
    code: 'AGRIBANK',
    name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn VN (Agribank)',
    shortName: 'Agribank',
    bin: '970405',
    isPopular: true,
  },
  {
    code: 'BACABANK',
    name: 'Ngân hàng TMCP Bắc Á (Bac A Bank)',
    shortName: 'Bac A Bank',
    bin: '970409',
  },
  {
    code: 'PVCOMBANK',
    name: 'Ngân hàng TMCP Đại Chúng Việt Nam (PVcomBank)',
    shortName: 'PVcomBank',
    bin: '970412',
  },
  {
    code: 'NAMABANK',
    name: 'Ngân hàng TMCP Nam Á (Nam A Bank)',
    shortName: 'Nam A Bank',
    bin: '970428',
  },
  {
    code: 'VIETABANK',
    name: 'Ngân hàng TMCP Việt Á (VietABank)',
    shortName: 'VietABank',
    bin: '970427',
  },
  {
    code: 'SAIGONBANK',
    name: 'Ngân hàng TMCP Sài Gòn Công Thương (Saigonbank)',
    shortName: 'Saigonbank',
    bin: '970400',
  },
  {
    code: 'SHINHAN',
    name: 'Ngân hàng TNHH MTV Shinhan Việt Nam (Shinhan Bank)',
    shortName: 'Shinhan Bank',
    bin: '970424',
  },
  {
    code: 'KIENLONGBANK',
    name: 'Ngân hàng TMCP Kiên Long (Kienlongbank)',
    shortName: 'Kienlongbank',
    bin: '970452',
  },
  {
    code: 'BVBANK',
    name: 'Ngân hàng TMCP Bản Việt (BVBank)',
    shortName: 'BVBank',
    bin: '970454',
  },
  {
    code: 'TIMO',
    name: 'Ngân hàng số Timo by BVBank',
    shortName: 'Timo',
    bin: '963388',
    isPopular: true,
  },
  {
    code: 'CAKE',
    name: 'Ngân hàng số Cake by VPBank',
    shortName: 'Cake by VPBank',
    bin: '546034',
  },
  {
    code: 'WOORIBANK',
    name: 'Ngân hàng TNHH MTV Woori Việt Nam (Woori Bank)',
    shortName: 'Woori Bank',
    bin: '970457',
  },
  {
    code: 'VRB',
    name: 'Ngân hàng Liên doanh Việt - Nga (VRB)',
    shortName: 'VRB',
    bin: '970421',
  },
  {
    code: 'BAOVIETBANK',
    name: 'Ngân hàng TMCP Bảo Việt (BaoViet Bank)',
    shortName: 'BaoViet Bank',
    bin: '970438',
  },
  {
    code: 'PGBANK',
    name: 'Ngân hàng TMCP Thịnh vượng và Phát triển (PGBank)',
    shortName: 'PGBank',
    bin: '970430',
  },
  {
    code: 'PUBLICBANK',
    name: 'Ngân hàng TNHH MTV Public Việt Nam (PublicBank)',
    shortName: 'PublicBank',
    bin: '970439',
  },
  {
    code: 'OCEANBANK',
    name: 'Ngân hàng Thương mại TNHH MTV Đại Dương (OceanBank)',
    shortName: 'OceanBank',
    bin: '970414',
  },
  {
    code: 'GPBANK',
    name: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu (GPBank)',
    shortName: 'GPBank',
    bin: '970408',
  },
  {
    code: 'CBBANK',
    name: 'Ngân hàng Thương mại TNHH MTV Xây dựng VN (CBBank)',
    shortName: 'CBBank',
    bin: '970444',
  },
  {
    code: 'DONGABANK',
    name: 'Ngân hàng TMCP Đông Á (DongA Bank)',
    shortName: 'DongA Bank',
    bin: '970406',
  },
];

export const ALL_BANKS = VIETNAM_BANKS;

export const getBankByCodeOrName = (search: string = ''): BankInfo => {
  if (!search) return VIETNAM_BANKS[0];
  const clean = search.toLowerCase().replace(/[\s\-_.]+/g, '');

  const match = VIETNAM_BANKS.find(
    (b) =>
      b.code.toLowerCase().replace(/[\s\-_.]+/g, '') === clean ||
      b.shortName.toLowerCase().replace(/[\s\-_.]+/g, '') === clean ||
      b.bin === clean ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      clean.includes(b.code.toLowerCase())
  );

  return match || {
    code: search.toUpperCase(),
    name: search,
    shortName: search,
    bin: '970425', // Default ABBANK / VCB
  };
};

export const getBankBin = (bankCodeOrName: string = ''): string => {
  const bank = getBankByCodeOrName(bankCodeOrName);
  return bank.bin || '970425';
};
