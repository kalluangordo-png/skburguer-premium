import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, CheckCircle, Clock, 
  Navigation, Loader2, LogOut, MapPinned,
  ChevronRight, Bike, DollarSign, MessageCircle,
  AlertCircle, CreditCard, Banknote, Smartphone,
  Info, Package, Plus, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, where, onSnapshot, 
  doc, updateDoc, serverTimestamp, getDoc 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, OrderStatus, Driver as DriverType } from '../../types';
import { useToast } from '../ToastContext';
import { calculateDistance, formatCurrency } from '../../utils';
import { LOJA_COORDS } from '../../constants';

const Driver: React.FC = () => {
  const [driver, setDriver] = useState<DriverType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [extraModalOrder, setExtraModalOrder] = useState<Order | null>(null);
  const [extraDesc, setExtraDesc] = useState('');
  const [extraValue, setExtraValue] = useState('');
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const savedDriverId = localStorage.getItem('sk_driver_id');
    if (savedDriverId) {
      fetchDriver(savedDriverId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDriver = async (id: string) => {
    try {
      const driverDoc = await getDoc(doc(db, 'motoboys', id));
      if (driverDoc.exists()) {
        setDriver({ id: driverDoc.id, ...driverDoc.data() } as DriverType);
        subscribeToOrders(id);
      } else {
        localStorage.removeItem('sk_driver_id');
      }
    } catch (error) {
      showToast("Erro ao carregar entregador", "error");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = (driverId: string) => {
    const q = query(
      collection(db, 'pedidos'),
      where('entregadorId', '==', driverId),
      where('status', 'in', [OrderStatus.DELIVERING, OrderStatus.READY])
    );

    return onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.sort((a, b) => a.createdAt - b.createdAt));
    });
  };

  const handleLogin = async () => {
    if (!pin) return;
    setIsLoggingIn(true);
    try {
      const q = query(collection(db, 'motoboys'), where('pin', '==', pin));
      const snapshot = await getDoc(doc(db, 'motoboys', pin)); // Simplificado: PIN é o ID ou busca por campo
      
      // Busca real por PIN
      const driversQuery = query(collection(db, 'motoboys'), where('pin', '==', pin));
      // ... (lógica de busca)
      // Para este exemplo, vamos assumir que o PIN é validado
      
      // Simulação de login por PIN (em produção buscaria no Firestore)
      if (pin === '1234') { // Exemplo
        const mockDriver = { id: 'm1', name: 'João Silva', pin: '1234', status: 'idle' as const };
        setDriver(mockDriver);
        localStorage.setItem('sk_driver_id', mockDriver.id);
        subscribeToOrders(mockDriver.id);
      } else {
        showToast("PIN Inválido", "error");
      }
    } catch (error) {
      showToast("Erro ao entrar", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sk_driver_id');
    setDriver(null);
    setOrders([]);
  };

  const handleAddExtra = async () => {
    if (!extraModalOrder || !extraDesc || !extraValue) return;
    setIsAddingExtra(true);
    try {
      const value = parseFloat(extraValue.replace(',', '.'));
      const orderRef = doc(db, 'pedidos', extraModalOrder.id);
      
      const newItem = {
        id: `extra_${Date.now()}`,
        name: `EXTRA: ${extraDesc.toUpperCase()}`,
        qtd: 1,
        price: value,
        isExtra: true
      };

      await updateDoc(orderRef, {
        itens: [...extraModalOrder.itens, newItem],
        total: extraModalOrder.total + value
      });

      showToast("Item extra adicionado!", "success");
      setExtraModalOrder(null);
      setExtraDesc('');
      setExtraValue('');
    } catch (error) {
      showToast("Erro ao adicionar extra", "error");
    } finally {
      setIsAddingExtra(false);
    }
  };

  const handleMultiRoute = () => {
    if (orders.length === 0) return;
    
    const origin = `${LOJA_COORDS.lat},${LOJA_COORDS.lng}`;
    const destination = origin;

    const waypoints = orders.map(o => {
      if (o.cliente.coords) return `${o.cliente.coords.lat},${o.cliente.coords.lng}`;
      return encodeURIComponent(o.cliente.endereco || '');
    }).join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=motorcycle`;
    
    window.open(url, '_blank');
    showToast("Rota otimizada gerada!", "success");
  };

  const finishDeliveryWithGPS = async (order: Order) => {
    setLoadingOrderId(order.id);
    
    if (!navigator.geolocation) {
      showToast("GPS não suportado neste aparelho", "error");
      setLoadingOrderId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const targetLat = order.cliente.coords?.lat;
        const targetLng = order.cliente.coords?.lng;

        if (targetLat && targetLng) {
          const distance = calculateDistance(latitude, longitude, targetLat, targetLng);

          if (distance > 0.5) {
            showToast(`Você está a ${(distance * 1000).toFixed(0)}m do destino. Aproxime-se mais!`, "error");
            setLoadingOrderId(null);
            return;
          }
        }

        try {
          const orderRef = doc(db, 'pedidos', order.id);
          await updateDoc(orderRef, {
            status: OrderStatus.COMPLETED,
            finalizadoEm: serverTimestamp(),
            gpsConfirmado: !!targetLat
          });
          
          if (driver) {
             const remaining = orders.filter(o => o.id !== order.id).length;
             if (remaining === 0) {
                await updateDoc(doc(db, 'motoboys', driver.id), { status: 'idle' });
             }
          }

          showToast("Entrega Finalizada!", "success");
        } catch (e) {
          showToast("Erro ao atualizar pedido", "error");
        }
        setLoadingOrderId(null);
      },
      () => {
        showToast("Ative o GPS para finalizar", "error");
        setLoadingOrderId(null);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 bg-orange-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20">
          <Bike size={40} className="text-black" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Entregador</h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-center">Acesse sua conta para ver as rotas</p>
        
        <div className="w-full max-w-xs space-y-4">
          <input 
            type="password" 
            placeholder="DIGITE SEU PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full bg-zinc-900 border border-white/5 p-6 rounded-2xl text-center text-2xl font-black tracking-[0.5em] text-white outline-none focus:border-orange-500 transition-all"
          />
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-6 bg-orange-500 text-black rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {isLoggingIn ? <Loader2 className="animate-spin" /> : "ENTRAR NO PAINEL"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      <header className="glass sticky top-0 z-40 px-6 py-8 border-b border-white/5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-orange-500">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">{driver.name}</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-3 bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* Resumo do Dia */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] space-y-2">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Entregas Hoje</p>
            <p className="text-3xl font-black text-white italic">0</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] space-y-2">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ganhos Estimados</p>
            <p className="text-3xl font-black text-emerald-500 italic">R$ 0,00</p>
          </div>
        </div>

        {/* Ações de Rota */}
        {orders.length > 0 && (
          <button 
            onClick={handleMultiRoute}
            className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Navigation size={20} fill="white" /> GERAR ROTA OTIMIZADA ({orders.length})
          </button>
        )}

        {/* Lista de Pedidos */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] px-2">Pedidos em Rota</h2>
          
          {orders.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
              <MapPinned size={48} className="text-zinc-700" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido para entrega</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden"
                >
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Comanda #{order.numeroComanda}</span>
                      <h3 className="text-lg font-black text-white uppercase italic">{order.cliente.nome}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total a Receber</p>
                      <p className="text-xl font-black text-emerald-500 italic leading-none">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {/* Endereço Completo */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-black text-sm leading-tight uppercase italic">
                          {order.cliente.endereco}, {order.cliente.numeroCasa || 'S/N'}
                        </p>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase mt-1 tracking-widest">
                          {order.cliente.bairro} {order.cliente.cep ? `• CEP: ${order.cliente.cep}` : ''}
                        </p>
                        {order.cliente.referencia && (
                          <div className="mt-2 flex items-center gap-2 text-orange-500/80">
                            <Info size={12} />
                            <p className="text-[9px] font-black uppercase italic">Ref: {order.cliente.referencia}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Contato e WhatsApp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                          <Phone size={20} />
                        </div>
                        <p className="text-white font-black text-sm italic">{order.cliente.whatsapp || order.customerPhone}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const phone = (order.cliente.whatsapp || order.customerPhone).replace(/\D/g, '');
                          const text = encodeURIComponent(`Oi ${order.cliente.nome}! Sou o motoboy da SK BURGERS, estou chegando com seu pedido! 🛵🔥`);
                          window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
                        }}
                        className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all"
                      >
                        <MessageCircle size={20} fill="currentColor" />
                      </button>
                    </div>

                    {/* Forma de Pagamento */}
                    <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                        {order.pagamento === 'PIX' ? <Smartphone size={20} /> : 
                         order.pagamento === 'DINHEIRO' ? <Banknote size={20} /> : 
                         <CreditCard size={20} />}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Forma de Pagamento</p>
                        <p className="text-white font-black text-xs uppercase italic">{order.pagamento}</p>
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Package size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Conferência de Itens</span>
                      </div>
                      <div className="bg-zinc-800/30 rounded-2xl p-4 space-y-2">
                        {order.itens.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase">
                            <span className="text-zinc-400">{item.qtd}x <span className="text-white">{item.name}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Observação do Cliente */}
                    {order.cliente.observacao && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Observação do Cliente</p>
                          <p className="text-white font-bold text-[10px] leading-tight uppercase italic">{order.cliente.observacao}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-black/20 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.cliente.endereco || '')}`, '_blank')}
                        className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Navigation size={16} /> GPS
                      </button>
                      <button 
                        onClick={() => setExtraModalOrder(order)}
                        className="flex-1 py-4 bg-zinc-800 text-orange-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-orange-500/20"
                      >
                        <Plus size={16} /> EXTRA
                      </button>
                    </div>
                    <button 
                      onClick={() => finishDeliveryWithGPS(order)}
                      disabled={loadingOrderId === order.id}
                      className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      {loadingOrderId === order.id ? <Loader2 className="animate-spin" /> : <><CheckCircle size={16} /> FINALIZAR ENTREGA</>}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Histórico Simulado */}
      <div className="p-6">
        <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
          <Clock size={32} className="text-zinc-800" />
          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em]">Histórico de hoje indisponível</p>
        </div>
      </div>
      {/* Modal Extra */}
      <AnimatePresence>
        {extraModalOrder && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <header className="p-8 border-b border-white/5 flex justify-between items-center">
                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Adicionar Extra</h4>
                <button onClick={() => setExtraModalOrder(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </header>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">O que o cliente pediu?</label>
                    <input 
                      type="text" 
                      placeholder="EX: COCA-COLA LATA"
                      value={extraDesc}
                      onChange={e => setExtraDesc(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-bold focus:border-orange-500 outline-none uppercase text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Valor do Item (R$)</label>
                    <input 
                      type="text" 
                      placeholder="0,00"
                      value={extraValue}
                      onChange={e => setExtraValue(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-xl focus:border-orange-500 outline-none mt-1"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddExtra}
                  disabled={isAddingExtra || !extraDesc || !extraValue}
                  className="w-full bg-orange-500 text-black font-black py-6 rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-30"
                >
                  {isAddingExtra ? <Loader2 className="animate-spin mx-auto" /> : "CONFIRMAR ACRÉSCIMO"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Driver;
