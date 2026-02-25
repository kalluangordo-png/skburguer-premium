import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Plus, Search, ChevronRight, ArrowLeft, 
  MapPinned, Loader2, Smartphone, CreditCard, Banknote, 
  CheckCircle2, X, Minus, Trash2, Flame, Utensils
} from 'lucide-react';
import { useToast } from '../ToastContext';
import { formatCurrency, calculateDistance } from '../../utils';
import { PaymentMethod, OrderStatus, Product, StoreConfig } from '../../types';
import { LOJA_COORDS, MAX_DELIVERY_RADIUS_KM, PAYMENT_ADJUSTMENTS } from '../../constants';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import SmartUpsell from './SmartUpsell';
import CartUpsell from './CartUpsell';

interface MenuProps {
  onBack: () => void;
  config: StoreConfig;
}

const Menu: React.FC<MenuProps> = ({ onBack, config }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronização em tempo real dos produtos
  useEffect(() => {
    const q = query(
      collection(db, 'products'), 
      where('isPaused', '==', false)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setAllProducts(productsData);
      setLoadingProducts(false);
    }, (error) => {
      console.error("Erro ao buscar produtos:", error);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  // Categorias dinâmicas: União das configuradas + as que existem nos produtos
  const categories = useMemo(() => {
    const fixName = (name: string) => {
      const n = name.toUpperCase().trim();
      return n === 'CLÁSSICA' ? 'CLÁSSICO' : n;
    };

    const configCats = (config.categories || []).map(fixName);
    const productCats = allProducts.map(p => fixName(p.category || '')).filter(Boolean);
    const combined = Array.from(new Set([...configCats, ...productCats])).filter(Boolean);
    const finalCats = combined.length > 0 ? combined : ['BURGERS', 'COMBOS', 'BEBIDAS', 'ACOMPANHAMENTOS'];
    return ['TODOS', ...finalCats];
  }, [config.categories, allProducts]);

  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [cart, setCart] = useState<{ 
    id: string; 
    name: string; 
    price: number; 
    quantity: number; 
    category: string;
    isCombo?: boolean;
    addons?: { name: string; price: number }[];
  }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [isLocating, setIsLocating] = useState(false);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderComanda, setLastOrderComanda] = useState('');
  const [comboItem, setComboItem] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<{ name: string; price: number }[]>([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numeroCasa: '',
    bairro: '',
    referencia: '',
    observacao: ''
  });

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: cleanCep }));

    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          // Restrição Geográfica: Foco em Manaus
          if (data.localidade.toUpperCase() !== 'MANAUS') {
            showToast("CEP não localizado ou fora da área de atuação (Manaus apenas)", "error");
            return;
          }

          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro.toUpperCase(),
            bairro: data.bairro.toUpperCase()
          }));
          showToast("Endereço preenchido!", "success");
        } else {
          showToast("CEP não encontrado. Preencha manualmente.", "info");
        }
      } catch (error) {
        showToast("Erro ao buscar CEP.", "error");
      }
    }
  };

  // Garantir que temos uma categoria ativa válida
  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory('TODOS');
    }
  }, [categories, activeCategory]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const pCat = (p.category || '').toUpperCase();
      const aCat = (activeCategory || 'TODOS').toUpperCase();
      
      const matchesCategory = (aCat === 'TODOS' || searchQuery) ? true : pCat === aCat;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, activeCategory, searchQuery]);

  const { showToast } = useToast();

  const addToCart = (product: { 
    id: string; 
    name: string; 
    price: number; 
    category?: string; 
    isCombo?: boolean;
    addons?: { name: string; price: number }[];
  }) => {
    setCart(prev => {
      const addonsJson = JSON.stringify(product.addons || []);
      const existing = prev.find(item => 
        item.id === product.id && 
        item.isCombo === product.isCombo && 
        JSON.stringify(item.addons || []) === addonsJson
      );
      
      if (existing) {
        return prev.map(item => (
          item.id === product.id && 
          item.isCombo === product.isCombo && 
          JSON.stringify(item.addons || []) === addonsJson
        ) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, category: product.category || '', isCombo: !!product.isCombo }];
    });
    
    // Meta Pixel: Track AddToCart
    if ((window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        value: product.price,
        currency: 'BRL'
      });
    }

    showToast(`${product.name} ${product.isCombo ? '(Combo)' : ''} adicionado!`, 'success');
  };

  const handleAddToCartClick = (product: Product) => {
    const category = product.category.toLowerCase();
    const isExcluded = category.includes('bebida') || category.includes('sobremesa') || category.includes('doce');
    const isAlreadyCombo = product.name.toLowerCase().includes('combo');

    if (!isExcluded && !isAlreadyCombo) {
      setComboItem(product);
    } else {
      addToCart(product);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  
  const deliveryFee = useMemo(() => {
    if (userDistance === null) return 0;
    // Novas Regras de Entrega SK Burgers
    if (userDistance <= 2) return 5.00;
    if (userDistance <= 4) return 7.00;
    if (userDistance <= 5.5) return 9.00;
    return 0; // Bloqueado via isOutOfRange
  }, [userDistance]);

  const paymentAdjustment = useMemo(() => {
    const adjustmentRate = PAYMENT_ADJUSTMENTS[paymentMethod] || 0;
    return subtotal * adjustmentRate;
  }, [paymentMethod, subtotal]);

  const finalTotal = subtotal + deliveryFee + paymentAdjustment;
  const isOutOfRange = userDistance !== null && userDistance > MAX_DELIVERY_RADIUS_KM;

  const handleGetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      showToast("Geolocalização não suportada.", "error");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const distance = calculateDistance(
          LOJA_COORDS.lat, 
          LOJA_COORDS.lng, 
          userLat, 
          userLng
        );

        setUserDistance(distance);
        setIsLocating(false);
        showToast(`Localização confirmada! Distância: ${distance.toFixed(1)}km`, "success");
      },
      () => {
        showToast("Erro ao obter localização.", "error");
        setIsLocating(false);
      }
    );
  };

  const handleUpgradeToCombo = (itemId: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId && !item.isCombo) {
        return { 
          ...item, 
          price: item.price + 12, 
          isCombo: true 
        };
      }
      return item;
    }));
    showToast("Upgrade para Combo realizado! 🍟🥤", "success");
  };

  const handleFinalizeOrder = async () => {
    if (!formData.nome || !formData.whatsapp || !formData.cep || !formData.endereco) {
      showToast("Preencha todos os campos obrigatórios (Nome, WhatsApp, CEP e Endereço).", "error");
      return;
    }

    setIsSubmitting(true);
    
    // Timeout de segurança para não travar o botão
    const timeout = setTimeout(() => {
      if (isSubmitting) {
        setIsSubmitting(false);
        showToast("Tempo de resposta excedido. Tente novamente.", "error");
      }
    }, 15000);

    try {
      const comanda = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Inteligência Fiscal: Separação de itens para ST (Substituição Tributária) no Admin
      const processedItens = cart.flatMap(i => {
        if (i.isCombo) {
          return [
            { 
              id: i.id, 
              name: i.name.toUpperCase(), 
              qtd: i.quantity, 
              price: i.price - 12,
              isComboPart: true,
              addons: i.addons 
            },
            {
              id: `upgrade_${i.id}`,
              name: 'UPGRADE COMBO (BATATA + REFRI)',
              qtd: i.quantity,
              price: 12,
              category: 'Acompanhamento',
              isComboUpgrade: true,
              hasST: true // Identificador para o AdminSK separar o imposto do Refri
            }
          ];
        }
        return [{ 
          id: i.id, 
          name: i.name.toUpperCase(), 
          qtd: i.quantity, 
          price: i.price,
          isCombo: !!i.isCombo,
          addons: i.addons
        }];
      });

      const orderData = {
        numeroComanda: comanda,
        itens: processedItens,
        total: finalTotal,
        subtotal,
        taxaEntrega: deliveryFee,
        taxas: paymentAdjustment,
        status: OrderStatus.PENDING,
        pagamento: paymentMethod,
        customerName: formData.nome,
        customerPhone: formData.whatsapp,
        address: `${formData.endereco}, ${formData.numeroCasa} - ${formData.bairro} (CEP: ${formData.cep})`,
        cliente: {
          nome: formData.nome,
          whatsapp: formData.whatsapp,
          endereco: formData.endereco,
          numeroCasa: formData.numeroCasa,
          cep: formData.cep,
          bairro: formData.bairro,
          referencia: formData.referencia,
          observacao: formData.observacao
        },
        createdAt: Date.now(),
        dataCriacao: serverTimestamp()
      };

      await addDoc(collection(db, 'pedidos'), orderData);
      
      // Meta Pixel: Track Purchase
      if ((window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
          value: finalTotal,
          currency: 'BRL',
          content_ids: cart.map(i => i.id),
          content_type: 'product'
        });
      }

      clearTimeout(timeout);
      setLastOrderComanda(comanda);
      setCheckoutStep('success');
      setCart([]);
    } catch (error: any) {
      clearTimeout(timeout);
      console.error("Erro ao salvar pedido:", error);
      showToast(`Erro: ${error.message || "Falha ao enviar"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-32">
      <header className="glass sticky top-0 z-40 px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl text-zinc-400">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tighter">CARDÁPIO</h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">SK BURGERS PREMIUM</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCartOpen(true)} className="relative">
              <ShoppingCart className="w-6 h-6 text-zinc-300" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-orange-600 text-white' 
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 space-y-6">
        <div className="glass-card !p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-600" />
          <input 
            type="text" 
            placeholder="O que você quer comer hoje?" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-zinc-700"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={14} className="text-zinc-500" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-orange-500" size={32} />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Aquecendo a chapa...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 opacity-30">
              <Search size={40} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item encontrado</p>
            </div>
          ) : (
            filteredProducts.map((p, index) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card flex gap-4 !p-3 group"
                >
                    <div className="w-24 h-24 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-full h-full object-cover brightness-90 group-hover:brightness-110 group-hover:scale-105 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Utensils size={32} />
                        </div>
                      )}
                    </div>
                  <div className="flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-white uppercase italic text-sm">{p.name}</h3>
                      <p className="text-zinc-500 text-[10px] line-clamp-2 mt-1">
                        {p.description}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-orange-500 font-black">{formatCurrency(p.price)}</span>
                      <button 
                        onClick={() => handleAddToCartClick(p)}
                        className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white active:scale-90 transition-transform"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </main>

      {/* MODAL DO CARRINHO / CHECKOUT */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
          >
            <header className="p-6 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-zinc-900 rounded-xl text-zinc-400">
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black text-white uppercase italic">Seu Pedido</h2>
              </div>
              {checkoutStep === 'cart' && cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-red-500 text-[10px] font-black uppercase tracking-widest">Limpar</button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
                        <ShoppingCart size={40} />
                      </div>
                      <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-3xl flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden">
                            {allProducts.find(p => p.id === item.id)?.image ? (
                              <img src={allProducts.find(p => p.id === item.id)?.image} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <Utensils size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-black uppercase text-xs italic">{item.name}</h4>
                            {item.addons && item.addons.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.addons.map((a, i) => (
                                  <span key={i} className="text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20 uppercase font-black">
                                    + {a.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-orange-500 font-black text-sm mt-1">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl border border-white/5">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:text-white text-zinc-500 transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:text-white text-zinc-500 transition-colors">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <CartUpsell 
                        cart={cart} 
                        allProducts={allProducts} 
                        config={config}
                        onAdd={addToCart}
                        onUpgrade={handleUpgradeToCombo}
                      />

                      <SmartUpsell 
                        cart={cart} 
                        allProducts={allProducts} 
                        onAdd={addToCart} 
                      />
                    </div>
                  )}
                </>
              )}

              {checkoutStep === 'form' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Informações de Entrega</h3>
                    <div className="space-y-3">
                      <input 
                        placeholder="SEU NOME COMPLETO (OBRIGATÓRIO)"
                        value={formData.nome}
                        onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                      />
                      <input 
                        placeholder="WHATSAPP (DDD + NÚMERO) (OBRIGATÓRIO)"
                        value={formData.whatsapp}
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          placeholder="CEP (OBRIGATÓRIO)"
                          value={formData.cep}
                          onChange={e => handleCepChange(e.target.value)}
                          maxLength={8}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                        />
                        <input 
                          placeholder="Nº DA CASA"
                          value={formData.numeroCasa}
                          onChange={e => setFormData({...formData, numeroCasa: e.target.value.toUpperCase()})}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                        />
                      </div>
                      <input 
                        placeholder="RUA / LOGRADOURO"
                        value={formData.endereco}
                        onChange={e => setFormData({...formData, endereco: e.target.value.toUpperCase()})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          placeholder="BAIRRO"
                          value={formData.bairro}
                          onChange={e => setFormData({...formData, bairro: e.target.value.toUpperCase()})}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                        />
                        <input 
                          placeholder="REFERÊNCIA"
                          value={formData.referencia}
                          onChange={e => setFormData({...formData, referencia: e.target.value.toUpperCase()})}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all"
                        />
                      </div>
                      <textarea 
                        placeholder="OBSERVAÇÕES (EX: PONTO DE REFERÊNCIA, SE O CEP DEU ERRADO DESCREVA AQUI)"
                        value={formData.observacao}
                        onChange={e => setFormData({...formData, observacao: e.target.value.toUpperCase()})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xs outline-none focus:border-orange-500 transition-all h-24 resize-none"
                      />
                    </div>
                    
                    <button 
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="w-full py-4 bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all text-white"
                    >
                      {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPinned size={16} />}
                      {userDistance === null ? "Confirmar Localização via GPS" : "GPS Atualizado"}
                    </button>
                    
                    {isOutOfRange && (
                      <p className="text-[10px] font-black text-red-500 uppercase text-center animate-bounce">
                        ⚠️ Desculpe, seu endereço está fora da nossa área de entrega (máx. {MAX_DELIVERY_RADIUS_KM}km).
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Como vai pagar?</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: PaymentMethod.PIX, icon: <Smartphone size={18} />, label: 'PIX (5% OFF)', color: 'border-emerald-500/30' },
                        { id: PaymentMethod.CREDIT, icon: <CreditCard size={18} />, label: 'CRÉDITO', color: 'border-white/5' },
                        { id: PaymentMethod.DEBIT, icon: <CreditCard size={18} />, label: 'DÉBITO', color: 'border-white/5' },
                        { id: PaymentMethod.CASH, icon: <Banknote size={18} />, label: 'DINHEIRO (5% OFF)', color: 'border-white/5' },
                        { id: PaymentMethod.SODEXO, icon: <CreditCard size={18} />, label: 'SODEXO (+10%)', color: 'border-white/5' },
                        { id: PaymentMethod.ALELO, icon: <CreditCard size={18} />, label: 'ALELO (+10%)', color: 'border-white/5' }
                      ].map((m) => (
                        <button 
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                          className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-orange-600 border-orange-600 text-white' : `bg-zinc-900 text-zinc-400 ${m.color}`}`}
                        >
                          {m.icon}
                          <span className="text-[10px] font-black">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 size={48} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase italic">PEDIDO CONFIRMADO!</h2>
                    <p className="text-zinc-500 font-black uppercase text-xs tracking-widest mt-2">Sua comanda é a #{lastOrderComanda}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-[2rem] border border-white/5 w-full">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase leading-relaxed">
                      Agora é só aguardar! Em instantes nosso atendente enviará uma confirmação no seu WhatsApp.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      setCheckoutStep('cart');
                      onBack();
                    }}
                    className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest"
                  >
                    VOLTAR PARA O INÍCIO
                  </button>
                </div>
              )}
            </div>

            {checkoutStep !== 'success' && cart.length > 0 && (
              <footer className="p-8 bg-zinc-950 border-t border-white/10 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-500 font-black text-[10px] uppercase">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 font-black text-[10px] uppercase">
                    <span>Entrega ({userDistance?.toFixed(1) || 0}km)</span>
                    <span className={deliveryFee === 0 ? "text-emerald-500" : ""}>
                      {deliveryFee === 0 ? 'GRÁTIS' : formatCurrency(deliveryFee)}
                    </span>
                  </div>
                  {paymentAdjustment !== 0 && (
                    <div className="flex justify-between text-zinc-500 font-black text-[10px] uppercase italic">
                      <span>Ajuste Pagamento</span>
                      <span>{formatCurrency(paymentAdjustment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-black text-2xl italic pt-2 border-t border-white/5">
                    <span>TOTAL</span>
                    <span className="text-orange-500">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {checkoutStep === 'cart' ? (
                  <button 
                    onClick={() => setCheckoutStep('form')}
                    disabled={cart.length === 0}
                    className="w-full py-6 bg-orange-600 rounded-[2rem] font-black text-white uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                  >
                    AVANÇAR PARA ENTREGA <ChevronRight size={20} />
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCheckoutStep('cart')}
                      className="p-6 bg-zinc-900 text-white rounded-2xl"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button 
                      onClick={handleFinalizeOrder}
                      disabled={isSubmitting || isOutOfRange}
                      className="flex-1 py-6 bg-emerald-500 rounded-[2rem] font-black text-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> ENVIAR PEDIDO</>}
                    </button>
                  </div>
                )}
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE COMBO E ADICIONAIS */}
      <AnimatePresence>
        {comboItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl my-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                      <Flame size={20} className="text-orange-500" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Personalizar</h3>
                  </div>
                  <button onClick={() => { setComboItem(null); setSelectedAddons([]); }} className="text-zinc-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-3">Adicionais</p>
                    <div className="grid grid-cols-2 gap-2">
                      {config.addons?.map((addon, idx) => {
                        const isSelected = selectedAddons.some(a => a.name === addon.name);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAddons(prev => prev.filter(a => a.name !== addon.name));
                              } else {
                                setSelectedAddons(prev => [...prev, addon]);
                              }
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isSelected 
                              ? 'bg-orange-500 border-orange-500 text-black' 
                              : 'bg-zinc-800 border-white/5 text-zinc-400'
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase leading-none">{addon.name}</p>
                            <p className={`text-[9px] font-bold mt-1 ${isSelected ? 'text-black/60' : 'text-orange-500'}`}>
                              + {formatCurrency(addon.price)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-3">Combo</p>
                    <div className="bg-zinc-800/50 p-4 rounded-3xl border border-white/5">
                      <p className="text-xs font-bold text-white uppercase italic">Transformar em Combo?</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Batata + Bebida por <span className="text-orange-500 font-black">+ R$ 12,00</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => {
                      const addonTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0);
                      addToCart({ 
                        ...comboItem, 
                        price: comboItem.price + 12 + addonTotal, 
                        isCombo: true,
                        addons: selectedAddons
                      });
                      setComboItem(null);
                      setSelectedAddons([]);
                    }}
                    className="w-full bg-orange-500 text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20"
                  >
                    COMBO + ADICIONAIS
                  </button>
                  <button 
                    onClick={() => {
                      const addonTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0);
                      addToCart({ 
                        ...comboItem, 
                        price: comboItem.price + addonTotal,
                        addons: selectedAddons
                      });
                      setComboItem(null);
                      setSelectedAddons([]);
                    }}
                    className="w-full bg-zinc-100 text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all"
                  >
                    SÓ O BURGER {selectedAddons.length > 0 && '+ ADICIONAIS'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Menu;
