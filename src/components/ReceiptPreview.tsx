import React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { Sale, CartItem, formatPaymentMethod } from '../types/sales';
import { branding, brandGradientStyle } from '../config/branding';

interface ReceiptPreviewProps {
  sale: Sale;
  onBackToPOS: () => void;
}

export default function ReceiptPreview({ sale, onBackToPOS }: ReceiptPreviewProps) {
  // Get shop info from localStorage
  const getShopInfo = () => {
    const shopInfoStr = localStorage.getItem('shopInfo');
    if (shopInfoStr) {
      try {
        return JSON.parse(shopInfoStr);
      } catch (e) {
        console.error('Error parsing shop info:', e);
      }
    }
    // Default values if no shop info found
    return branding.shopInfoDefaults;
  };

  const shopInfo = getShopInfo();

  const handlePrint = async () => {
    if (window.electronAPI?.printReceipt) {
      try {
        const ok = await window.electronAPI.printReceipt({ ...sale, shopInfo } as any);
        if (!ok) {
          console.error('Electron printReceipt returned false');
        }
      } catch (error) {
        console.error('Electron printReceipt threw error', error);
      }
      return;
    }
    window.print();
  };

  return (
    <div className="h-46 bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex gap-4">
          <button
            onClick={onBackToPOS}
            className="flex items-center gap-3 px-8 py-4 bg-white text-gray-700 rounded-2xl hover:bg-gray-100 transition-all shadow-md hover:shadow-lg border-2 border-gray-200"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Back to POS</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r text-white rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95"
            style={brandGradientStyle()}
          >
            <Printer className="w-6 h-6" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-2xl shadow-xl p-12 border-2 border-gray-100">
          {/* Customer Name */}
          <div className="text-center mb-6">
            <div className="border-b-2 border-gray-300 pb-2 mb-4">
              <span className="text-gray-500 text-sm">Customer Name:</span>
              <div className="mt-1 text-lg font-semibold text-gray-800">
                {sale.customerName || '_________________________'}
              </div>
            </div>
          </div>

          {/* Shop Info */}
          <div className="text-center mb-8">
            <h2 className="text-gray-800 mb-2">{shopInfo.shopName}</h2>
            <p className="text-gray-500">{shopInfo.address}</p>
            <p className="text-gray-500">Phone: {shopInfo.phoneNumber}</p>
          </div>

          <div className="border-t-2 border-dashed border-gray-300 pt-6 mb-6">
            <div className="flex justify-between mb-3 text-gray-600">
              <span>Receipt #:</span>
              <span>{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between mb-3 text-gray-600">
              <span>Date:</span>
              <span>{sale.date}</span>
            </div>
            <div className="flex justify-between mb-3 text-gray-600">
              <span>Time:</span>
              <span>{sale.time}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment:</span>
              <span>{formatPaymentMethod(sale.paymentMethod)}</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-gray-300 pt-6 mb-6">
            <div className="flex mb-4 text-gray-500 pb-3 border-b border-gray-200">
              <div className="flex-1">Item</div>
              <div className="w-16 text-center">Qty</div>
              <div className="w-24 text-right">Price</div>
              <div className="w-24 text-right">Total</div>
            </div>
            {sale.items.map((item: CartItem, index: number) => (
              <div key={`${item.id}-${index}`} className="flex mb-3 text-gray-700">
                <div className="flex-1">{item.name}</div>
                <div className="w-16 text-center">{item.quantity}</div>
                <div className="w-24 text-right">₵{item.price.toFixed(2)}</div>
                <div className="w-24 text-right">₵{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 pt-6 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>₵{sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount:</span>
                <span>₵{sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t-2 border-gray-300">
              <span>TOTAL:</span>
              <span className="text-blue-600">₵{sale.totalAmount.toFixed(2)}</span>
            </div>

            {typeof sale.amountPaid === 'number' && (
              <div className="flex justify-between text-gray-600">
                <span>Amount Paid:</span>
                <span>₵{sale.amountPaid.toFixed(2)}</span>
              </div>
            )}

            {typeof sale.changeGiven === 'number' && (
              <div className="flex justify-between text-gray-600">
                <span>Change:</span>
                <span>₵{sale.changeGiven.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="text-center mt-8 pt-6 border-t-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-6">Thank you for your purchase!</p>
            <p className="text-gray-400">Please come again</p>
          </div>

          {/* Signature Sections */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              {/* Customer Signature */}
              <div>
                <div className="border-b-2 border-gray-400 pb-1 mb-2">
                  <span className="text-gray-400 text-xs">Customer Signature</span>
                </div>
                <div className="h-12 border-dashed border-gray-300 flex items-center justify-center mb-4">
                </div>
              </div>
              
              {/* Shop Owner Signature */}
              <div>
                <div className="border-b-2 border-gray-400 pb-1 mb-2">
                  <span className="text-gray-400 text-xs">Issued By</span>
                </div>
                <div className="h-12 border-dashed border-gray-300 flex items-center justify-center mb-4">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
