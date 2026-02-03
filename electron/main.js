const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const printer = require('@thiagoelg/node-printer');

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function buildEscPosReceipt(sale) {
  const ESC = 0x1b;
  const GS = 0x1d;

  const buffers = [];

  const setAlign = (n) => Buffer.from([ESC, 0x61, n]);
  const setTextSize = (w, h) => {
    const n = (w - 1) * 16 + (h - 1);
    return Buffer.from([GS, 0x21, n]);
  };
  const line = (text = '') => Buffer.from(`${text}\n`, 'ascii');
  const feed = (lines) => Buffer.from([ESC, 0x64, lines]);
  const cut = () => Buffer.from([GS, 0x56, 0x00]);

  const padRight = (text, width) => {
    if (!text) text = '';
    return text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);
  };

  const padLeft = (text, width) => {
    if (!text) text = '';
    return text.length >= width ? text.slice(0, width) : ' '.repeat(width - text.length) + text;
  };

  const formatMoney = (value) => `GHS ${Number(value || 0).toFixed(2)}`;

  const formatPaymentMethod = (method) => {
    if (!method) return '';
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'mobile_money':
        return 'Mobile Money';
      case 'credit':
        return 'Credit';
      default:
        return String(method);
    }
  };

  buffers.push(Buffer.from([ESC, 0x40]));

  buffers.push(setAlign(1));
  buffers.push(setTextSize(2, 2));
  buffers.push(line('Sika Ventures'));
  buffers.push(setTextSize(1, 1));
  buffers.push(line('Texpo Market, Spintex'));
  buffers.push(line('Phone: 0554492626'));
  buffers.push(line());

  buffers.push(setAlign(0));

  const divider = line('------------------------------------------------');

  buffers.push(divider);
  if (sale && sale.receiptNumber) {
    buffers.push(line(`Rcpt: ${sale.receiptNumber}`));
  }
  if (sale && (sale.date || sale.time)) {
    const datePart = sale.date || '';
    const timePart = sale.time || '';
    buffers.push(line(`Date: ${datePart}  ${timePart}`.trim()));
  }
  if (sale && sale.paymentMethod) {
    buffers.push(line(`Payment: ${formatPaymentMethod(sale.paymentMethod)}`));
  }
  buffers.push(divider);

  const nameWidth = 24;
  const qtyWidth = 4;
  const priceWidth = 10;
  const totalWidth = 10;

  const header =
    padRight('Item', nameWidth) +
    padLeft('Qty', qtyWidth) +
    padLeft('Price', priceWidth) +
    padLeft('Total', totalWidth);
  buffers.push(line(header));
  buffers.push(divider);

  if (sale && Array.isArray(sale.items)) {
    sale.items.forEach((item) => {
      const name = padRight(String(item.name || ''), nameWidth);
      const qty = padLeft(String(item.quantity || 0), qtyWidth);
      const price = padLeft(formatMoney(item.price || 0), priceWidth);
      const total = padLeft(formatMoney((item.price || 0) * (item.quantity || 0)), totalWidth);
      buffers.push(line(name + qty + price + total));
    });
  }

  buffers.push(divider);

  if (sale) {
    buffers.push(line(padRight('Subtotal:', 24) + padLeft(formatMoney(sale.subtotal || 0), 24)));
    if (sale.discount && sale.discount > 0) {
      buffers.push(line(padRight('Discount:', 24) + padLeft(formatMoney(sale.discount), 24)));
    }
    buffers.push(line(padRight('TOTAL:', 24) + padLeft(formatMoney(sale.totalAmount || 0), 24)));
  }

  buffers.push(line());
  buffers.push(line());

  buffers.push(setAlign(1));
  buffers.push(line('Thank you for your purchase!'));
  buffers.push(line('Please come again'));
  buffers.push(setAlign(0));

  buffers.push(feed(5));
  buffers.push(cut());

  return Buffer.concat(buffers);
}

// IPC hook for printing the current receipt view.
// This will silently print the current window contents to the
// default Windows printer (set this to your Epson TM-T20II/III).
ipcMain.handle('print-receipt', async (_event, sale) => {
  const data = buildEscPosReceipt(sale);

  return new Promise((resolve) => {
    try {
      const defaultPrinter =
        typeof printer.getDefaultPrinterName === 'function'
          ? printer.getDefaultPrinterName()
          : undefined;

      printer.printDirect({
        data,
        type: 'RAW',
        printer: defaultPrinter,
        success: () => {
          resolve(true);
        },
        error: (err) => {
          console.error('Print failed:', err);
          resolve(false);
        },
      });
    } catch (err) {
      console.error('Print error:', err);
      resolve(false);
    }
  });
});
