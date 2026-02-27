import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, Target, DollarSign, AlertCircle, ShoppingCart, 
  Sparkles, Loader2, MessageSquare, ShieldCheck 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Order, StoreConfig, PaymentMethod } from '../../types';
import { DIARIA_MOTOBOY, DIARIA_CHAPEIRO, GATEWAY_FEES, STAFF_COSTS } from '../../constants';
import { useToast } from '../ToastContext';
import { generateCEOInsights } from '../../services/geminiService';
import { formatCurrency } from '../../utils';

interface Props {
  orders: Order[];
  config: StoreConfig;
}

const AdminDashboard: React.FC<Props> = ({ orders, config }) => {
  const { showToast } = useToast();
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const stats = useMemo(() => {
    const faturamentoBruto = orders.reduce((acc, o) => acc + o.total, 0);
    
    // Cálculo de taxas realistas usando GATEWAY_FEES
    const taxaTotal = orders.reduce((acc, o) => {
        const feeRate = GATEWAY_FEES[o.pagamento] || 0;
        return acc + (o.total * feeRate);
    }, 0);
    
    const cmvTotal = orders.reduce((acc, o) => acc + (o.total * 0.35), 0); // Média de 35% de custo de insumo
    const custosFixosDiarios = STAFF_COSTS.MOTOBOY + STAFF_COSTS.CHAPEIRO + (STAFF_COSTS.APOIO || 0);
    const lucroLiquido = (faturamentoBruto - taxaTotal) - cmvTotal - custosFixosDiarios;
    
    const metaDiaria = config.dailyGoal || 400;
    const progresso = (faturamentoBruto / metaDiaria) * 100;

    return {
      bruto: faturamentoBruto,
      liquido: lucroLiquido,
      pedidos: orders.length,
      progresso,
      cmv: cmvTotal,
      taxas: taxaTotal
    };
  }, [orders, config.dailyGoal]);

  // Integração com a Inteligência Artificial
  useEffect(() => {
    const fetchInsights = async () => {
      if (orders.length > 0) {
        setLoadingInsights(true);
        try {
          const result = await generateCEOInsights(orders);
          setInsights(result.insights || []);
        } catch (e) {
          console.error("Erro ao gerar insights IA");
        } finally {
          setLoadingInsights(false);
        }
      }
    };
    fetchInsights();
  }, [orders.length]);

  // Função para fechar o caixa e mandar no WhatsApp
  const handleFinishShift = () => {
    const now = new Date().toLocaleDateString('pt-BR');
    let msg = `📊 *RELATÓRIO SK BURGERS - ${now}*\n\n`;
    msg += `💰 *BRUTO:* ${formatCurrency(stats.bruto)}\n`;
    msg += `📉 *TAXAS:* ${formatCurrency(stats.taxas)}\n`;
    msg += `🍔 *INSUMOS (CMV):* ${formatCurrency(stats.cmv)}\n`;
    msg += `👥 *DIÁRIAS:* ${formatCurrency(STAFF_COSTS.MOTOBOY + STAFF_COSTS.CHAPEIRO + (STAFF_COSTS.APOIO || 0))}\n`;
    msg += `──────────────────\n`;
    msg += `💵 *LUCRO REAL:* ${formatCurrency(stats.liquido)}\n`;
    msg += `🎯 *META:* ${stats.progresso.toFixed(1)}%\n\n`;
    msg += `📦 Pedidos: ${stats.pedidos}\n`;

    const whatsappUrl = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl);
    showToast("Relatório de fechamento gerado!", "success");
  };

  const chartData = [
    { name: 'Bruto', value: stats.bruto },
    { name: 'Líquido', value: Math.max(0, stats.liquido) },
    { name: 'Meta', value: config.dailyGoal },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* Top Bar de Ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Dashboard Pro</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Gestão Sênior • SK Burgers</p>
        </div>
        <button 
          onClick={handleFinishShift}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:bg-yellow-500 hover:scale-105 active:scale-95"
        >
          <MessageSquare size={16} /> Fechar Caixa & WhatsApp
        </button>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Faturamento Bruto" value={formatCurrency(stats.bruto)} icon={DollarSign} />
        <StatCard title="Lucro Líquido" value={formatCurrency(stats.liquido)} icon={TrendingUp} highlight />
        <StatCard title="Total Pedidos" value={stats.pedidos.toString()} icon={ShoppingCart} />
        <StatCard title="Meta Diária" value={formatCurrency(config.dailyGoal)} icon={Target} />
      </div>

      {/* Barra de Progresso da Meta */}
      <div className="glass p-10 rounded-[3rem]">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-white font-black text-2xl uppercase italic leading-none">Progresso da Noite</h3>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Manaus/AM • Objetivo R$ {config.dailyGoal}</p>
          </div>
          <div className="text-right">
            <span className="text-yellow-500 font-black text-5xl italic leading-none">{(stats.progresso || 0).toFixed(0)}%</span>
          </div>
        </div>
        <div className="h-6 bg-black/60 rounded-full p-1.5 border border-white/5 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
            style={{ width: `${Math.min(stats.progresso || 0, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Performance */}
        <div className="lg:col-span-2 glass p-8 rounded-[3rem] min-h-[450px] flex flex-col">
          <h3 className="text-white font-black text-lg uppercase mb-8 italic flex items-center gap-2">
            <ShieldCheck size={20} className="text-yellow-500" /> Comparativo de Performance
          </h3>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#ffffff03' }} contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Líquido' ? '#10b981' : entry.name === 'Meta' ? '#333' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights da IA (Gemini) */}
        <div className="bg-yellow-500 p-8 rounded-[3rem] text-black h-full flex flex-col relative overflow-hidden">
          <h3 className="font-black text-2xl uppercase italic leading-none mb-6 flex items-center gap-2">
            <Sparkles size={20} /> CEO INSIGHTS
          </h3>
          
          {loadingInsights ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest text-center">Analisando dados do SK Burgers...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.length > 0 ? insights.map((insight, i) => (
                <div key={i} className="bg-black/10 p-4 rounded-2xl border border-black/5">
                  <h5 className="font-black text-[10px] uppercase tracking-widest mb-1">{insight.title}</h5>
                  <p className="text-[11px] leading-tight font-bold opacity-80">{insight.description}</p>
                  <p className="text-[9px] mt-2 font-black bg-black/20 p-2 rounded-lg italic uppercase">{insight.action}</p>
                </div>
              )) : (
                <p className="text-sm font-bold opacity-60 italic">Aguardando mais pedidos para gerar análise...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente Interno de Card de Estatística
const StatCard = ({ title, value, icon: Icon, highlight }: any) => (
  <div className={`${highlight ? 'bg-yellow-500 text-black' : 'glass text-white'} p-8 rounded-[2.5rem] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
    <div className={`${highlight ? 'bg-black/10' : 'bg-white/5'} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
      <Icon size={28} />
    </div>
    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${highlight ? 'text-black/60' : 'text-zinc-500'}`}>{title}</p>
    <h4 className="text-3xl font-black italic tracking-tighter">{value}</h4>
  </div>
);

export default AdminDashboard;
