import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ghost, Search, Loader2, Calendar, UserX, MessageCircle, ArrowLeft
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MissingCustomer, Order } from '../../types';

const AdminMarketing: React.FC = () => {
  const [customers, setCustomers] = useState<MissingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const ordersRef = collection(db, 'pedidos');
        const q = query(ordersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const customerMap: Record<string, { name: string, lastDate: any, count: number }> = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Order;
          const phone = data.customerPhone;
          if (!customerMap[phone]) {
            customerMap[phone] = { 
              name: data.customerName, 
              lastDate: data.createdAt, 
              count: 1 
            };
          } else {
            customerMap[phone].count += 1;
          }
        });

        const now = new Date();
        const missing: MissingCustomer[] = Object.entries(customerMap).map(([phone, data]) => {
          const lastDate = data.lastDate?.toDate ? data.lastDate.toDate() : new Date(data.lastDate);
          const diffTime = Math.abs(now.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            name: data.name,
            phone,
            lastOrderDate: lastDate,
            daysSince: diffDays,
            totalOrders: data.count
          };
        }).filter(c => c.daysSince >= 7) // Only customers who haven't ordered in at least 7 days
        .sort((a, b) => b.daysSince - a.daysSince);

        setCustomers(missing);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(filterTerm.toLowerCase()) || 
      c.phone.includes(filterTerm)
    );
  }, [customers, filterTerm]);

  const handleSendMimo = (c: MissingCustomer) => {
    const firstName = c.name.split(' ')[0].toUpperCase();
    
    // Texto persuasivo: Foco na saudade e no benefício imediato
    const text = `Oi ${firstName}! 🔥 Aqui é da SK BURGERS.\n\nNotamos um vazio na nossa chapa (e no nosso coração) há ${c.daysSince} dias. 😢\n\nPra você voltar com tudo hoje, liberamos o cupom: *VOLTOU* que te dá *FRETE GRÁTIS*! 🍔🍟\n\nBora matar essa fome? Clique aqui: [SEU_LINK_DE_PEDIDO]`;
    
    // Garante o formato internacional do número (DDI + DDD + Numero)
    let targetPhone = c.phone.replace(/\s+/g, '');
    if (targetPhone.length <= 11) targetPhone = `55${targetPhone}`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Marketing CRM</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Recuperação de Base e Lealdade</p>
        </div>
        
        {/* Card de Resumo de Clientes Perdidos */}
        <div className="bg-zinc-900 border border-white/5 p-4 rounded-3xl flex items-center gap-6 shadow-2xl">
           <div className="h-12 w-12 bg-orange-500/20 rounded-2xl flex items-center justify-center">
              <Ghost size={24} className="text-orange-500 animate-pulse" />
           </div>
           <div>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Clientes em Abandono</p>
              <p className="text-2xl font-black text-white">{customers.length}</p>
           </div>
        </div>
      </header>

      {/* Barra de Busca Estilizada */}
      <div className="group bg-zinc-900/50 p-1 rounded-[2.2rem] border border-white/5 focus-within:border-orange-500/40 transition-all duration-300">
        <div className="flex items-center gap-4 px-6 py-3">
          <Search className="text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={20} />
          <input 
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
            placeholder="PESQUISAR CLIENTE PELO NOME OU WHATSAPP..."
            className="bg-transparent w-full text-white font-black outline-none placeholder:text-zinc-700 uppercase text-xs tracking-widest"
          />
        </div>
      </div>

      <div className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
        {loading ? (
           <div className="p-32 flex flex-col items-center">
              <Loader2 size={40} className="animate-spin text-orange-500 mb-6" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Cruzando dados de vendas...</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Perfil do Cliente</th>
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Última Compra</th>
                  <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Status de Retenção</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Ação Direta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((c) => (
                  <tr key={c.phone} className="hover:bg-white/[0.03] transition-all group">
                    <td className="p-6">
                      <div className="font-black text-white uppercase text-sm">{c.name}</div>
                      <div className="text-[10px] text-zinc-500 font-bold mt-0.5">{c.phone}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs">
                        <Calendar size={14} className="text-zinc-700" />
                        {c.lastOrderDate.toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[9px] text-zinc-600 font-black uppercase mt-1">Já pediu {c.totalOrders}x na SK</div>
                    </td>
                    <td className="p-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-tighter ${
                        c.daysSince > 60 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                        c.daysSince > 30 ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                      }`}>
                        <UserX size={12} strokeWidth={3} /> {c.daysSince} DIAS SUMIDO
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => handleSendMimo(c)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/10 active:scale-95 mx-auto"
                      >
                        <MessageCircle size={16} fill="black" /> Enviar Mimo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMarketing;
