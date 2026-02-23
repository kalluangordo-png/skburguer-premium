import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Flame, Bike, Clock, CheckCircle2, X, Plus, Trash2, Loader2
} from 'lucide-react';
import { doc, writeBatch, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, OrderStatus, Driver } from '../../types';
import { useToast } from '../ToastContext';
import { formatCurrency } from '../../utils';

interface AdminDispatchProps {
  orders: Order[];
  drivers: Driver[];
}

const AdminDispatch: React.FC<AdminDispatchProps> = ({ orders = [], drivers = [] }) => {
  const [comandaInput, setComandaInput] = useState('');
  const [now, setNow] = useState(new Date());
  
  const [batchSelection, setBatchSelection] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchDriverId, setBatchDriverId] = useState('');

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPin, setNewDriverPin] = useState('');
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // Atualiza a cada 30s
    return () => clearInterval(timer);
  }, []);

  const prepOrders = useMemo(() => 
    orders.filter(o => o.status === OrderStatus.READY && (comandaInput === '' || o.numeroComanda.includes(comandaInput)))
    .sort((a, b) => (a.dataCriacao?.seconds || 0) - (b.dataCriacao?.seconds || 0)), 
  [orders, comandaInput]);

  const driversOnStreet = useMemo(() => {
    const groups: Record<string, { name: string, orders: Order[], totalValue: number }> = {};
    orders.filter(o => o.status === OrderStatus.DELIVERING).forEach(order => {
      const dId = order.entregadorId || 'unknown';
      if (!groups[dId]) groups[dId] = { name: order.entregadorNome || 'Motoboy', orders: [], totalValue: 0 };
      groups[dId].orders.push(order);
      groups[dId].totalValue += order.total;
    });
    return Object.entries(groups).map(([id, data]) => ({ id, ...data }));
  }, [orders]);

  const getWaitTime = (readyTime: any) => {
    if (!readyTime) return 0;
    const start = readyTime?.toDate ? readyTime.toDate() : new Date(readyTime);
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  };

  const handleBatchDispatch = async () => {
    if (!batchDriverId) return showToast("Selecione um motoboy!", "error");
    
    try {
      const driver = drivers.find(d => d.id === batchDriverId);
      const batch = writeBatch(db);

      batch.update(doc(db, 'motoboys', batchDriverId), { status: 'busy' });

      batchSelection.forEach(orderId => {
        batch.update(doc(db, 'pedidos', orderId), {
          status: OrderStatus.DELIVERING,
          entregadorId: batchDriverId,
          entregadorNome: driver?.name || 'Motoboy',
          deliveryStart: serverTimestamp()
        });
      });

      await batch.commit();
      showToast(`${batchSelection.length} pedidos despachados para ${driver?.name}!`, "success");
      setBatchSelection([]);
      setIsBatchModalOpen(false);
      setBatchDriverId('');
    } catch (e) {
      showToast("Erro no despacho.", "error");
    }
  };

  const handleFreeDriver = async (driverId: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'motoboys', driverId), { status: 'idle' });
      
      const ordersToComplete = orders.filter(o => o.entregadorId === driverId && o.status === OrderStatus.DELIVERING);
      ordersToComplete.forEach(o => {
        batch.update(doc(db, 'pedidos', o.id), { status: OrderStatus.DELIVERED });
      });

      await batch.commit();
      showToast("Rota concluída!", "success");
    } catch (e) {
      showToast("Erro ao liberar motoboy.", "error");
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPin) return;
    setIsAddingDriver(true);
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'motoboys', id), {
        id,
        name: newDriverName.toUpperCase(),
        pin: newDriverPin,
        status: 'idle'
      });
      setNewDriverName('');
      setNewDriverPin('');
      showToast("Motoboy cadastrado!", "success");
    } catch (e) {
      showToast("Erro ao cadastrar.", "error");
    } finally {
      setIsAddingDriver(false);
    }
  };

  const handleRemoveDriver = async (id: string) => {
    if (!window.confirm("Remover motoboy da equipe?")) return;
    try {
      await deleteDoc(doc(db, 'motoboys', id));
      showToast("Motoboy removido.", "info");
    } catch (e) {
      showToast("Erro ao remover.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Central de Despacho</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Gestão de Rotas Manaus • SK PRO</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
             <button 
               onClick={() => setIsTeamModalOpen(true)}
               className="bg-zinc-900 border border-white/5 hover:border-blue-500/50 text-white px-5 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
             >
               <Users size={16} className="text-blue-500" /> Equipe
             </button>
             <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                    type="text" 
                    value={comandaInput}
                    onChange={e => setComandaInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 text-white text-xs font-bold rounded-xl pl-9 py-3 outline-none focus:border-orange-500 transition-all uppercase"
                    placeholder="Filtrar comanda..."
                />
             </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna: Aguardando Saída */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-[2.8rem] p-8 flex flex-col h-[650px] shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Flame size={16} className="text-orange-500" /> No Balcão
                  </h3>
                  <span className="bg-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-full">{prepOrders.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
                  {prepOrders.map(order => {
                      const isSelected = batchSelection.includes(order.id);
                      const waitTime = getWaitTime(order.finalizadoEm);
                      return (
                          <div 
                            key={order.id}
                            onClick={() => setBatchSelection(prev => isSelected ? prev.filter(id => id !== order.id) : [...prev, order.id])}
                            className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all ${isSelected ? 'bg-orange-500/10 border-orange-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                          >
                              <div className="flex justify-between items-center">
                                  <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xl font-black italic ${isSelected ? 'text-orange-500' : 'text-white'}`}>
                                          #{order.numeroComanda}
                                        </span>
                                        {waitTime > 10 && <Clock size={12} className="text-red-500 animate-pulse" />}
                                      </div>
                                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1 tracking-widest truncate max-w-[140px]">
                                        {order.cliente.bairro || 'Sem Bairro'}
                                      </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] font-black text-white">{formatCurrency(order.total)}</span>
                                    <p className="text-[8px] font-bold text-zinc-600 uppercase">{waitTime}m atrás</p>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>

              <button 
                disabled={batchSelection.length === 0}
                onClick={() => setIsBatchModalOpen(true)}
                className="mt-6 w-full bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-10 transition-all hover:bg-orange-500 hover:text-white shadow-xl"
              >
                Despachar Lote ({batchSelection.length})
              </button>
          </div>

          {/* Coluna: Motoboys na Rua */}
          <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-[2.8rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Bike size={18} className="text-blue-500" /> Em Atividade
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[520px] pr-2 no-scrollbar">
                  {driversOnStreet.map(group => (
                      <div key={group.id} className="bg-black/60 border border-white/5 p-6 rounded-[2.5rem] flex flex-col hover:border-blue-500/30 transition-all shadow-lg">
                          <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-blue-500 text-black flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20">
                                      {group.name.charAt(0)}
                                  </div>
                                  <div>
                                      <h4 className="font-black text-white uppercase text-sm italic">{group.name}</h4>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{group.orders.length} pedidos</p>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                        <p className="text-[9px] text-emerald-500 font-black">{formatCurrency(group.totalValue)}</p>
                                      </div>
                                  </div>
                              </div>
                              <button 
                                onClick={() => handleFreeDriver(group.id)}
                                className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-500 transition-all"
                                title="Concluir Rota"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                          </div>
                          
                          <div className="space-y-2">
                              {group.orders.map(o => (
                                  <div key={o.id} className="flex justify-between items-center text-[10px] p-3 bg-white/5 rounded-xl border border-white/5">
                                      <span className="font-black text-blue-400 italic">#{o.numeroComanda}</span>
                                      <span className="text-zinc-500 uppercase font-black truncate max-w-[80px]">{o.cliente.bairro || 'Centro'}</span>
                                      <span className="font-black text-zinc-300">{formatCurrency(o.total)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                  {driversOnStreet.length === 0 && (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-20">
                      <Bike size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest mt-4">Nenhum motoboy em rota</p>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Modal: Despacho em Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl">
            <header className="p-10 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Despachar Lote</h4>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
            </header>
            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Selecionar Motoboy</label>
                <div className="grid grid-cols-1 gap-3">
                  {drivers.filter(d => d.status === 'idle').map(driver => (
                    <button 
                      key={driver.id}
                      onClick={() => setBatchDriverId(driver.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${batchDriverId === driver.id ? 'bg-orange-500 border-orange-400 text-black' : 'bg-zinc-900 border-white/5 text-white hover:border-white/20'}`}
                    >
                      <span className="font-black uppercase text-xs">{driver.name}</span>
                    </button>
                  ))}
                  {drivers.filter(d => d.status === 'idle').length === 0 && (
                    <p className="text-xs text-zinc-600 italic text-center py-4">Nenhum motoboy disponível agora.</p>
                  )}
                </div>
              </div>
              <button 
                onClick={handleBatchDispatch}
                disabled={!batchDriverId}
                className="w-full bg-orange-500 text-black font-black py-6 rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mt-4 shadow-lg shadow-orange-500/20 disabled:opacity-30"
              >
                CONFIRMAR SAÍDA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Equipe */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl">
            <header className="p-10 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Equipe de Entrega</h4>
              <button onClick={() => setIsTeamModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
            </header>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <form onSubmit={handleAddDriver} className="space-y-6">
                <h5 className="text-xs font-black uppercase tracking-widest text-orange-500">Novo Motoboy</h5>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    value={newDriverName}
                    onChange={e => setNewDriverName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white font-bold focus:border-orange-500 outline-none uppercase text-xs"
                    placeholder="NOME COMPLETO"
                    required
                  />
                  <input 
                    type="password" 
                    value={newDriverPin}
                    onChange={e => setNewDriverPin(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white font-black tracking-[0.5em] focus:border-orange-500 outline-none text-xs"
                    placeholder="PIN 4 DÍGITOS"
                    maxLength={4}
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isAddingDriver}
                    className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                  >
                    {isAddingDriver ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'ADICIONAR À EQUIPE'}
                  </button>
                </div>
              </form>

              <div className="space-y-6">
                <h5 className="text-xs font-black uppercase tracking-widest text-zinc-500">Membros Ativos</h5>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {drivers.map(driver => (
                    <div key={driver.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-xs font-black text-white uppercase italic">{driver.name}</p>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${driver.status === 'idle' ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {driver.status === 'idle' ? 'Disponível' : 'Em Rota'}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveDriver(driver.id)}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDispatch;
