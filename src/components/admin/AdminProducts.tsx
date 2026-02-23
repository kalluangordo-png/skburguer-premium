import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Power, Trash2, Save, X, ChefHat, Image as ImageIcon, 
  DollarSign, Info, AlertCircle, Loader2
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, InventoryItem, StoreConfig, RecipeIngredient } from '../../types';
import { useToast } from '../ToastContext';
import { formatCurrency } from '../../utils';
import PhotoUpload from './PhotoUpload';

interface AdminProductsProps {
  products: Product[];
  inventory: InventoryItem[];
  config: StoreConfig;
  onUpdateConfig: (config: StoreConfig) => Promise<void>;
  onToggleStatus: (product: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const optimizeImage = (url: string, width: number) => {
  if (!url) return 'https://picsum.photos/400/300';
  return url; // Simplified for this implementation
};

const AdminProducts: React.FC<AdminProductsProps> = ({ 
  products, inventory, config, onUpdateConfig, onToggleStatus, onDelete 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState<StoreConfig>(config);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'cmv' | 'isPaused'>>({
    name: '',
    price: 0,
    priceCombo: null,
    description: '',
    category: 'Burgers',
    stock: 0,
    image: '',
    recipe: []
  });

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      price: 0,
      priceCombo: null,
      description: '',
      category: 'Burgers',
      stock: 0,
      image: '',
      recipe: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      priceCombo: product.priceCombo || null,
      description: product.description,
      category: product.category,
      stock: product.stock,
      image: product.image,
      recipe: product.recipe || []
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return showToast("Nome e Preço são obrigatórios", "error");
    
    setIsSubmitting(true);
    try {
      const calculatedCmv = formData.recipe.reduce((acc, ing) => {
        const item = inventory.find(i => i.id === ing.id);
        return acc + (ing.qty * (item?.costPrice || 0));
      }, 0);

      const payload = { 
        ...formData, 
        name: formData.name.toUpperCase(), 
        price: Number(formData.price), 
        priceCombo: formData.priceCombo ? Number(formData.priceCombo) : null, 
        cmv: calculatedCmv || 0,
        updatedAt: serverTimestamp() 
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
        showToast(`${formData.name} atualizado com sucesso!`, "success");
      } else {
        await addDoc(collection(db, 'products'), { 
          ...payload, 
          isPaused: false, 
          createdAt: serverTimestamp() 
        });
        showToast("Novo burger adicionado ao cardápio!", "success");
      }
      setIsModalOpen(false);
    } catch (err) { 
      showToast("Erro ao salvar. Verifique a conexão.", "error"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await onUpdateConfig(localConfig);
      showToast("Estratégia de Upsell salva!", "success");
    } catch (err) {
      showToast("Erro ao salvar configuração.", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const addRecipeItem = () => {
    setFormData({
      ...formData,
      recipe: [...formData.recipe, { id: '', qty: 0 }]
    });
  };

  const removeRecipeItem = (index: number) => {
    setFormData({
      ...formData,
      recipe: formData.recipe.filter((_, i) => i !== index)
    });
  };

  const updateRecipeItem = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const newRecipe = [...formData.recipe];
    newRecipe[index] = { ...newRecipe[index], [field]: value };
    setFormData({ ...formData, recipe: newRecipe });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Menu Master</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Gestão de Cardápio e Engenharia de Lucro</p>
        </div>
        <button onClick={openAddModal} className="w-full md:w-auto bg-white text-black hover:bg-orange-500 hover:text-white px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95">
          <Plus size={20} /> Criar Novo Burger
        </button>
      </header>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(prod => (
          <div key={prod.id} className={`group bg-zinc-900/30 border-2 rounded-[2.8rem] overflow-hidden transition-all duration-500 flex flex-col backdrop-blur-sm ${prod.isPaused ? 'border-red-500/10 opacity-50' : 'border-white/5 hover:border-orange-500/40'}`}>
            <div className="h-48 relative overflow-hidden">
              <img src={optimizeImage(prod.image, 600)} alt={prod.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              
              <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button onClick={() => openEditModal(prod)} className="p-3 bg-white text-black rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-xl"><Edit3 size={18} /></button>
                <button onClick={() => onToggleStatus(prod)} className={`p-3 rounded-xl transition-all shadow-xl ${prod.isPaused ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-white'}`}>
                  <Power size={18} />
                </button>
              </div>

              <div className="absolute bottom-3 left-6">
                <span className="text-[9px] font-black uppercase px-2 py-1 bg-black/60 text-orange-500 border border-orange-500/30 rounded-lg backdrop-blur-md">
                  {prod.category}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <h4 className="font-black uppercase text-base text-white leading-tight tracking-tight">{prod.name}</h4>
                <p className="text-[10px] text-zinc-500 font-bold mt-1 line-clamp-2 italic">{prod.description}</p>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[14px] text-orange-500 font-black italic">{formatCurrency(prod.price)}</span>
                  {prod.priceCombo && <span className="text-[10px] text-emerald-500 font-bold uppercase">Combo: {formatCurrency(prod.priceCombo)}</span>}
                </div>
                <button onClick={() => onDelete(prod.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seção de Upsells */}
      <div className="mt-20 p-10 bg-zinc-900/20 border border-white/5 rounded-[3rem] space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Engenharia de Upsell</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Configuração de Adicionais e Ofertas de Checkout</p>
          </div>
          <div className="flex gap-4">
            <button 
               onClick={handleSaveConfig}
               disabled={isSavingConfig}
               className="bg-orange-500 text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orange-400 transition-all shadow-xl shadow-orange-500/10"
            >
              {isSavingConfig ? 'Sincronizando...' : 'Salvar Estratégia'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Coluna de Adicionais */}
          <div className="space-y-6">
             <div className="flex justify-between items-center px-2">
               <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <Plus size={16} className="text-orange-500" /> Adicionais (Extras)
               </h4>
               <button 
                 onClick={() => setLocalConfig({...localConfig, addons: [...(localConfig.addons || []), { name: '', price: 0 }]})}
                 className="text-[9px] font-black text-orange-500 uppercase border-b border-orange-500/30"
               >
                 + Adicionar Campo
               </button>
             </div>
             
             <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
               {(localConfig.addons || []).map((addon, index) => (
                 <div key={index} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-all">
                    <input 
                      type="text" 
                      value={addon.name} 
                      onChange={e => {
                        const newAddons = [...localConfig.addons];
                        newAddons[index].name = e.target.value.toUpperCase();
                        setLocalConfig({...localConfig, addons: newAddons});
                      }}
                      placeholder="EX: BACON EXTRA"
                      className="bg-transparent border-none outline-none text-white font-bold text-xs flex-1"
                    />
                    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-600 font-black">R$</span>
                      <input 
                        type="number" 
                        value={addon.price} 
                        onChange={e => {
                          const newAddons = [...localConfig.addons];
                          newAddons[index].price = parseFloat(e.target.value);
                          setLocalConfig({...localConfig, addons: newAddons});
                        }}
                        className="bg-transparent border-none outline-none text-orange-500 font-black text-xs w-14"
                      />
                    </div>
                    <button onClick={() => {
                      const newAddons = localConfig.addons.filter((_, i) => i !== index);
                      setLocalConfig({...localConfig, addons: newAddons});
                    }} className="text-zinc-700 hover:text-red-500"><Trash2 size={16}/></button>
                 </div>
               ))}
             </div>
          </div>

          {/* Coluna de Sobremesas */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ChefHat size={16} className="text-orange-500" /> Gatilho de Sobremesa
            </h4>
            <div className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] space-y-8">
               <div className="space-y-3">
                 <label className="text-[9px] font-black text-zinc-500 uppercase px-1">Preço no Cardápio (Copo da Felicidade)</label>
                 <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                   <span className="text-white font-black italic">{formatCurrency(localConfig.dessertSoloPrice || 0)}</span>
                   <input 
                     type="number" 
                     value={localConfig.dessertSoloPrice} 
                     onChange={e => setLocalConfig({...localConfig, dessertSoloPrice: parseFloat(e.target.value)})}
                     className="w-20 bg-transparent text-right outline-none text-zinc-500 font-bold"
                   />
                 </div>
               </div>
               
               <div className="space-y-3">
                 <label className="text-[9px] font-black text-orange-500 uppercase px-1">Preço "Oferta de Última Hora" (No Carrinho)</label>
                 <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-2xl flex items-center justify-between">
                   <span className="text-orange-500 font-black italic text-xl">{formatCurrency(localConfig.dessertOfferPrice || 0)}</span>
                   <input 
                     type="number" 
                     value={localConfig.dessertOfferPrice} 
                     onChange={e => setLocalConfig({...localConfig, dessertOfferPrice: parseFloat(e.target.value)})}
                     className="w-20 bg-transparent text-right outline-none text-orange-900 font-black"
                   />
                 </div>
                 <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-2 text-center">Este preço cria o senso de urgência e benefício no checkout.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <header className="p-8 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
            </header>
            
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-orange-500 outline-none uppercase"
                      placeholder="EX: SK CLASSIC BURGER"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Preço Individual</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-orange-500 outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Preço Combo</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.priceCombo || ''}
                        onChange={e => setFormData({...formData, priceCombo: e.target.value ? Number(e.target.value) : null})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Fotografia do Produto</label>
                    <PhotoUpload 
                      initialValue={formData.image}
                      onUploadSuccess={(url) => setFormData({...formData, image: url})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Descrição</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-orange-500 outline-none h-32 resize-none"
                      placeholder="Descreva os ingredientes..."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Ficha Técnica (Receita)</label>
                    <button type="button" onClick={addRecipeItem} className="text-[10px] font-black text-orange-500 uppercase">+ Insumo</button>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                    {formData.recipe.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <select 
                          value={ing.id}
                          onChange={e => updateRecipeItem(idx, 'id', e.target.value)}
                          className="bg-zinc-900 text-white text-xs font-bold rounded-lg p-2 flex-1 outline-none border border-white/5"
                        >
                          <option value="">Selecionar Insumo</option>
                          {inventory.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          value={ing.qty}
                          onChange={e => updateRecipeItem(idx, 'qty', Number(e.target.value))}
                          className="w-16 bg-zinc-900 text-white text-xs font-bold rounded-lg p-2 outline-none border border-white/5"
                          placeholder="QTD"
                        />
                        <button type="button" onClick={() => removeRecipeItem(idx)} className="text-zinc-600 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {formData.recipe.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                        <p className="text-[10px] font-black uppercase">Sem insumos vinculados</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-orange-500 text-black py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-400 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Salvar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
