import React, { useState } from 'react';
import { InventoryItem, Product } from '../../types';
import { AlertTriangle, Search, Plus, X, DollarSign, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from '../ToastContext';
import { formatCurrency } from '../../utils';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Props {
  inventory: InventoryItem[];
  products: Product[];
  onSave: (item: Partial<InventoryItem>) => void;
  onUpdateStock: (id: string, newQty: number) => void;
}

const AdminInventory: React.FC<Props> = ({ inventory, products, onSave, onUpdateStock }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  
  const handleOpenModal = (item?: InventoryItem) => {
    setEditingItem(item || { name: '', unit: 'un', quantity: 0, minQuantity: 5, costPrice: 0 });
    setIsModalOpen(true);
  };

  // Função crucial: Auditoria de Perdas em Manaus
  const handleUpdatePhysicalCount = async (id: string, count: number) => {
    try {
      const itemRef = doc(db, 'inventory', id);
      await updateDoc(itemRef, { physicalCount: count });
      showToast("Auditoria física registrada com sucesso!", "success");
    } catch (e) { 
      showToast("Erro ao sincronizar auditoria", "error"); 
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Kalluan, remover este insumo pode afetar o cálculo de CMV dos burgers. Confirmar?")) {
        try {
            await deleteDoc(doc(db, 'inventory', id));
            showToast("Insumo removido do almoxarifado", "info");
        } catch (e) { 
            showToast("Erro na exclusão do banco de dados", "error"); 
        }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onSave({ ...editingItem, name: editingItem.name?.toUpperCase() });
      setIsModalOpen(false);
    }
  };

  const filtered = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header com estilo SK Burgers */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h3 className="text-white font-black text-3xl uppercase italic tracking-tighter leading-none">Almoxarifado</h3>
           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">Gestão de Insumos e Controle de Desperdício</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-orange-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20">
           <Plus size={18} /> Novo Insumo
        </button>
      </header>

      {/* Busca Pro */}
      <div className="glass p-4 rounded-[2rem] flex items-center gap-4 focus-within:border-orange-500/50 transition-all border border-white/5">
          <Search size={20} className="text-zinc-600" />
          <input 
             type="text" 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="bg-transparent border-none outline-none text-white font-black uppercase text-xs w-full placeholder:text-zinc-700" 
             placeholder="Buscar ingrediente para auditoria..." 
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Tabela de Auditoria */}
        <div className="lg:col-span-3 glass rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/40 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Ingrediente</th>
                  <th className="px-10 py-6">Sistêmico / Físico</th>
                  <th className="px-10 py-6">Status Auditoria</th>
                  <th className="px-10 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-400">
                {filtered.map((item) => {
                  const isLow = item.quantity <= item.minQuantity;
                  const hasWaste = item.physicalCount !== undefined && item.physicalCount !== item.quantity;
                  
                  return (
                    <tr key={item.id} className={`group transition-all ${hasWaste ? 'bg-yellow-500/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                      <td className="px-10 py-6">
                         <span className="text-white font-black uppercase text-xs block italic tracking-tighter">{item.name}</span>
                         <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Custo: {formatCurrency(item.costPrice)} / {item.unit}</span>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-4">
                           <div className="text-center min-w-[3rem]">
                              <span className={`text-sm font-black italic block ${isLow ? 'text-red-500' : 'text-zinc-300'}`}>{item.quantity}</span>
                              <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">APP</span>
                           </div>
                           <div className="w-px h-8 bg-white/10"></div>
                           <input 
                              type="number" 
                              value={item.physicalCount ?? item.quantity ?? 0}
                              onChange={(e) => handleUpdatePhysicalCount(item.id, parseFloat(e.target.value))}
                              className="w-20 bg-black/40 border border-white/10 rounded-xl p-2 text-center text-xs font-black text-orange-500 outline-none focus:border-orange-500"
                           />
                         </div>
                      </td>
                      <td className="px-10 py-6">
                         {hasWaste ? (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[8px] font-black uppercase border bg-yellow-500/10 border-yellow-500/30 text-yellow-500 animate-pulse">
                               <ShieldAlert size={12} /> Divergência
                            </div>
                         ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[8px] font-black uppercase border bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                               Sincronizado
                            </div>
                         )}
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleOpenModal(item)} className="p-3 bg-white/5 rounded-xl hover:text-white transition-all"><Plus size={14}/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-3 bg-white/5 rounded-xl hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Lateral de Insights de Perda */}
        <div className="space-y-6">
           <div className="bg-yellow-500 p-8 rounded-[3rem] text-black shadow-xl shadow-yellow-500/20">
              <AlertTriangle size={32} className="mb-4" />
              <h4 className="font-black text-xl uppercase italic leading-none mb-2">Monitor de Desperdício</h4>
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest leading-relaxed">Diferença detectada entre venda sistêmica e estoque físico.</p>
              
              <div className="mt-6 space-y-3">
                  {inventory.filter(i => i.physicalCount !== undefined && i.physicalCount !== i.quantity).map(i => {
                    const diff = (i.physicalCount || 0) - i.quantity;
                    return (
                      <div key={i.id} className="bg-black/10 p-4 rounded-2xl border border-black/5 flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase truncate max-w-[80px] italic">{i.name}</span>
                         <span className={`text-[10px] font-black ${diff < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                           {diff > 0 ? '+' : ''}{diff.toFixed(2)} {i.unit}
                         </span>
                      </div>
                    );
                  })}
                  {inventory.every(i => i.physicalCount === i.quantity || i.physicalCount === undefined) && (
                    <p className="text-[10px] font-black italic opacity-40">Tudo em ordem no estoque.</p>
                  )}
              </div>
           </div>
        </div>
      </div>

      {/* Modal - Cadastro de Insumo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl">
                <header className="p-10 border-b border-white/5 flex justify-between items-center">
                    <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Gestão de Insumo</h4>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
                </header>
                <form onSubmit={handleFormSubmit} className="p-10 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Descrição</label>
                        <input type="text" value={editingItem?.name ?? ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white font-bold focus:border-orange-500 outline-none uppercase" placeholder="EX: PÃO BRIOCHE" required />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Unidade</label>
                            <input type="text" value={editingItem?.unit ?? ''} onChange={e => setEditingItem({...editingItem, unit: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white font-bold focus:border-orange-500 outline-none uppercase" placeholder="KG, UN, G" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Mínimo</label>
                            <input type="number" value={editingItem?.minQuantity ?? 0} onChange={e => setEditingItem({...editingItem, minQuantity: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 text-white font-bold focus:border-orange-500 outline-none" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Preço de Custo (R$)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input type="number" step="0.01" value={editingItem?.costPrice ?? 0} onChange={e => setEditingItem({...editingItem, costPrice: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-5 pl-12 pr-6 text-white font-bold focus:border-orange-500 outline-none" required />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-orange-500 text-black font-black py-6 rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mt-4 shadow-lg shadow-orange-500/20">
                        SALVAR NO ESTOQUE
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
