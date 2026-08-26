/**
 * Print helper utility for seamless printing on macOS and Windows
 * Uses isolated iframe printing to avoid printing background UI or modal overlays
 */

export const printElement = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Remove existing print iframe if any
  const oldIframe = document.getElementById('seafood-print-iframe');
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'seafood-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  // Collect all styles and stylesheet links from parent document
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>In Phiếu Đơn Hàng Hải Sản A4</title>
      ${stylesHtml}
      <style>
        @page {
          size: A4 portrait;
          margin: 4mm;
        }
        body {
          background-color: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          box-sizing: border-box !important;
        }
        .no-print {
          display: none !important;
        }
      </style>
    </head>
    <body class="bg-white text-slate-900 font-sans p-0 m-0">
      <div id="print-root">
        ${element.outerHTML}
      </div>
    </body>
    </html>
  `);
  doc.close();

  // Give fonts and QR images a brief moment to render, then trigger print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print():', e);
      window.print();
    }
  }, 400);
};

export const openPrintTab = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) return;

  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>In Phiếu Đơn Hàng Hải Sản A4</title>
      ${stylesHtml}
      <style>
        @page {
          size: A4 portrait;
          margin: 4mm;
        }
        body {
          background-color: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          box-sizing: border-box !important;
        }
        @media screen {
          body {
            background-color: #f1f5f9 !important;
            padding: 20px;
          }
          #print-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            padding: 10px;
            border-radius: 8px;
          }
          .screen-actions {
            max-width: 210mm;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #0f766e;
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-family: system-ui, sans-serif;
          }
          .screen-actions button {
            background: white;
            color: #0f766e;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
          }
        }
      </style>
    </head>
    <body class="bg-white text-slate-900 font-sans">
      <div class="screen-actions no-print">
        <div>
          <strong>Phiếu in Hải Sản Chuẩn Khổ A4 (6 đơn/trang)</strong>
          <div style="font-size: 12px; opacity: 0.9;">Bấm nút in bên cạnh hoặc phím Command+P / Ctrl+P</div>
        </div>
        <button onclick="window.print()">🖨️ In Trang Này (Cmd + P)</button>
      </div>
      <div id="print-container">
        ${element.outerHTML}
      </div>
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
