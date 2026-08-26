import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Fallback rule-based parser for offline / direct text notes
function ruleBasedTextParser(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let batchName = 'Đợt Gom Hải Sản Mới';
  const orders: any[] = [];

  for (const line of lines) {
    if (line.toLowerCase().includes('hsan') || line.toLowerCase().includes('hải sản') || line.toLowerCase().includes('đợt')) {
      batchName = line.replace(/[:\-]/g, '').trim();
      if (!batchName.toLowerCase().startsWith('hải sản') && !batchName.toLowerCase().startsWith('đợt')) {
        batchName = 'Đợt ' + batchName;
      }
      continue;
    }

    // Match lines like "1903A: 0.5kg cá bơn + 1 rế" or "C Phô Mai: 1kg tuộc sữa + 1kg chả cá"
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const left = line.substring(0, colonIdx).trim();
    const right = line.substring(colonIdx + 1).trim();

    let building = 'Tòa A';
    let room = '';
    let customerName = left;

    // Check room pattern like 1903A, 1006B, 904B, 0806B, p1707B, P.1707B, 1707 B
    const roomMatch = left.match(/^p?\.?\s*(\d{3,4})\s*([A-Za-z]?)$/i);
    if (roomMatch) {
      const numPart = roomMatch[1];
      const tower = roomMatch[2] ? roomMatch[2].toUpperCase() : '';
      room = `${numPart}${tower}`;
      building = tower ? `Tòa ${tower}` : 'Tòa A';
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

      // Match patterns like "0.5kg", "0,5kg", "1 kg", "1kg", "5 rế", "1 khay", "1 xù"
      const qtyMatch = rawItem.match(/^([\d.,]+)\s*(kg|k|g|gram|khay|hộp|túi|con|rế|xù|mẹt)?\s*(.*)$/i);
      if (qtyMatch) {
        qty = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
        const matchedUnit = (qtyMatch[2] || '').toLowerCase();
        let rest = qtyMatch[3] || '';

        if (matchedUnit === 'rế') {
          unit = 'khay';
          name = 'Rế hải sản (mẹt/khay)';
        } else if (matchedUnit === 'xù') {
          unit = 'hộp';
          name = 'Tôm/chả chiên xù';
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
          name = rest || rawItem;
        }
      }

      if (rawItem.toLowerCase() === '1 rế' || rawItem.toLowerCase() === 'rế') {
        name = 'Rế hải sản';
        unit = 'khay';
        qty = 1;
      }
      if (rawItem.toLowerCase() === '1 xù' || rawItem.toLowerCase() === 'xù') {
        name = 'Tôm/Chả chiên xù';
        unit = 'hộp';
        qty = 1;
      }

      // Check size
      const szMatch = name.match(/s(?:ize|z)\s*([\d-]+)/i);
      if (szMatch) {
        size = `Size ${szMatch[1]}`;
      }

      // Clean processing notes
      if (name.toLowerCase().includes('nấu canh')) {
        procNote = 'Nấu canh';
      } else if (name.toLowerCase().includes('đổi mực nhỏ')) {
        procNote = 'Đổi mực nhỏ';
      }

      // Clean product name
      name = name
        .replace(/s(?:ize|z)\s*[\d-]+/gi, '')
        .replace(/nhé\s*ạ/gi, '')
        .replace(/loại\s*1/gi, 'Loại 1')
        .replace(/vẫn\s*size/gi, '')
        .trim();

      if (!name) name = 'Hải sản tươi';

      // Capitalize first letter
      name = name.charAt(0).toUpperCase() + name.slice(1);

      items.push({
        product_name: name,
        quantity: qty,
        unit: unit,
        size: size || undefined,
        estimated_price: unit === 'khay' || unit === 'hộp' ? 120000 : 220000,
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
        items: items,
      });
    }
  }

  return {
    batch_name: batchName,
    note: 'Được trích xuất tự động từ văn bản ghi chú',
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
  // Ordered by reliability and high-throughput multimodal capability
  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.1-pro-preview',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    // Retry up to 2 times for each model if 503 or 429 occurs
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
          // If it's a non-temporary error (e.g. bad request or invalid schema), try next model directly
          break;
        }

        // Wait brief delay before retrying this model or moving to next
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
Nhiệm vụ của bạn là đọc và phân tích ảnh ghi chú (như ảnh chụp ứng dụng Notes, tin nhắn Zalo, sổ tay viết tay gom đơn hải sản) hoặc văn bản ghi chú thô, sau đó trích xuất thành danh sách đợt gom hàng và đơn hàng chi tiết từng căn hộ.

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
  "batch_name": "Tên đợt gom hàng (ví dụ: Đợt Hải Sản Trước Lễ 25/08)",
  "note": "Ghi chú chung của đợt nếu có",
  "orders": [
    {
      "customer_name": "Căn 1903A",
      "building": "Tòa A",
      "room": "1903",
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

      const contents: any[] = [];

      if (imageBase64) {
        // Strip data:image/...;base64, if present
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        const mimeType = imageMimeType || 'image/jpeg';
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        });
      }

      let userTextPrompt = rawText
        ? `Nội dung ghi chú cần phân tích:\n${rawText}`
        : 'Hãy phân tích hình ảnh ghi chú danh sách gom đơn hải sản này và trích xuất thông tin đợt hàng, danh sách từng phòng cư dân và chi tiết các món hải sản.';

      if (existingProducts && Array.isArray(existingProducts) && existingProducts.length > 0) {
        userTextPrompt += `\n\nDanh mục sản phẩm hiện có của cửa hàng (ưu tiên khớp tên và giá):\n` +
          existingProducts.map((p: any) => `- ${p.product_name} (${p.unit}): ~${p.default_price?.toLocaleString('vi-VN')}đ`).join('\n');
      }

      contents.push(userTextPrompt);

      const { responseText, usedModel } = await callGeminiWithFallback(ai, {
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      let parsedData;
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
          warning: 'Mô hình AI đang có lượng truy cập cao. Hệ thống đã tự động chuyển sang bộ bóc tách thông minh cục bộ.',
        });
      }

      const errMsg = error?.message || 'Đã xảy ra lỗi khi quét và xử lý ảnh đơn hàng.';
      const is503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

      const userFriendlyMsg = is503
        ? 'Hệ thống AI Gemini hiện đang có lượng truy cập tăng đột biến (503 High Demand). Vui lòng bấm nút "🔄 Thử lại" bên dưới hoặc chuyển sang tab "Nhập Ghi Chú Văn Bản" để tạo ngay.'
        : errMsg;

      return res.status(is503 ? 503 : 500).json({
        error: userFriendlyMsg,
        isTemporary: is503,
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
