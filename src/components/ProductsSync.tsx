import React from 'react';
import { Cloud, CloudOff, CheckCircle, Clock, Upload, Download, RefreshCw } from 'lucide-react';

interface ProductsSyncProps {
  pendingSales: number;
  isSyncing: boolean;
  lastSync: string | null;
  onSync: () => Promise<void>;
}

export default function ProductsSync({ pendingSales, isSyncing, lastSync, onSync }: ProductsSyncProps) {
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setErrorMessage(null);
    setSyncStatus('syncing');
    try {
      await onSync();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      setSyncStatus('error');
      const message = error instanceof Error ? error.message : 'Sync failed. Please try again.';
      setErrorMessage(message);
    }
  };

  return (
    <div className="h-full bg-gray-50 p-8 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-gray-800 mb-3">Products Sync</h2>
          <p className="text-gray-500">Keep your products synchronized with the cloud</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">Last Sync</span>
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-gray-800">{lastSync || 'Never'}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">Pending Sales</span>
              <Upload className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-orange-600 text-2xl font-semibold">{pendingSales}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">Status</span>
              {syncStatus === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : syncStatus === 'error' ? (
                <CloudOff className="w-6 h-6 text-red-500" />
              ) : (
                <Cloud className="w-6 h-6 text-teal-500" />
              )}
            </div>
            <p className={`capitalize ${
              syncStatus === 'success' ? 'text-green-600' :
              syncStatus === 'error' ? 'text-red-600' :
              syncStatus === 'syncing' ? 'text-blue-600' :
              'text-gray-800'
            }`}>
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'success' ? 'Synced' : 'Ready'}
            </p>
          </div>
        </div>

        {/* Main Sync Card */}
        <div className="bg-white rounded-2xl shadow-xl p-12 border-2 border-gray-100">
          <div className="text-center mb-8">
            <div className={`inline-flex p-8 rounded-full mb-6 transition-all ${
              isSyncing 
                ? 'bg-blue-100 animate-pulse' 
                : syncStatus === 'success'
                ? 'bg-green-100'
                : 'bg-gradient-to-br from-blue-500 to-teal-500'
            }`}>
              {isSyncing ? (
                <RefreshCw className="w-16 h-16 text-blue-500 animate-spin" strokeWidth={2.5} />
              ) : syncStatus === 'success' ? (
                <CheckCircle className="w-16 h-16 text-green-500" strokeWidth={2.5} />
              ) : (
                <Cloud className="w-16 h-16 text-white" strokeWidth={2.5} />
              )}
            </div>
            
            <h3 className="text-gray-800 mb-3">
              {isSyncing ? 'Syncing Products...' : 'Sync Your Products'}
            </h3>
            <p className="text-gray-500 mb-8">
              {isSyncing 
                ? 'Please wait while we sync your data with the cloud'
                : syncStatus === 'success'
                ? 'All products are up to date!'
                : 'Click the button below to synchronize your products with the cloud server'
              }
            </p>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`px-12 py-6 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 ${
                isSyncing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600'
              }`}
            >
              {isSyncing ? 'Syncing...' : 'Sync with Cloud'}
            </button>
          </div>

          {/* Sync Details */}
          {!isSyncing && syncStatus === 'idle' && (
            <div className="border-t-2 border-gray-100 pt-8 mt-8">
              <h4 className="text-gray-700 mb-4">What will be synced?</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Download className="w-5 h-5 text-blue-500" />
                  <span>Product catalog and prices</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Upload className="w-5 h-5 text-blue-500" />
                  <span>Inventory updates</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <span>Product availability status</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
