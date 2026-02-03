import React, { useState, useMemo, useEffect } from 'react';
import { Printer, Search, Calendar, DollarSign, HandCoins, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react';
import { Sale, formatPaymentMethod, CartItem } from '../types/sales';

interface SalesHistoryProps {
  sales: Sale[];
  onViewInvoice: (sale: Sale) => void;
  onReprintInvoice: (sale: Sale) => void;
}

const ITEMS_PER_PAGE = 10;

export default function SalesHistory({ sales, onViewInvoice, onReprintInvoice }: SalesHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSales = useMemo(() => 
    sales.filter((sale) =>
      sale.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.date.includes(searchQuery) ||
      formatPaymentMethod(sale.paymentMethod).toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [sales, searchQuery]
  );

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const totalRevenue = sales.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);
  const todaysSales = sales.filter(sale => sale.date === new Date().toLocaleDateString());
  const todaysRevenue = todaysSales.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleViewInvoice = (sale: Sale) => {
    onViewInvoice(sale);
  };

  const handleReprintReceipt = (sale: Sale) => {
    onReprintInvoice(sale);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="h-full bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-gray-800 mb-6">Sales History</h2>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Today's Sales</span>
                <Calendar className="w-6 h-6 text-teal-500" />
              </div>
              <p className="text-gray-800">{todaysSales.length}</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Today's Revenue</span>
                <HandCoins className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-green-600">₵{todaysRevenue.toFixed(2)}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by receipt #, date, or payment method..."
              className="w-full pl-16 pr-6 py-5 border-2 border-gray-200 rounded-2xl text-lg bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
          {filteredSales.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">No sales found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-100">
                    <tr>
                      <th className="text-left px-8 py-5 text-gray-600">Receipt #</th>
                      <th className="text-left px-8 py-5 text-gray-600">Date</th>
                      <th className="text-left px-8 py-5 text-gray-600">Time</th>
                      <th className="text-left px-8 py-5 text-gray-600">Items</th>
                      <th className="text-left px-8 py-5 text-gray-600">Payment</th>
                      <th className="text-left px-8 py-5 text-gray-600">Amount</th>
                      <th className="text-left px-8 py-5 text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-5 text-gray-700">{sale.receiptNumber}</td>
                        <td className="px-8 py-5 text-gray-700">{sale.date}</td>
                        <td className="px-8 py-5 text-gray-700">{sale.time}</td>
                        <td className="px-8 py-5 text-gray-700">
                          {sale.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)} items
                        </td>
                        <td className="px-8 py-5 text-gray-700">{formatPaymentMethod(sale.paymentMethod)}</td>
                        <td className="px-8 py-5 text-green-600">₵{sale.totalAmount.toFixed(2)}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleViewInvoice(sale)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors active:scale-95"
                            >
                              <FileText className="w-4 h-4" />
                              View
                            </button>
                            <button
                              onClick={() => handleReprintReceipt(sale)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors active:scale-95"
                            >
                              <Printer className="w-4 h-4" />
                              Reprint
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-8 py-4 border-t border-gray-200 bg-white">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredSales.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredSales.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredSales.length}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronsLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`w-10 h-10 rounded-md flex items-center justify-center ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`p-2 rounded-md ${(currentPage === totalPages || totalPages === 0) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`p-2 rounded-md ${(currentPage === totalPages || totalPages === 0) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronsRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
