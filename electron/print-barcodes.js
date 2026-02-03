const { app } = require('electron');
const printer = require('@thiagoelg/node-printer');

function parseArgs(argv) {
  const args = {
    item: 'Item',
    qty: 10,
    barcode: undefined,
    printer: undefined,
    paper: 80,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--item' && argv[i + 1]) {
      args.item = String(argv[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--qty' && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      args.qty = Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
      i += 1;
      continue;
    }
    if (a === '--barcode' && argv[i + 1]) {
      args.barcode = String(argv[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--printer' && argv[i + 1]) {
      args.printer = String(argv[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--paper' && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      args.paper = n === 58 ? 58 : 80;
      i += 1;
      continue;
    }
    if (a === '--help' || a === '-h') {
      args.help = true;
      continue;
    }
  }

  return args;
}

function randomDigits(len) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

function generateBarcodeValue() {
  return randomDigits(12);
}

function escposLine(text = '') {
  return Buffer.from(`${text}\n`, 'ascii');
}

function escposInit() {
  return Buffer.from([0x1b, 0x40]);
}

function escposAlign(n) {
  return Buffer.from([0x1b, 0x61, n]);
}

function escposTextSize(w, h) {
  const n = (w - 1) * 16 + (h - 1);
  return Buffer.from([0x1d, 0x21, n]);
}

function escposFeed(lines) {
  return Buffer.from([0x1b, 0x64, lines]);
}

function escposCut() {
  return Buffer.from([0x1d, 0x56, 0x00]);
}

function escposBarcodeHeight(n) {
  return Buffer.from([0x1d, 0x68, n]);
}

function escposBarcodeWidth(n) {
  return Buffer.from([0x1d, 0x77, n]);
}

function escposBarcodeHriPosition(n) {
  return Buffer.from([0x1d, 0x48, n]);
}

function escposSetAbsolutePosition(dots) {
  const n = Math.max(0, Math.min(65535, Math.floor(dots)));
  const nL = n & 0xff;
  const nH = (n >> 8) & 0xff;
  return Buffer.from([0x1d, 0x24, nL, nH]);
}

function escposLF() {
  return Buffer.from([0x0a]);
}

function escposCode128(data) {
  const payload = Buffer.from(data, 'ascii');
  return Buffer.concat([
    Buffer.from([0x1d, 0x6b, 0x49, payload.length]),
    payload,
  ]);
}

function buildEscPosBarcodeLabels({ item, qty, barcodeValue, paper }) {
  const buffers = [];

  buffers.push(escposInit());
  buffers.push(escposAlign(1));

  buffers.push(escposTextSize(1, 1));
  buffers.push(escposLine(String(item || '')));
  buffers.push(escposFeed(1));

  const paperWidthDots = paper === 58 ? 384 : 576;
  const columns = 3;
  const colWidth = Math.floor(paperWidthDots / columns);
  const colPositions = [0, colWidth, colWidth * 2];

  buffers.push(escposAlign(0));

  buffers.push(escposBarcodeHriPosition(0));
  buffers.push(escposBarcodeHeight(55));
  buffers.push(escposBarcodeWidth(2));

  for (let i = 0; i < qty; i += columns) {
    const values = [];
    for (let c = 0; c < columns; c += 1) {
      const idx = i + c;
      if (idx >= qty) break;
      values.push(barcodeValue || generateBarcodeValue());
    }

    // Barcodes row
    for (let c = 0; c < values.length; c += 1) {
      buffers.push(escposSetAbsolutePosition(colPositions[c]));
      buffers.push(escposCode128(`{B${values[c]}`));
    }
    buffers.push(escposLF());

    // Human-readable values row
    buffers.push(escposTextSize(1, 1));
    for (let c = 0; c < values.length; c += 1) {
      buffers.push(escposSetAbsolutePosition(colPositions[c]));
      buffers.push(Buffer.from(String(values[c]), 'ascii'));
    }
    buffers.push(escposLF());
    buffers.push(escposFeed(1));
  }

  buffers.push(escposFeed(3));
  buffers.push(escposCut());

  return Buffer.concat(buffers);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  npm run print:barcodes -- --item "Milk" --qty 10',
        '  npm run print:barcodes -- --item "Milk" --qty 10 --barcode 123456789012',
        '  npm run print:barcodes -- --item "Milk" --qty 10 --printer "EPSON TM-T20III"',
        '  npm run print:barcodes -- --item "Milk" --qty 10 --paper 58',
        '',
        'Options:',
        '  --item     Item name to print above each barcode (default: "Item")',
        '  --qty      Number of codes to print (default: 10)',
        '  --barcode  Barcode value to print (CODE128). If omitted, random values are generated.',
        '  --printer  Printer name (default: system default printer)',
        '  --paper    Paper width in mm: 58 or 80 (default: 80)',
      ].join('\n') +
        '\n'
    );
    return 0;
  }

  const selectedPrinter =
    args.printer ||
    (typeof printer.getDefaultPrinterName === 'function'
      ? printer.getDefaultPrinterName()
      : undefined);

  const data = buildEscPosBarcodeLabels({
    item: args.item,
    qty: args.qty,
    barcodeValue: args.barcode,
    paper: args.paper,
  });

  const ok = await new Promise((resolve) => {
    try {
      printer.printDirect({
        data,
        type: 'RAW',
        printer: selectedPrinter,
        success: () => resolve(true),
        error: (err) => {
          process.stderr.write(`Print failed: ${String(err)}\n`);
          resolve(false);
        },
      });
    } catch (err) {
      process.stderr.write(`Print error: ${String(err)}\n`);
      resolve(false);
    }
  });

  return ok ? 0 : 1;
}

app
  .whenReady()
  .then(run)
  .then((code) => {
    app.exit(code);
  })
  .catch((err) => {
    process.stderr.write(`Fatal error: ${String(err)}\n`);
    app.exit(1);
  });
