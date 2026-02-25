import React, { useState, useEffect } from 'react';
import { 
  Save, Loader2, DatabaseBackup, Rocket, CloudRain, AlertOctagon, Power, 
  Target, Hash, IceCream, Lock, Eye, EyeOff, X 
} from 'lucide-react';
import { StoreConfig } from '../../types';
import { useToast } from '../ToastContext';
import { seedInitialData } from '../../services/seedService';
import { formatCurrency } from '../../utils';

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
      console.error("Erro ao resetar base:", e);
      showToast("Erro na restauração. Verifique as regras do Firebase.", "error");
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
                value={localConfig.dailyGoal ?? 0} 
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
                value={localConfig.pixKey ?? ''} 
                onChange={e => setLocalConfig({...localConfig, pixKey: e.target.value})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="pix@skburgers.com"
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
                value={localConfig.adminPassword ?? ''} 
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
                value={localConfig.kitchenPassword ?? ''} 
                onChange={e => setLocalConfig({...localConfig, kitchenPassword: e.target.value.replace(/\D/g, '')})}
                className="bg-transparent border-none outline-none text-white font-black tracking-[0.5em] w-full text-sm" 
                maxLength={4}
              />
            </div>
          </div>
        </div>

        {/* Gestão de Categorias */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Categorias Ativas</label>
          <div className="flex flex-wrap gap-2">
            {localConfig.categories?.map((cat, idx) => (
              <div key={idx} className="bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3 group">
                <span className="text-[10px] font-black text-white uppercase italic">{cat}</span>
                <button 
                  type="button"
                  onClick={() => {
                    const newCats = localConfig.categories?.filter((_, i) => i !== idx);
                    setLocalConfig({...localConfig, categories: newCats});
                  }}
                  className="text-zinc-700 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {(!localConfig.categories || localConfig.categories.length === 0) && (
              <p className="text-[10px] text-zinc-600 italic">Nenhuma categoria cadastrada.</p>
            )}
          </div>
          <p className="text-[8px] text-zinc-600 font-bold uppercase italic">Novas categorias são criadas automaticamente ao salvar um produto com um nome de categoria novo.</p>
        </div>

        {/* Gestão de Adicionais */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Adicionais (Bacon, Ovo, Carne+, etc.)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localConfig.addons?.map((addon, idx) => (
              <div key={idx} className="bg-zinc-900 border border-white/5 p-4 rounded-3xl flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase italic">{addon.name}</span>
                  <span className="text-[9px] font-bold text-orange-500 uppercase">+ {formatCurrency(addon.price)}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const newAddons = localConfig.addons?.filter((_, i) => i !== idx);
                    setLocalConfig({...localConfig, addons: newAddons});
                  }}
                  className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 bg-zinc-900/30 p-4 rounded-3xl border border-dashed border-white/10">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Nome do Adicional</label>
              <input 
                type="text" 
                id="newAddonName"
                placeholder="EX: BACON" 
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-orange-500/50 uppercase italic font-bold"
              />
            </div>
            <div className="w-full md:w-32 space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Preço (R$)</label>
              <input 
                type="number" 
                id="newAddonPrice"
                placeholder="0.00" 
                step="0.50"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-orange-500/50 font-bold"
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                const nameInput = document.getElementById('newAddonName') as HTMLInputElement;
                const priceInput = document.getElementById('newAddonPrice') as HTMLInputElement;
                if (nameInput.value && priceInput.value) {
                  const newAddon = { name: nameInput.value.toUpperCase(), price: parseFloat(priceInput.value) };
                  setLocalConfig({...localConfig, addons: [...(localConfig.addons || []), newAddon]});
                  nameInput.value = '';
                  priceInput.value = '';
                } else {
                  showToast("Preencha nome e preço do adicional", "info");
                }
              }}
              className="md:mt-5 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all active:scale-95"
            >
              Adicionar
            </button>
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
