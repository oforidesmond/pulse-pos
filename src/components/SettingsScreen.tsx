import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle, XCircle, Settings, Info } from 'lucide-react';
import { branding } from '../config/branding';

interface ShopInfo {
  shopName: string;
  address: string;
  phoneNumber: string;
}

export default function SettingsScreen() {
  const [printTestStatus, setPrintTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    shopName: branding.shopInfoDefaults.shopName,
    address: branding.shopInfoDefaults.address,
    phoneNumber: branding.shopInfoDefaults.phoneNumber
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load saved shop info on component mount
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('shopInfo');
      if (savedInfo) {
        setShopInfo(JSON.parse(savedInfo));
      } else {
        setShopInfo({
          shopName: branding.shopInfoDefaults.shopName,
          address: branding.shopInfoDefaults.address,
          phoneNumber: branding.shopInfoDefaults.phoneNumber,
        });
      }
    } catch (error) {
      console.error('Failed to load shop info:', error);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShopInfo((prev: ShopInfo) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveShopInfo = () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      localStorage.setItem('shopInfo', JSON.stringify(shopInfo));
      setSaveStatus('saved');
      
      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Failed to save shop info:', error);
      setSaveStatus('error');
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintTest = () => {
    setPrintTestStatus('testing');
    
    // Simulate printer test
    setTimeout(() => {
      // Randomly succeed or fail for demo purposes
      const success = Math.random() > 0.2;
      setPrintTestStatus(success ? 'success' : 'error');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setPrintTestStatus('idle');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="h-full bg-gray-50 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-gray-800 mb-3">Settings</h2>
          <p className="text-gray-500">Configure your POS system preferences</p>
        </div>

        {/* Printer Settings */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Printer className="w-7 h-7 text-blue-500" strokeWidth={2.5} />
            <h3 className="text-gray-800">Printer Settings</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block mb-3 text-gray-700">Printer Name</label>
              <input
                type="text"
                defaultValue="EPSON TM-T88V"
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter printer name"
              />
            </div>

            <div>
              <label className="block mb-3 text-gray-700">Paper Size</label>
              <select className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors">
                <option>80mm (Thermal)</option>
                <option>58mm (Thermal)</option>
                <option>A4</option>
                <option>Letter</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-gray-700 mb-1">Auto-print receipts</p>
                <p className="text-gray-500 text-sm">Automatically print after each sale</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <button
              onClick={handlePrintTest}
              disabled={printTestStatus === 'testing'}
              className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 ${
                printTestStatus === 'testing'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : printTestStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : printTestStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600'
              }`}
            >
              {printTestStatus === 'testing' ? (
                <>
                  <Printer className="w-6 h-6 animate-pulse" />
                  <span>Testing Printer...</span>
                </>
              ) : printTestStatus === 'success' ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>Test Successful!</span>
                </>
              ) : printTestStatus === 'error' ? (
                <>
                  <XCircle className="w-6 h-6" />
                  <span>Test Failed</span>
                </>
              ) : (
                <>
                  <Printer className="w-6 h-6" />
                  <span>Test Printer</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-7 h-7 text-teal-500" strokeWidth={2.5} />
            <h3 className="text-gray-800">General Settings</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block mb-3 text-gray-700">Shop Name</label>
              <input
                type="text"
                name="shopName"
                value={shopInfo.shopName}
                onChange={handleInputChange}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors mb-4"
                placeholder="Enter shop name"
              />
            </div>
            
            <div>
              <label className="block mb-3 text-gray-700">Address</label>
              <input
                type="text"
                name="address"
                value={shopInfo.address}
                onChange={handleInputChange}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors mb-4"
                placeholder="Enter shop address"
              />
            </div>
            
            <div>
              <label className="block mb-3 text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={shopInfo.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors mb-6"
                placeholder="Enter phone number"
              />
            </div>
            
            <button
              onClick={handleSaveShopInfo}
              disabled={isSaving}
              className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl transition-all shadow-md ${
                isSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : saveStatus === 'saved'
                  ? 'bg-green-500 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 hover:shadow-lg active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>Saved Successfully!</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <XCircle className="w-6 h-6" />
                  <span>Save Failed</span>
                </>
              ) : (
                <>
                  <span>Save Shop Information</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Info className="w-7 h-7 text-purple-500" strokeWidth={2.5} />
            <h3 className="text-gray-800">System Information</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Version</span>
              <span className="text-gray-800">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Platform</span>
              <span className="text-gray-800">Windows 11</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Build Date</span>
              <span className="text-gray-800">December 1, 2024</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">License</span>
              <span className="text-green-600">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
