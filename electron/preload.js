const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (sale) => ipcRenderer.invoke('print-receipt', sale),
});
