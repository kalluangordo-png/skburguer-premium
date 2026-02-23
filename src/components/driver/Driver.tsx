import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, CheckCircle, Clock, 
  Navigation, Loader2, LogOut, MapPinned,
  ChevronRight, Bike, DollarSign
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
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Pedido #{order.numeroComanda}</span>
                      <h3 className="text-lg font-black text-white uppercase italic">{order.cliente.nome}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Taxa</p>
                      <p className="text-lg font-black text-emerald-500 italic">{formatCurrency(order.taxaEntrega)}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">{order.cliente.endereco}</p>
                        <p className="text-zinc-500 text-[10px] font-black uppercase mt-1 tracking-widest">{order.cliente.bairro}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                        <Phone size={20} />
                      </div>
                      <p className="text-white font-bold text-sm">{order.cliente.whatsapp || order.customerPhone}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-black/20 flex gap-3">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.cliente.endereco || '')}`, '_blank')}
                      className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Navigation size={16} /> GPS
                    </button>
                    <button 
                      onClick={() => finishDeliveryWithGPS(order)}
                      disabled={loadingOrderId === order.id}
                      className="flex-[2] py-4 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      {loadingOrderId === order.id ? <Loader2 className="animate-spin" /> : <><CheckCircle size={16} /> FINALIZAR</>}
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
    </div>
  );
};

export default Driver;
