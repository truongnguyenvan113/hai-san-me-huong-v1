import { Product, UnitType } from '../types';

export interface ScannedPriceItem {
  id: string;
  product_name: string;
  category: string;
  unit: UnitType | string;
  unit_price: number;
  total_price: number;
  package_qty: number;
  raw_price_str: string;
  size?: string;
  note?: string;
  selected: boolean;
  status: 'NEW' | 'UPDATE' | 'UNCHANGED';
  existingProductId?: string;
  existingProductOldPrice?: number;
  existingProductOldUnit?: string;
}

// Normalize Vietnamese string for robust matching
export function normalizeVi(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Auto categorize seafood based on product name keywords
export function detectCategory(name: string, knownCategories: string[] = []): string {
  const norm = normalizeVi(name);

  if (norm.includes('tom')) return 'Tôm';
  if (norm.includes('cua')) return 'Cua';
  if (norm.includes('ghe')) return 'Ghẹ';
  if (norm.includes('muc') || norm.includes('tuoc')) return 'Mực';
  if (
    norm.includes('ca ') ||
    norm.startsWith('ca') ||
    norm.includes('thu') ||
    norm.includes('hoi') ||
    norm.includes('bon') ||
    norm.includes('moi') ||
    norm.includes('nuc')
  ) {
    return 'Cá biển';
  }
  if (
    norm.includes('oc') ||
    norm.includes('ngao') ||
    norm.includes('hau') ||
    norm.includes('so') ||
    norm.includes('dat') ||
    norm.includes('mong tay') ||
    norm.includes('chem chep')
  ) {
    return 'Ốc & Ngao';
  }
  if (
    norm.includes('cha') ||
    norm.includes('re') ||
    norm.includes('nem') ||
    norm.includes('vien') ||
    norm.includes('xù') ||
    norm.includes('ram')
  ) {
    return 'Chế biến';
  }
  if (
    norm.includes('nuoc mam') ||
    norm.includes('mam') ||
    norm.includes('gia vi') ||
    norm.includes('dau hao') ||
    norm.includes('sa sung')
  ) {
    return 'Khác';
  }

  // Check known categories
  for (const cat of knownCategories) {
    if (cat === 'Tất cả') continue;
    if (norm.includes(normalizeVi(cat))) return cat;
  }

  return 'Hải sản';
}

/**
 * Intelligent rule-based parser for seafood price lists
 * Handles special expressions like:
 * - 155k/lít, 155k/lit
 * - 210/2hộp, 210k/2hộp, 210k/2 hộp -> 105,000đ/hộp
 * - 280k/kg, 320/kg
 * - 90k/khay, 120k/con, 45k/chai, 350k/thùng, 50k/túi, 60k/bịch
 * - sizes like "size 18-20c", "loại 1"
 */
export function ruleBasedPriceListParser(
  rawText: string,
  existingProducts: Product[] = [],
  knownCategories: string[] = []
): ScannedPriceItem[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ScannedPriceItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Skip general banner/header lines
    const normLine = rawLine.toLowerCase();
    if (
      normLine.includes('bảng giá') ||
      normLine.includes('thực đơn') ||
      normLine.includes('menu') ||
      normLine.includes('hôm nay') ||
      normLine.includes('kính mời') ||
      normLine.includes('liên hệ') ||
      normLine.includes('chào anh') ||
      normLine.includes('chào chị') ||
      normLine.includes('freeship') ||
      normLine.startsWith('đợt gom')
    ) {
      // Check if line contains a price expression, if not, skip
      if (!/\d+\s*(?:k|đ|vnd|\/)/i.test(rawLine)) {
        continue;
      }
    }

    // Clean leading bullets, dashes, numbers
    const cleanLine = rawLine.replace(/^[\-\*\•\d\.\)\:]\s*/, '').trim();

    // Regex 1: Multi-unit or single-unit with slash: e.g. "210/2hộp", "155k/lít", "210k / 2 hộp", "280k/kg", "450k/2kg"
    const slashPriceRegex = /([0-9]+[0-9.,]*)\s*(?:k|đ|vnd|nghìn)?\s*\/\s*([0-9]+[0-9.,]*)?\s*([a-zA-ZÀ-ỹ]+)/i;

    // Regex 2: Standard single price with unit: e.g. "280k", "280.000đ", "180k/kg"
    const standardPriceRegex = /([0-9]+[0-9.,]*)\s*(k|đ|vnd|nghìn)\b/i;

    // Regex 3: Plain price at line end: e.g. ": 250" or "- 250"
    const plainNumAtEndRegex = /[:\-–=]\s*([0-9]+[0-9.,]*)\s*$/;

    let matchedPrice = 0;
    let packageQty = 1;
    let unit = 'kg';
    let rawPriceStr = '';
    let name = '';
    let size = '';

    const slashMatch = cleanLine.match(slashPriceRegex);
    if (slashMatch) {
      const rawPriceNum = parseFloat(slashMatch[1].replace(/,/g, '.'));
      const parsedTotalPrice = rawPriceNum < 1000 ? Math.round(rawPriceNum * 1000) : Math.round(rawPriceNum);
      const parsedQty = slashMatch[2] ? parseFloat(slashMatch[2].replace(/,/g, '.')) : 1;
      let rawUnit = slashMatch[3].toLowerCase().trim();

      if (rawUnit === 'lit' || rawUnit === 'l') rawUnit = 'lít';
      if (rawUnit === 'hop') rawUnit = 'hộp';
      if (rawUnit === 'tui') rawUnit = 'túi';
      if (rawUnit === 'bich') rawUnit = 'bịch';
      if (rawUnit === 'thung') rawUnit = 'thùng';

      unit = rawUnit;
      packageQty = parsedQty > 0 ? parsedQty : 1;
      matchedPrice = Math.round(parsedTotalPrice / packageQty);
      rawPriceStr = slashMatch[0].trim();

      // Extract name (part before the slashMatch or after if inverted)
      const beforePart = cleanLine.substring(0, slashMatch.index).trim();
      const afterPart = cleanLine.substring(slashMatch.index! + slashMatch[0].length).trim();

      if (beforePart) {
        name = beforePart.replace(/[:\-–=]\s*$/, '').trim();
        if (afterPart) size = afterPart.replace(/^[\(\[]/, '').replace(/[\)\]]$/, '').trim();
      } else {
        name = afterPart.replace(/^[:\-–=]\s*/, '').trim();
      }
    } else {
      const stdMatch = cleanLine.match(standardPriceRegex);
      if (stdMatch) {
        const rawPriceNum = parseFloat(stdMatch[1].replace(/,/g, '.'));
        matchedPrice = rawPriceNum < 1000 ? Math.round(rawPriceNum * 1000) : Math.round(rawPriceNum);
        rawPriceStr = stdMatch[0].trim();

        const beforePart = cleanLine.substring(0, stdMatch.index).trim();
        const afterPart = cleanLine.substring(stdMatch.index! + stdMatch[0].length).trim();

        name = beforePart.replace(/[:\-–=]\s*$/, '').trim();
        if (afterPart) {
          // Check if afterPart specifies unit like "hộp", "khay", "lít"
          const unitMatch = afterPart.match(/^\s*(?:cho\s+|trên\s+|1\s*)?([a-zA-ZÀ-ỹ]+)/i);
          if (unitMatch) {
            const u = unitMatch[1].toLowerCase();
            if (['lít', 'lit', 'hộp', 'khay', 'con', 'túi', 'chai', 'lon', 'thùng', 'bịch', 'suất'].includes(u)) {
              unit = u === 'lit' ? 'lít' : u;
            }
          }
          size = afterPart.replace(/^[\(\[]/, '').replace(/[\)\]]$/, '').trim();
        }
      } else {
        const plainMatch = cleanLine.match(plainNumAtEndRegex);
        if (plainMatch) {
          const rawPriceNum = parseFloat(plainMatch[1].replace(/,/g, '.'));
          matchedPrice = rawPriceNum < 1000 ? Math.round(rawPriceNum * 1000) : Math.round(rawPriceNum);
          rawPriceStr = plainMatch[1];
          name = cleanLine.substring(0, plainMatch.index).trim();
        }
      }
    }

    if (!matchedPrice || !name) continue;

    // Extract size if present in name, e.g. "Tôm he (size 20c)" or "Mực trứng sz 18-20"
    const sizeRegex = /\(([^)]+)\)|(?:size|sz)\s*[:\-–]?\s*([0-9\/\-]+(?:\s*c(?:on)?(?:\/kg)?)?)/i;
    const sizeMatch = name.match(sizeRegex);
    if (sizeMatch) {
      size = (sizeMatch[1] || sizeMatch[2] || '').trim();
      name = name.replace(sizeRegex, '').trim();
    }

    // Capitalize product name
    name = name.replace(/[:\-–=,]\s*$/, '').trim();
    if (!name) continue;
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    // Build special specification note for multi-unit (e.g., 210/2hộp)
    let note = '';
    if (packageQty > 1) {
      note = `${rawPriceStr} (~${(matchedPrice / 1000).toLocaleString()}k/${unit})`;
    } else {
      note = rawPriceStr;
    }

    // Determine category
    const category = detectCategory(formattedName, knownCategories);

    // Check with existing products
    const normFormatted = normalizeVi(formattedName);
    const existing = existingProducts.find(
      (p) => normalizeVi(p.product_name) === normFormatted || normalizeVi(p.product_name).includes(normFormatted) || normFormatted.includes(normalizeVi(p.product_name))
    );

    let status: ScannedPriceItem['status'] = 'NEW';
    let existingProductId: string | undefined = undefined;
    let existingProductOldPrice: number | undefined = undefined;
    let existingProductOldUnit: string | undefined = undefined;

    if (existing) {
      existingProductId = existing.product_id;
      existingProductOldPrice = existing.default_price;
      existingProductOldUnit = existing.unit;
      status = existing.default_price === matchedPrice ? 'UNCHANGED' : 'UPDATE';
    }

    items.push({
      id: `price-item-${Date.now()}-${i}`,
      product_name: existing ? existing.product_name : formattedName,
      category: existing ? existing.category : category,
      unit: unit,
      unit_price: matchedPrice,
      total_price: matchedPrice * packageQty,
      package_qty: packageQty,
      raw_price_str: rawPriceStr,
      size: size || (existing?.size || ''),
      note: note,
      selected: true,
      status: status,
      existingProductId: existingProductId,
      existingProductOldPrice: existingProductOldPrice,
      existingProductOldUnit: existingProductOldUnit,
    });
  }

  return items;
}
