import React, { useState, useEffect } from 'react';
import { 
  Save, Loader2, DatabaseBackup, Rocket, CloudRain, AlertOctagon, Power, 
  Target, Hash, IceCream, Lock, Eye, EyeOff 
} from 'lucide-react';
import { StoreConfig } from '../../types';
import { useToast } from '../ToastContext';
import { seedInitialData } from '../../services/seedService';

interface AdminConfigProps {
  config: StoreConfig;
  onSave: (config: StoreConfig) => Promise<void>;
  onFixAddress: () => Promise<void>;
  isSaving: boolean;
}

const AdminConfig: React.FC<AdminConfigProps> = ({ config, onSave, onFixAddress, isSaving }) => {
  const [localConfig, setLocalConfig] = useState<StoreConfig>(config);
  const [showPins, setShowPins] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(localConfig);
  };

  const handleSeed = async () => {
    if (!window.confirm("Kalluan, isso irá resetar Insumos e Produtos. Tem certeza?")) return;
    setIsSeeding(true);
    try {
      await seedInitialData();
      showToast("Sistema Restaurado com Sucesso!", "success");
    } catch (e) {
      showToast("Erro na restauração.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header com Ações Rápidas */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Configurações SK PRO</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Gestão de Ambiente e Segurança</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex-1 md:flex-none bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-orange-500/20 disabled:opacity-30"
            >
              {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14}/>} Resetar Base
            </button>
            <button 
              type="button"
              onClick={onFixAddress}
              disabled={isSaving}
              className="flex-1 md:flex-none bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-emerald-500/20 disabled:opacity-30"
            >
              <Rocket size={14}/> Sync Frete
            </button>
        </div>
      </div>

      {/* Toggles de Modo de Operação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, rainMode: !localConfig.rainMode})}
            className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${localConfig.rainMode ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
          >
            <CloudRain size={32} className={localConfig.rainMode ? 'animate-bounce' : ''} />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase">Modo Chuva</p>
              <p className="text-[8px] font-bold opacity-60 uppercase">{localConfig.rainMode ? 'Atraso Ativo' : 'Tempo Normal'}</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, overloadMode: !localConfig.overloadMode})}
            className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${localConfig.overloadMode ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
          >
            <AlertOctagon size={32} className={localConfig.overloadMode ? 'animate-pulse' : ''} />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase">Sobrecarga</p>
              <p className="text-[8px] font-bold opacity-60 uppercase">{localConfig.overloadMode ? 'Pausar Vendas' : 'Fluxo Normal'}</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, aberta: !localConfig.aberta})}
            className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${localConfig.aberta ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
          >
            <Power size={32} />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase">Status Loja</p>
              <p className="text-[8px] font-bold opacity-60 uppercase">{localConfig.aberta ? 'Online' : 'Offline'}</p>
            </div>
          </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl">
        {/* Gestão Financeira e PIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Meta Diária (R$)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-orange-500/50 transition-all">
              <Target size={20} className="text-orange-500" />
              <input 
                type="number" 
                value={localConfig.dailyGoal} 
                onChange={e => setLocalConfig({...localConfig, dailyGoal: parseFloat(e.target.value)})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Chave PIX</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-orange-500/50 transition-all">
              <Hash size={20} className="text-orange-500" />
              <input 
                type="text" 
                value={localConfig.pixKey || ''} 
                onChange={e => setLocalConfig({...localConfig, pixKey: e.target.value})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="pix@skburgers.com"
              />
            </div>
          </div>
        </div>

        {/* Preços Dinâmicos de Sobremesa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Preço Sobremesa (Oferta)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-pink-500/50 transition-all">
              <IceCream size={20} className="text-pink-500" />
              <input 
                type="number" 
                value={localConfig.dessertOfferPrice} 
                onChange={e => setLocalConfig({...localConfig, dessertOfferPrice: parseFloat(e.target.value)})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Preço Sobremesa (Solo)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-pink-500/50 transition-all">
              <IceCream size={20} className="text-pink-400" />
              <input 
                type="number" 
                value={localConfig.dessertSoloPrice} 
                onChange={e => setLocalConfig({...localConfig, dessertSoloPrice: parseFloat(e.target.value)})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
              />
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
          <div className="space-y-3">
            <div className="flex justify-between ml-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">PIN Administrativo</label>
              <button type="button" onClick={() => setShowPins(!showPins)} className="text-zinc-600 hover:text-white transition-all">
                {showPins ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-white/20 transition-all">
              <Lock size={20} className="text-zinc-700" />
              <input 
                type={showPins ? "text" : "password"} 
                value={localConfig.adminPassword || ''} 
                onChange={e => setLocalConfig({...localConfig, adminPassword: e.target.value.replace(/\D/g, '')})}
                className="bg-transparent border-none outline-none text-white font-black tracking-[0.5em] w-full text-sm" 
                maxLength={4}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">PIN Cozinha</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-white/20 transition-all">
              <Lock size={20} className="text-zinc-700" />
              <input 
                type={showPins ? "text" : "password"} 
                value={localConfig.kitchenPassword || ''} 
                onChange={e => setLocalConfig({...localConfig, kitchenPassword: e.target.value.replace(/\D/g, '')})}
                className="bg-transparent border-none outline-none text-white font-black tracking-[0.5em] w-full text-sm" 
                maxLength={4}
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-orange-500 text-black py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase tracking-widest hover:bg-orange-400 active:scale-95 transition-all shadow-xl shadow-orange-500/10 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
          <span>Salvar Configurações</span>
        </button>
      </form>
    </div>
  );
};

export default AdminConfig;
