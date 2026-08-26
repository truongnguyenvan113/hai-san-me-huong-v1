import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Persistent Idempotency File Storage on Server
const IDEMPOTENCY_FILE = path.join(process.cwd(), '.telegram_idempotency.json');

interface IdempotencyRecord {
  session_id: string;
  batch_id: string;
  processed_at: string;
  status: 'processed';
  data: any;
}

function loadIdempotencyStore(): Record<string, IdempotencyRecord> {
  try {
    if (fs.existsSync(IDEMPOTENCY_FILE)) {
      const raw = fs.readFileSync(IDEMPOTENCY_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Idempotency] Failed to read store file:', err);
  }
  return {};
}

function saveIdempotencyRecord(record: IdempotencyRecord): void {
  try {
    const store = loadIdempotencyStore();
    store[record.batch_id] = record;
    fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Idempotency] Failed to write record:', err);
  }
}

let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Fallback rule-based parser for offline / direct text notes or screenshot transcriptions
function ruleBasedTextParser(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let batchName = 'Đợt Hải Sản Mới';
  const orders: any[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/^[\-\*\•\d\.\)]\s*/, '').trim();

    if (
      cleanLine.toLowerCase().includes('hải sản') ||
      cleanLine.toLowerCase().includes('hsan') ||
      cleanLine.toLowerCase().startsWith('đợt')
    ) {
      batchName = cleanLine.replace(/[:\-]/g, '').trim();
      if (!batchName.toLowerCase().startsWith('hải sản') && !batchName.toLowerCase().startsWith('đợt')) {
        batchName = 'Đợt Hải Sản ' + batchName;
      }
      continue;
    }

    // Match lines like "2303A: 2kg mực nhỏ 280K chưa giao" or "12A06B: 1kg mực nhỏ 145K + 0.5kg nõn bề bề 185K, = 330Kdonr"
    const colonIdx = cleanLine.indexOf(':');
    if (colonIdx === -1) continue;

    const left = cleanLine.substring(0, colonIdx).trim();
    let right = cleanLine.substring(colonIdx + 1).trim();

    // Extract note tags at the end like "done", "donr", "dine", "chưa giao", "e lấy", "= 880K", "= 330Kdonr"
    let statusNote = '';
    if (/\b(?:done|donr|dine)\b/i.test(right)) {
      statusNote = 'Đã xong';
      right = right.replace(/\b(?:done|donr|dine)\b/gi, '').trim();
    }
    if (/\bchưa giao\b/i.test(right)) {
      statusNote = 'Chưa giao';
      right = right.replace(/\bchưa giao\b/gi, '').trim();
    }
    if (/\be lấy\b/i.test(right)) {
      statusNote = 'Khách tự lấy';
      right = right.replace(/\be lấy\b/gi, '').trim();
    }

    // Remove "= 880K" or "= 330K" total sum markers
    right = right.replace(/=\s*[\d.,]+\s*k(?:vnd)?/gi, '').trim();
    right = right.replace(/,\s*=\s*$/, '').trim();

    let building = 'Tòa A';
    let room = '';
    let customerName = left;

    // Check room pattern like 2303A, 12A06B, 1610B, 0707A, 1803B, p1707B
    const roomMatch = left.match(/^p?\.?\s*([0-9]{1,4}[A-Za-z]?[0-9]{0,2})([A-Za-z])?$/i);
    if (roomMatch) {
      const fullRoom = left.replace(/^p?\.?\s*/i, '').toUpperCase();
      room = fullRoom;
      const lastChar = fullRoom.slice(-1);
      if (lastChar === 'B') {
        building = 'Tòa B';
      } else if (lastChar === 'A') {
        building = 'Tòa A';
      } else if (lastChar === 'C') {
        building = 'Tòa C';
      } else {
        building = 'Tòa A';
      }
      customerName = `Căn ${room}`;
    } else {
      room = left.replace(/^(P|Phòng|Căn)\.?\s*/i, '').trim() || 'P.---';
    }

    // Split items by +, ,, ;, and
    const rawItems = right.split(/[+,;]|\bvà\b/i).map((s) => s.trim()).filter(Boolean);
    const items: any[] = [];

    for (const rawItem of rawItems) {
      let qty = 1;
      let unit = 'kg';
      let name = rawItem;
      let size = '';
      let procNote = '';
      let estimatedPrice = 150000;

      // Extract price like "280K", "145K", "55K", "120K", "390K"
      const priceMatch = name.match(/([\d.,]+)\s*k(?:vnd)?/i);
      if (priceMatch) {
        const pNum = parseFloat(priceMatch[1].replace(',', '.'));
        if (pNum) {
          estimatedPrice = pNum * 1000;
        }
        name = name.replace(/([\d.,]+)\s*k(?:vnd)?/gi, '').trim();
      }

      // Check size like "14-16c", "15/17c", "10-12c", "11-12c", "sz 20-22"
      const szMatch = name.match(/(?:size|sz\s*)?(\d{1,2}[\-\/]\d{1,2})\s*c\b/i) || name.match(/s(?:ize|z)\s*([\d-]+)/i);
      if (szMatch) {
        size = `Size ${szMatch[1]} con/kg`;
        name = name.replace(/(?:size|sz\s*)?\d{1,2}[\-\/]\d{1,2}\s*c\b/gi, '').replace(/s(?:ize|z)\s*[\d-]+/gi, '').trim();
      }

      // Match patterns like "0.5kg", "0,5kg", "1 kg", "2c", "3c", "1 xù", "1 rế", "2 rế", "0.5"
      const qtyMatch = name.match(/^([\d.,]+)\s*(kg|k|g|gram|khay|hộp|túi|con|c|rế|xù|mẹt)?\s*(.*)$/i);
      if (qtyMatch) {
        qty = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
        const matchedUnit = (qtyMatch[2] || '').toLowerCase();
        let rest = qtyMatch[3] || '';

        if (matchedUnit === 'rế') {
          unit = 'khay';
          name = 'Rế hải sản';
        } else if (matchedUnit === 'xù') {
          unit = 'hộp';
          name = 'Tôm/chả chiên xù';
        } else if (matchedUnit === 'c' || matchedUnit === 'con') {
          unit = 'con';
          name = rest;
        } else if (matchedUnit === 'khay') {
          unit = 'khay';
          name = rest;
        } else if (matchedUnit === 'hộp') {
          unit = 'hộp';
          name = rest;
        } else if (matchedUnit === 'g' || matchedUnit === 'gram') {
          unit = 'gram';
          name = rest;
        } else {
          unit = 'kg';
          name = rest || name;
        }
      }

      // Specialized shorthands
      const lowerName = name.toLowerCase().trim();
      if (lowerName === 'xù' || lowerName === '1 xù') {
        name = 'Tôm/chả chiên xù';
        unit = 'hộp';
      } else if (lowerName === 'rế' || lowerName === '1 rế' || lowerName === '2 rế') {
        name = 'Rế hải sản';
        unit = 'khay';
      } else if (lowerName.includes('mực nhỏ') || lowerName.includes('mứch nh') || lowerName.includes('mực nh')) {
        name = 'Mực nhỏ tươi';
        unit = 'kg';
      } else if (lowerName.includes('tôm he') || lowerName.startsWith('he ')) {
        name = 'Tôm he biển tươi';
        unit = 'kg';
      } else if (lowerName.includes('mực trứng')) {
        name = 'Mực trứng tươi';
        unit = 'kg';
      } else if (lowerName.includes('mực ống')) {
        name = 'Mực ống tươi';
        unit = 'kg';
      } else if (lowerName.includes('chả cá pha mực')) {
        name = 'Chả cá pha mực';
        unit = 'kg';
      } else if (lowerName.includes('nõn bề bề')) {
        name = 'Nõn bề bề bóc sẵn';
        unit = 'kg';
      } else if (lowerName.includes('ruột dắt') || lowerName.includes('dắt')) {
        name = 'Ruột dắt biển tươi';
        unit = 'kg';
      } else if (lowerName.includes('cá thu 1 nắng') || lowerName.includes('thu 1 nắng')) {
        name = 'Cá thu một nắng';
        unit = 'kg';
      } else if (lowerName.includes('cá mối')) {
        name = 'Cá mối tươi';
        unit = 'kg';
      } else if (lowerName.includes('cá nục')) {
        name = 'Cá nục tươi';
        unit = 'kg';
      } else if (lowerName.includes('ghẹ sữa')) {
        name = 'Ghẹ sữa';
        unit = unit === 'con' ? 'con' : 'kg';
      } else if (lowerName.includes('ghẹ lưới')) {
        name = 'Ghẹ lưới tươi';
        unit = unit === 'con' ? 'con' : 'kg';
      } else if (lowerName.includes('ốc biển') || lowerName === 'ốc') {
        name = 'Ốc biển tươi';
        unit = 'kg';
      }

      name = name.trim();
      if (!name) name = 'Hải sản tươi';
      name = name.charAt(0).toUpperCase() + name.slice(1);

      items.push({
        product_name: name,
        quantity: qty,
        unit: unit,
        size: size || undefined,
        estimated_price: estimatedPrice,
        processing_note: procNote || undefined,
        item_note: rawItem,
      });
    }

    if (items.length > 0) {
      orders.push({
        customer_name: customerName,
        building: building,
        room: room,
        phone: '',
        order_note: statusNote || undefined,
        items: items,
      });
    }
  }

  return {
    batch_name: batchName,
    note: 'Được trích xuất tự động từ danh sách ghi chú',
    orders: orders,
  };
}

// Robust Gemini caller with multi-model fallback and backoff retry for 503 / 429
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  requestConfig: {
    contents: any[];
    config: {
      systemInstruction: string;
      responseMimeType?: string;
    };
  }
) {
  // Ordered by reliability, throughput and multimodal capability (Valid SDK models)
  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[AI Extractor] Trying model: ${model} (attempt ${attempt + 1})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: requestConfig.contents,
          config: requestConfig.config,
        });

        if (response && response.text) {
          console.log(`[AI Extractor] Successfully generated with model: ${model}`);
          return { responseText: response.text, usedModel: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[AI Extractor] ${model} attempt ${attempt + 1} failed:`, errMsg);

        const isTemporary =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('fetch failed');

        if (!isTemporary) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
      }
    }
  }

  throw lastError || new Error('Hệ thống AI hiện đang có lượng truy cập cao. Vui lòng bấm thử lại.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Smart Seafood Batch & Orders AI Extractor
  app.post('/api/ai/parse-orders', async (req, res) => {
    try {
      const { imageBase64, imageMimeType, rawText, existingProducts, condoName } = req.body;

      if (!imageBase64 && !rawText) {
        return res.status(400).json({ error: 'Vui lòng cung cấp hình ảnh hoặc nội dung ghi chú đơn hàng' });
      }

      // If no Gemini API key, use rule-based parser for text
      if (!process.env.GEMINI_API_KEY) {
        if (rawText) {
          const parsed = ruleBasedTextParser(rawText);
          return res.json({
            success: true,
            source: 'rule_based',
            data: parsed,
            warning: 'GEMINI_API_KEY chưa được cấu hình. Đang sử dụng bộ phân tích thông minh cục bộ.',
          });
        } else {
          return res.status(400).json({
            error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống để quét phân tích hình ảnh AI. Vui lòng dán văn bản hoặc thêm GEMINI_API_KEY trong Cài Đặt.',
          });
        }
      }

      const ai = getGemini();

      const systemPrompt = `Bạn là chuyên gia kế toán & quản lý gom đơn hải sản quê phục vụ cư dân chung cư tại Việt Nam (${condoName || 'Chung cư Geleximco 897 Giải Phóng'}).
Nhiệm vụ của bạn là đọc và phân tích ảnh chụp màn hình ghi chú (như ứng dụng Apple Notes trên iPhone, tin nhắn Zalo, sổ tay viết tay gom đơn hải sản) hoặc văn bản ghi chú thô, sau đó trích xuất thành danh sách đợt gom hàng và đơn hàng chi tiết từng căn hộ.

ĐẶC BIỆT CHÚ Ý ĐỊNH DẠNG GHI CHÚ NOTES IPHONE:
Ghi chú thường có tiêu đề ngày tháng (ví dụ: "Hải sản 16/08", "Đợt cá mực 25/8") và các dòng gạch đầu dòng theo mẫu:
- [Số phòng]: [Số lượng][Tên món] [Size nếu có] [Giá tiền] [Ghi chú nếu có]
Ví dụ thực tế:
- "- 2303A: 2kg mực nhỏ 280K chưa giao" -> Căn: 2303A, Tòa: Tòa A, Món: "Mực nhỏ tươi", Số lượng: 2, Đơn vị: "kg", Giá ước tính: 140000đ/kg (hoặc tổng 280000đ), Ghi chú món: "Chưa giao"
- "- 1403A: 1kg tôm he 14-16c 390K + 1kg cá mối 160K + 1kg mực trứng 15/17c 330K, = 880K" -> Căn 1403A có 3 món (Tôm he size 14-16 con/kg giá 390000đ, Cá mối 160000đ, Mực trứng size 15-17 con/kg giá 330000đ)
- "- 1106A: 1 xù 1 rế 210K + 1kg chả cá pha mực 250K, = 460K" -> 1 khay tôm/chả xù, 1 khay rế hải sản (tổng 210000đ) + 1kg chả cá pha mực (250000đ)
- "- 1610B: 2c ghẹ sữa 55K + 3c ghẹ lưới 120K+ 1kg ốc biển 200K + 0.5kg tôm he 11-12c 230K, = 605K" -> Căn 1610B (Tòa B): 2 con ghẹ sữa (55000đ), 3 con ghẹ lưới (120000đ), 1kg ốc biển (200000đ), 0.5kg tôm he size 11-12 con/kg (230000đ)
- "- 1808B: 1kg mứch nh 145K" -> Căn 1808B: 1kg mực nhỏ tươi 145000đ
- "- 12A06B: 1kg mực nhỏ 145K + 0.5kg nõn bề bề 185K, = 330Kdonr" -> Căn 12A06B (Tòa B): 1kg mực nhỏ (145000đ), 0.5kg nõn bề bề (185000đ), Ghi chú: "Đã hoàn thành"
- "- 1803B: 0.5kg mực ống 10-12c 145K dine" -> Căn 1803B: 0.5kg mực ống size 10-12 con/kg (145000đ), Ghi chú: "Đã hoàn thành"
- "- 1110A: 0.5kg ruột dắt 130K done" -> Căn 1110A: 0.5kg ruột dắt biển (130000đ)
- "- 1203A: 1 xù 110K done" -> Căn 1203A: 1 hộp tôm/chả chiên xù (110000đ)
- "- 1401A: 2 rế 210K + 1kg cá thu 1 nắng 310K + 1kg he 10-12c 460K= 980K, e lấy" -> Căn 1401A: 2 khay rế (210000đ), 1kg cá thu 1 nắng (310000đ), 1kg tôm he size 10-12c (460000đ), Ghi chú: "Khách tự lấy"

QUY TẮC PHÂN TÍCH TÊN CĂN HỘ & TÒA NHÀ:
- Nếu thấy số phòng kèm ký tự chữ cái (ví dụ: "2303A", "1211A", "1403A", "1106A", "1610B", "1002B", "1808B", "1805A", "2206B", "12A06B", "1803B", "0707A", "1110A", "1203A", "1401A"):
  + room: GIỮ NGUYÊN ĐẦY ĐỦ CẢ SỐ VÀ CHỮ CÁI (ví dụ: "2303A", "12A06B", "1610B").
  + building: Nếu đuôi "A" -> "Tòa A", nếu đuôi "B" -> "Tòa B", nếu đuôi "C" -> "Tòa C".
  + customer_name: "Căn " + room (ví dụ: "Căn 2303A", "Căn 12A06B").
- Nếu là tên người (ví dụ: "Chị Hằng", "C Phô Mai"):
  + customer_name: Tên khách hàng
  + room: Số phòng nếu có hoặc "Khách quen"
  + building: "Tòa A" (mặc định)

QUY TẮC GIÁ & ĐƠN VỊ:
- "K" = nghìn đồng (ví dụ: 280K = 280.000đ, 145K = 145.000đ, 55K = 55.000đ).
- "c" = con (ví dụ: "2c ghẹ sữa" = 2 con, "14-16c" = Size 14-16 con/kg).
- "xù" = Tôm/chả chiên xù (Đơn vị: 'hộp').
- "rế" = Rế hải sản (Đơn vị: 'khay').
- "done", "donr", "dine" = Đã xử lý xong.
- "chưa giao" = Chưa giao hàng.

Hãy trả về định dạng JSON thuần túy (không bọc trong văn bản phụ):
{
  "batch_name": "Đợt Hải Sản 16/08",
  "note": "Ghi chú nếu có",
  "raw_extracted_text": "Toàn bộ văn bản bóc tách nguyên văn từ ảnh để người dùng có thể xem lại...",
  "orders": [
    {
      "customer_name": "Căn 2303A",
      "building": "Tòa A",
      "room": "2303A",
      "phone": "",
      "order_note": "Chưa giao",
      "items": [
        {
          "product_name": "Mực nhỏ tươi",
          "quantity": 2,
          "unit": "kg",
          "size": "",
          "estimated_price": 140000,
          "processing_note": "",
          "item_note": "2kg mực nhỏ 280K chưa giao"
        }
      ]
    }
  ]
}`;

      const contents: any[] = [];

      if (imageBase64) {
        // Strip data:image/...;base64, properly regardless of format
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/i, '').trim();
        let mime = (imageMimeType || 'image/jpeg').toLowerCase();
        if (mime.includes('png')) mime = 'image/png';
        else if (mime.includes('webp')) mime = 'image/webp';
        else if (mime.includes('heic') || mime.includes('heif')) mime = 'image/heic';
        else mime = 'image/jpeg';

        contents.push({
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        });
      }

      let userTextPrompt = rawText
        ? `Nội dung ghi chú cần phân tích:\n${rawText}`
        : 'Hãy đọc toàn bộ hình ảnh ghi chú danh sách đơn hàng gom hải sản này, bóc tách từng dòng căn hộ, nhận diện tên sản phẩm, số lượng, size, giá tiền K và quy cách.';

      if (existingProducts && Array.isArray(existingProducts) && existingProducts.length > 0) {
        userTextPrompt += `\n\nDanh mục sản phẩm tham khảo:\n` +
          existingProducts.slice(0, 30).map((p: any) => `- ${p.product_name} (${p.unit}): ~${p.default_price?.toLocaleString('vi-VN')}đ`).join('\n');
      }

      contents.push(userTextPrompt);

      const { responseText, usedModel } = await callGeminiWithFallback(ai, {
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      let parsedData: any = null;
      try {
        // Direct parse
        parsedData = JSON.parse(responseText);
      } catch (err) {
        // Strip markdown codeblocks like ```json ... ```
        const cleanJsonStr = responseText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*$/gi, '')
          .trim();

        try {
          parsedData = JSON.parse(cleanJsonStr);
        } catch (err2) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsedData = JSON.parse(jsonMatch[0]);
            } catch (err3) {
              console.warn('[AI Extractor] Failed regex JSON parse:', err3);
            }
          }
        }
      }

      if (!parsedData || !Array.isArray(parsedData.orders)) {
        if (parsedData && parsedData.raw_extracted_text) {
          parsedData = ruleBasedTextParser(parsedData.raw_extracted_text);
        } else if (rawText) {
          parsedData = ruleBasedTextParser(rawText);
        } else {
          throw new Error('AI đã phân tích nhưng không trích xuất được định dạng đơn hàng. Vui lòng bấm thử lại hoặc dán văn bản.');
        }
      }

      return res.json({
        success: true,
        source: 'gemini_ai',
        model: usedModel,
        data: parsedData,
      });
    } catch (error: any) {
      console.error('Lỗi khi phân tích bằng Gemini AI:', error);

      // If user provided text as well, fallback to smart rule-based parser
      if (req.body?.rawText) {
        const fallback = ruleBasedTextParser(req.body.rawText);
        return res.json({
          success: true,
          source: 'rule_based_fallback',
          data: fallback,
          warning: 'Mô hình AI đang bận. Hệ thống đã tự động chuyển sang bộ bóc tách thông minh cục bộ.',
        });
      }

      const errMsg = error?.message || 'Đã xảy ra lỗi khi quét và xử lý ảnh đơn hàng.';
      const is503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

      const userFriendlyMsg = is503
        ? 'Hệ thống AI Gemini hiện đang có lượng truy cập tăng đột biến. Vui lòng bấm nút "🔄 Thử lại" bên dưới hoặc chuyển sang tab "Nhập Ghi Chú Văn Bản".'
        : errMsg;

      return res.status(is503 ? 503 : 500).json({
        error: userFriendlyMsg,
        isTemporary: is503,
      });
    }
  });

  // API Route: Telegram Gateway Batch Receiver
  // Transport: Telegram -> Google Apps Script -> POST /api/telegram/batch
  app.post('/api/telegram/batch', async (req, res) => {
    try {
      // 1. Authentication Check via X-Telegram-Gateway-Key
      const gatewayKeyHeader = req.header('X-Telegram-Gateway-Key') || req.header('x-telegram-gateway-key');
      const expectedKey = process.env.TELEGRAM_GATEWAY_KEY;

      if (expectedKey) {
        if (!gatewayKeyHeader || gatewayKeyHeader !== expectedKey) {
          console.warn('[Telegram Gateway] Unauthorized request: Key mismatch or missing');
          return res.status(401).json({
            success: false,
            status: 'failed',
            message: 'Unauthorized: Header X-Telegram-Gateway-Key không hợp lệ hoặc thiếu.',
          });
        }
      } else {
        console.warn('[Telegram Gateway] TELEGRAM_GATEWAY_KEY is not configured in server env. Proceeding with warning.');
      }

      // 2. Validate Payload
      const { session_id, batch_id, order_date, items, condoName, existingProducts } = req.body;

      if (!session_id || !batch_id) {
        return res.status(400).json({
          success: false,
          session_id: session_id || '',
          batch_id: batch_id || '',
          status: 'failed',
          message: 'Thiếu trường bắt buộc session_id hoặc batch_id trong payload.',
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          session_id,
          batch_id,
          status: 'failed',
          message: 'Batch không có dữ liệu items hoặc items rỗng.',
        });
      }

      // 3. Persistent Idempotency Check
      const idempotencyStore = loadIdempotencyStore();
      if (idempotencyStore[batch_id]) {
        const existingRecord = idempotencyStore[batch_id];
        console.log(`[Telegram Gateway] Idempotent hit: Batch ${batch_id} already processed at ${existingRecord.processed_at}`);
        return res.status(200).json({
          success: true,
          session_id: existingRecord.session_id || session_id,
          batch_id: batch_id,
          status: 'already_processed',
          message: `Batch ${batch_id} đã được tiếp nhận và xử lý thành công trước đó (Idempotent replay).`,
          data: existingRecord.data,
        });
      }

      // 4. Assemble RAW items into Multimodal Gemini pipeline (Preserving 100% order and content)
      const contents: any[] = [];
      const textParts: string[] = [];
      let imageCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === 'text' && typeof item.content === 'string') {
          textParts.push(item.content);
        } else if (item.type === 'image') {
          // Direct base64 image from Apps Script
          const rawBase64 = item.image_base64 || item.base64 || item.data || '';
          const mimeType = item.mime_type || item.imageMimeType || 'image/jpeg';

          if (rawBase64) {
            const cleanBase64 = rawBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
            contents.push({
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64,
              },
            });
            imageCount++;
          }

          if (item.caption && typeof item.caption === 'string' && item.caption.trim()) {
            textParts.push(`[Ghi chú kèm ảnh #${imageCount}]: ${item.caption}`);
          }
        }
      }

      const combinedRawText = textParts.join('\n\n');

      if (contents.length === 0 && !combinedRawText.trim()) {
        return res.status(400).json({
          success: false,
          session_id,
          batch_id,
          status: 'failed',
          message: 'Không tìm thấy nội dung văn bản hoặc hình ảnh hợp lệ trong batch.',
        });
      }

      // 5. Build Prompt for Gemini using Existing Pipeline Prompt
      const systemPrompt = `Bạn là chuyên gia kế toán & quản lý gom đơn hải sản quê phục vụ cư dân chung cư tại Việt Nam (${condoName || 'Chung cư Geleximco 897 Giải Phóng'}).
Nhiệm vụ của bạn là đọc và phân tích ảnh ghi chú (như ảnh chụp ứng dụng Notes, tin nhắn Zalo, sổ tay viết tay gom đơn hải sản) hoặc văn bản ghi chú thô nhận từ Telegram, sau đó trích xuất thành danh sách đợt gom hàng và đơn hàng chi tiết từng căn hộ.

QUY TẮC PHÂN TÍCH TÊN CĂN HỘ & TÒA NHÀ:
- Nếu thấy số phòng kèm ký tự chữ cái (ví dụ: "1903A", "1203A", "1606A", "1501A", "2303A", "1707B", "p1707B", "1006B", "904B", "0806B", "2206B"):
  + room: GIỮ NGUYÊN ĐẦY ĐỦ CẢ SỐ PHÒNG VÀ CHỮ CÁI HẬU TỐ (ví dụ: "1903A", "1707B", "1006B", "904B", "1203A"). Tuyệt đối không cắt bỏ chữ cái A, B, C, D ở cuối phòng.
  + building: "Tòa A" (nếu đuôi A) hoặc "Tòa B" (nếu đuôi B)
  + customer_name: "Căn 1903A" hoặc "Căn 1707B"
- Nếu là tên khách quen (ví dụ: "C Phô Mai", "Chị Lan 1205", "Anh Tuấn"):
  + customer_name: "Chị Phô Mai"
  + room: "1205" hoặc "Khách quen" nếu không có số phòng
  + building: "Tòa A" (mặc định)

QUY TẮC ĐẶC TRƯNG HẢI SẢN & TỪ LÓNG CHỢ HẢI SẢN VIỆT NAM:
- "rế" hoặc "1 rế", "5 rế": Rế hải sản / Mẹt ram rế / Rế mực / Rế tôm (Đơn vị: 'khay' hoặc 'hộp', giá ước tính ~100.000đ - 140.000đ/khay).
- "xù" hoặc "1 xù": Tôm/Chả bao xù / Tôm chiên xù (Đơn vị: 'hộp' hoặc 'khay', giá ước tính ~120.000đ/hộp).
- "cá bơn": Cá bơn tươi (kg)
- "mực trứng đổi mực nhỏ": Tên: "Mực trứng", processing_note: "Đổi mực nhỏ"
- "cá bạc má": Cá bạc má tươi (kg)
- "chả mực loại 1": Chả mực Hạ Long Loại 1 (kg)
- "chả cá thu cá nhồng": Chả cá thu cá nhồng (kg)
- "nõn sắt nhỏ nấu canh" / "nõn sắt": Nõn tôm sắt tươi bóc sẵn (kg), processing_note: "Nấu canh"
- "mực sz 20-22": Mực ống tươi, size: "Size 20-22 con/kg"
- "tôm he sz 30-32": Tôm he biển tươi, size: "Size 30-32 con/kg"
- "tôm he vẫn size 14-16": Tôm he biển tươi, size: "Size 14-16 con/kg"
- "cá thu 1 nắng": Cá thu một nắng (kg)
- "khay nõn bộp": Nõn tôm bộp tươi (Đơn vị: 'khay', số lượng 1)
- "tuộc sữa": Bạch tuộc sữa tươi (kg)
- "chả cá": Chả cá biển (kg)
- "cá mối": Cá mối tươi (kg)
- "cá hố": Cá hố tươi (kg)

Ước tính giá hợp lý theo thị trường hải sản Việt Nam nếu không có giá trong ghi chú (hoặc khớp với danh mục sản phẩm hiện có nếu khớp tên).
Đơn vị (unit) chuẩn: 'kg' | 'gram' | 'con' | 'hộp' | 'túi' | 'khay' | 'combo'.

Hãy trả về JSON theo đúng định dạng sau:
{
  "batch_name": "Tên đợt gom hàng (ví dụ: Đợt Gom Hải Sản ${order_date || 'Mới'})",
  "note": "Ghi chú chung của đợt nếu có",
  "orders": [
    {
      "customer_name": "Căn 1903A",
      "building": "Tòa A",
      "room": "1903A",
      "phone": "",
      "items": [
        {
          "product_name": "Cá bơn tươi",
          "quantity": 0.5,
          "unit": "kg",
          "size": "",
          "estimated_price": 280000,
          "processing_note": "",
          "item_note": "0.5kg cá bơn"
        },
        {
          "product_name": "Rế hải sản",
          "quantity": 1,
          "unit": "khay",
          "size": "",
          "estimated_price": 120000,
          "processing_note": "",
          "item_note": "1 rế"
        }
      ]
    }
  ]
}`;

      let userTextPrompt = combinedRawText
        ? `Nội dung ghi chú Telegram cần phân tích:\n${combinedRawText}`
        : 'Hãy phân tích các hình ảnh và ghi chú gom đơn hải sản từ Telegram này và trích xuất thông tin đợt hàng, danh sách từng phòng cư dân và chi tiết các món hải sản.';

      if (order_date) {
        userTextPrompt += `\nNgày gom đơn mục tiêu: ${order_date}`;
      }

      if (existingProducts && Array.isArray(existingProducts) && existingProducts.length > 0) {
        userTextPrompt += `\n\nDanh mục sản phẩm hiện có của cửa hàng (ưu tiên khớp tên và giá):\n` +
          existingProducts.map((p: any) => `- ${p.product_name} (${p.unit}): ~${p.default_price?.toLocaleString('vi-VN')}đ`).join('\n');
      }

      contents.push(userTextPrompt);

      let parsedData: any = null;
      let usedEngine = 'gemini_ai';

      // If Gemini API Key is available, run through existing Gemini Pipeline
      if (process.env.GEMINI_API_KEY) {
        const ai = getGemini();
        const { responseText, usedModel } = await callGeminiWithFallback(ai, {
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        try {
          parsedData = JSON.parse(responseText);
        } catch (err) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Không thể phân tích định dạng JSON từ phản hồi AI: ' + responseText.slice(0, 100));
          }
        }
        usedEngine = usedModel;
      } else {
        // Fallback to Rule-based Parser for text-only items if GEMINI_API_KEY is not yet configured
        if (combinedRawText) {
          parsedData = ruleBasedTextParser(combinedRawText);
          usedEngine = 'rule_based_fallback';
        } else {
          return res.status(500).json({
            success: false,
            session_id,
            batch_id,
            status: 'failed',
            message: 'Chưa cấu hình GEMINI_API_KEY trên server để xử lý hình ảnh từ Telegram.',
          });
        }
      }

      // 6. Save Persistent Idempotency Record
      const recordToSave: IdempotencyRecord = {
        session_id,
        batch_id,
        processed_at: new Date().toISOString(),
        status: 'processed',
        data: parsedData,
      };
      saveIdempotencyRecord(recordToSave);

      console.log(`[Telegram Gateway] Successfully processed Batch ${batch_id} (${parsedData?.orders?.length || 0} orders). Engine: ${usedEngine}`);

      // 7. Return Standard Response
      return res.status(200).json({
        success: true,
        session_id,
        batch_id,
        status: 'processed',
        message: `Batch ${batch_id} đã được xử lý thành công (${parsedData?.orders?.length || 0} đơn hàng).`,
        data: parsedData,
        engine: usedEngine,
      });
    } catch (error: any) {
      console.error('[Telegram Gateway] Lỗi xử lý batch:', error);
      return res.status(500).json({
        success: false,
        session_id: req.body?.session_id || '',
        batch_id: req.body?.batch_id || '',
        status: 'failed',
        message: error?.message || 'Đã xảy ra lỗi nội bộ máy chủ khi phân tích batch từ Telegram.',
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hải Sản Mẹ Hường app running on http://localhost:${PORT}`);
  });
}

startServer();
