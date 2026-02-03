import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Minus, Plus, Trash2, ShoppingBag, ChevronDown } from 'lucide-react';
import { CartItem, Sale, PaymentMethod, paymentMethodLabels } from '../types/sales';
import type { Product } from '../types/products';
import {
  findProductByCodeOffline,
  getProductsCountOffline,
  searchProductsOffline,
  syncProductsFromApi,
} from '../storage/offlineProducts';

interface SalesScreenProps {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onCompleteSale: (sale: Sale) => Promise<void>;
}

const paymentMethods: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'CARD', 'TRANSFER'];

export default function SalesScreen({ cart, setCart, onCompleteSale }: SalesScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const PAGE_SIZE = 50;
  const [discount, setDiscount] = useState(0);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef<number | null>(null);
  const productIndexRef = useRef<Record<string, Product>>({});
  const focusResetTimersRef = useRef<number[]>([]);

  const ensureSearchInputFocus = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const isEditableElement = (element: Element | null): boolean => {
      if (!element) return false;
      if (element instanceof HTMLInputElement) return !element.readOnly && !element.disabled;
      if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
      if (element instanceof HTMLSelectElement) return !element.disabled;
      if (element instanceof HTMLElement) return element.isContentEditable;
      return false;
    };

    focusResetTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    focusResetTimersRef.current = [];

    const attemptFocus = () => {
      const input = searchInputRef.current;
      if (!input) return;

      const active = document.activeElement;
      if (active && active !== input && isEditableElement(active)) {
        return;
      }

      if (document.activeElement !== input) {
        input.focus();
      }
    };

    [0, 75, 200].forEach((delay) => {
      const id = window.setTimeout(() => attemptFocus(), delay);
      focusResetTimersRef.current.push(id);
    });
  }, []);

  useEffect(() => {
    ensureSearchInputFocus();
  }, [ensureSearchInputFocus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowFocus = () => ensureSearchInputFocus();
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [ensureSearchInputFocus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    return () => {
      focusResetTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      focusResetTimersRef.current = [];
    };
  }, []);
  
  const fetchProducts = useCallback(async (page: number = 1, search: string = '') => {
    setIsLoadingProducts(true);
    setProductsError(null);

    try {
      const result = await searchProductsOffline(page, PAGE_SIZE, search);
      setProducts(result.products);

      const nextIndex: Record<string, Product> = { ...productIndexRef.current };
      result.products.forEach((product) => {
        nextIndex[product.id] = product;
      });
      productIndexRef.current = nextIndex;

      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Failed to fetch products', error);
      setProductsError(error instanceof Error ? error.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      await fetchProducts(1, '');

      if (cancelled) return;

      try {
        const count = await getProductsCountOffline();
        if (count === 0 && navigator.onLine) {
          await syncProductsFromApi({ force: true });
          if (!cancelled) {
            await fetchProducts(1, '');
          }
        }
      } catch (error) {
        console.error('Failed to initialize offline products', error);
      }
    };

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchProducts(1, searchQuery);
    }, 300);

    return () => clearTimeout(handle);
  }, [searchQuery, fetchProducts]);

  useEffect(() => {
    const handler = () => {
      fetchProducts(currentPage, searchQuery);
    };

    window.addEventListener('products-updated', handler as EventListener);
    return () => window.removeEventListener('products-updated', handler as EventListener);
  }, [fetchProducts, currentPage, searchQuery]);
  
  const filteredProducts = products;

  const handlePreviousPage = () => {
    if (isLoadingProducts || productsError || currentPage <= 1) return;

    const nextPage = Math.max(currentPage - 1, 1);
    fetchProducts(nextPage, searchQuery);
  };

  const handleNextPage = () => {
    if (isLoadingProducts || productsError || currentPage >= totalPages) return;

    const nextPage = Math.min(currentPage + 1, totalPages);
    fetchProducts(nextPage, searchQuery);
  };

  const getCartQuantity = (id: string) => {
    const existing = cart.find((item) => item.id === id);
    return existing?.quantity ?? 0;
  };

  const addToCart = (product: Product) => {
    productIndexRef.current = {
      ...productIndexRef.current,
      [product.id]: product,
    };

    const existingItem = cart.find(item => item.id === product.id);
    const currentQty = existingItem?.quantity ?? 0;

    if (product.stockQuantity <= 0) {
      window.alert(`No stock left for ${product.name}.`);
      return;
    }

    let nextQty = currentQty;

    if (existingItem) {
      // Follow the same stepping as the cart increment button
      if (currentQty === 0.25) {
        nextQty = 0.5;
      } else if (currentQty === 0.5) {
        nextQty = 1;
      } else {
        nextQty = currentQty + 1;
      }
    } else {
      // First time adding: respect available stock and start at up to 1 unit
      nextQty = product.stockQuantity >= 1 ? 1 : product.stockQuantity;
    }

    // Do not allow adding beyond available stock or to non-positive quantity
    if (nextQty <= 0 || nextQty > product.stockQuantity) {
      window.alert(`Only ${product.stockQuantity} unit(s) of ${product.name} available.`);
      return;
    }

    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: nextQty }
          : item
      ));
    } else {
      setCart([...cart, { ...product, price: product.sellingPrice, quantity: nextQty }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = productIndexRef.current[id] ?? products.find((p) => p.id === id);

    setCart(
      cart
        .map(item => {
          if (item.id !== id) return item;

          let newQty = item.quantity;

          if (delta > 0) {
            // Increment logic: move up through 0.25 -> 0.5 -> 0.75 -> 1, then step by whole units
            if (item.quantity === 0.25) {
              newQty = 0.5;
            } else if (item.quantity === 0.5) {
              newQty = 0.75;
            } else if (item.quantity === 0.75) {
              newQty = 1;
            } else {
              newQty = item.quantity + 1;
            }
          } else if (delta < 0) {
            // Decrement logic: step down through decimal values
            if (item.quantity > 1) {
              newQty = item.quantity - 1;
            } else if (item.quantity === 1) {
              newQty = 0.75;
            } else if (item.quantity === 0.75) {
              newQty = 0.5;
            } else if (item.quantity === 0.5) {
              newQty = 0.25;
            } else if (item.quantity === 0.25) {
              newQty = 0;
            }
          }

          if (delta > 0 && product && newQty > product.stockQuantity) {
            window.alert(`Only ${product.stockQuantity} unit(s) of ${product.name} available.`);
            return item;
          }

          return { ...item, quantity: newQty };
        })
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleBarcodeComplete = useCallback(async (code: string) => {
    const normalizedCode = code.trim();

    if (!normalizedCode || normalizedCode.length < 4) {
      return;
    }

    try {
      const matchedProduct = await findProductByCodeOffline(normalizedCode);

      if (!matchedProduct) {
        window.alert(`No product found for barcode/SKU "${normalizedCode}".`);
        return;
      }

      addToCart(matchedProduct);
    } finally {
      ensureSearchInputFocus();
    }
  }, [addToCart]);

  useEffect(() => {
    const SCAN_TIMEOUT_MS = 50;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditableTarget && target !== searchInputRef.current) {
        return;
      }

      const now = Date.now();
      const lastTime = lastKeyTimeRef.current;

      if (!lastTime || now - lastTime > SCAN_TIMEOUT_MS) {
        barcodeBufferRef.current = '';
    ensureSearchInputFocus();
      }

      lastKeyTimeRef.current = now;

      if (event.key === 'Enter') {
        const code = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';

        if (!code) {
          return;
        }

        event.preventDefault();
        handleBarcodeComplete(code);
        ensureSearchInputFocus();
        return;
      }

      if (event.key.length === 1) {
        const char = event.key;
        if (/^[0-9a-zA-Z_-]$/.test(char)) {
          barcodeBufferRef.current += char;
        } else {
          barcodeBufferRef.current = '';
        }
        ensureSearchInputFocus();
      } else if (event.key === 'Shift' || event.key === 'Tab') {
      } else {
        barcodeBufferRef.current = '';
        ensureSearchInputFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      ensureSearchInputFocus();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBarcodeComplete, ensureSearchInputFocus]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - discount;

  const amountPaid = useMemo(() => {
    const numeric = Number(amountPaidInput);
    if (!Number.isFinite(numeric)) return null;
    return numeric;
  }, [amountPaidInput]);

  const changeGiven = useMemo(() => {
    if (amountPaid == null) return null;
    return amountPaid - total;
  }, [amountPaid, total]);

  const openCheckout = () => {
    if (cart.length === 0 || isCompletingSale) return;
    setAmountPaidInput(total > 0 ? total.toFixed(2) : '0');
    setIsCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (isCompletingSale) return;
    setIsCheckoutOpen(false);
  };

  const handleCompleteSale = async (paid: number, change: number) => {
    if (cart.length === 0 || isCompletingSale) return;

    setIsCompletingSale(true);
    try {
      const now = new Date();
      const authUserRaw = localStorage.getItem('authUser');
      const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
      const userId = authUser?.id ?? 'offline-user';
      const receiptNumber = `POS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime().toString().slice(-6)}`;
      const sale: Sale = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `SALE-${Date.now()}`,
        receiptNumber,
        userId,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        items: [...cart],
        subtotal,
        discount,
        totalAmount: total,
        paymentMethod,
        amountPaid: paid,
        changeGiven: change,
        customerName: customerName.trim() || undefined,
        synced: false,
      };

      await onCompleteSale(sale);
    } finally {
      setIsCompletingSale(false);
    }
  };

  const confirmCheckout = async () => {
    if (amountPaid == null || changeGiven == null) return;
    if (changeGiven < 0) return;
    await handleCompleteSale(amountPaid, changeGiven);
  };

  const selectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setShowPaymentMethods(false);
  };

  return (
    <div className="h-full flex">

      {typeof document !== 'undefined' && isCheckoutOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeCheckout();
              }
            }}
          >
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-gray-800">Checkout</h3>
                <p className="text-gray-500 mt-1">Enter customer payment to complete sale.</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between text-gray-600">
                  <span>Total</span>
                  <span className="text-blue-600">₵{total.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Amount Paid</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    autoFocus
                  />
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Change</span>
                  <span className={changeGiven != null && changeGiven < 0 ? 'text-red-600' : 'text-green-600'}>
                    ₵{(changeGiven ?? 0).toFixed(2)}
                  </span>
                </div>

                {changeGiven != null && changeGiven < 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    Amount paid is less than total.
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={closeCheckout}
                  disabled={isCompletingSale}
                  className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
                    isCompletingSale
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCheckout}
                  disabled={
                    isCompletingSale ||
                    cart.length === 0 ||
                    amountPaid == null ||
                    changeGiven == null ||
                    changeGiven < 0
                  }
                  className={`flex-1 py-3 rounded-xl transition-all shadow-md active:scale-95 ${
                    isCompletingSale ||
                    cart.length === 0 ||
                    amountPaid == null ||
                    changeGiven == null ||
                    changeGiven < 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                  }`}
                >
                  {isCompletingSale ? 'Processing...' : 'Confirm Sale'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-6 border-b-2 border-gray-100">
          <div className="relative max-w-2xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              autoFocus
              className="w-full pl-16 pr-6 py-5 border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoadingProducts && (
              <div className="col-span-full py-10 text-center text-gray-500">
                Loading products...
              </div>
            )}

            {!isLoadingProducts && productsError && (
              <div className="col-span-full text-center bg-red-50 border border-red-200 text-red-600 p-8 rounded-2xl">
                <p className="mb-4 font-medium">{productsError}</p>
                <button
                  onClick={() => fetchProducts(1, searchQuery)}
                  className="px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoadingProducts && !productsError && filteredProducts.length === 0 && (
              <div className="col-span-full py-10 text-center text-gray-500">
                No products found.
              </div>
            )}

            {!isLoadingProducts && !productsError && filteredProducts.map(product => {
              const inCartQty = getCartQuantity(product.id);
              const remainingStock = product.stockQuantity - inCartQty;
              const hasAnyStock = product.stockQuantity > 0;
              const outOfStock = !hasAnyStock;
              const atLimit = hasAnyStock && remainingStock <= 0;
              const disableAdd = outOfStock || atLimit;

              return (
                <div
                  key={product.id}
                  className={`bg-white border-2 rounded-2xl p-6 transition-all ${
                    disableAdd
                      ? 'border-gray-200 opacity-60 cursor-not-allowed'
                      : 'border-gray-100 hover:border-blue-500 hover:shadow-lg'
                  }`}
                >
                  <div className="mb-4">
                    <h4 className="text-gray-800">{product.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {outOfStock
                        ? 'Out of stock'
                        : `In stock: ${Math.max(0, remainingStock)}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600">₵{product.sellingPrice.toFixed(2)}</span>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={disableAdd}
                      className={`px-5 py-3 rounded-xl transition-all shadow-md active:scale-95 ${
                        disableAdd
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:from-blue-600 hover:to-teal-600 hover:shadow-lg'
                      }`}
                    >
                      {outOfStock ? 'Out of stock' : atLimit ? 'Max added' : 'Add'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoadingProducts && !productsError && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
                {typeof totalCount === 'number' && Number.isFinite(totalCount) && totalCount >= 0 && (
                  <span className="ml-2 text-gray-500">· {totalCount} item(s)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1 || isLoadingProducts}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    currentPage <= 1 || isLoadingProducts
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-100'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || isLoadingProducts}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    currentPage >= totalPages || isLoadingProducts
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-100'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Cart */}
      <div style={{width: '35rem'}} className="bg-gray-50 border-l-2 border-gray-100 flex flex-col">
        <div className="p-3 border-b-2 border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-7 h-7 text-blue-500" strokeWidth={2.5} />
              <h3 className="text-gray-800">Cart ({cart.length})</h3>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowPaymentMethods(!showPaymentMethods)}
                className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {paymentMethodLabels[paymentMethod]}
                <ChevronDown className="w-5 h-4 text-gray-500" />
              </button>
              {showPaymentMethods && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {paymentMethods.map((method) => (
                      <button
                        key={method}
                        onClick={() => selectPaymentMethod(method)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          paymentMethod === method 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {paymentMethodLabels[method]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Name Input */}
        <div className="px-6 pb-4">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name (Optional)"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors bg-white"
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="text-gray-800 mb-1">{item.name}</h5>
                      <p className="text-blue-600">₵{item.price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                    >
                      <Minus className="w-5 h-5 text-gray-600" />
                    </button>
                    <span className="text-gray-800 min-w-12 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5 text-gray-600" />
                    </button>
                    <span className="ml-auto text-gray-800">
                      ₵{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="border-t-2 border-gray-100 p-3 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>₵{subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Discount:</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg text-right focus:outline-none focus:border-blue-500"
              placeholder="0.00"
              step="1"
            />
          </div>

          <div className="flex justify-between pt-4 border-t-2 border-gray-200">
            <span>Total:</span>
            <span className="text-blue-600">₵{total.toFixed(2)}</span>
          </div>

          <button
            onClick={openCheckout}
            disabled={cart.length === 0 || isCompletingSale}
            className={`w-full py-6 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 ${
              cart.length === 0 || isCompletingSale
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
            }`}
          >
            {isCompletingSale ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
