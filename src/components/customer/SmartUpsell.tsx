import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../../types';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils';

interface SmartUpsellProps {
  cart: { id: string; name: string; price: number; quantity: number }[];
  allProducts: Product[];
  onAdd: (product: Product) => void;
}

const SmartUpsell: React.FC<SmartUpsellProps> = ({ cart, allProducts, onAdd }) => {
  const [suggestion, setSuggestion] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cart.length === 0 || cart.length > 6) {
      setSuggestion(null);
      return;
    }

    const fetchSuggestion = async () => {
      setLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        
        const cartNames = cart.map(i => i.name).join(', ');
        const menuData = allProducts
          .filter(p => !p.isPaused && p.category !== 'Adicional')
          .map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price }));

        const prompt = `Analise este carrinho: [${cartNames}]. 
                        Com base nestes produtos: ${JSON.stringify(menuData)}, 
                        qual o melhor item complementar (bebida, batata ou sobremesa)? 
                        Responda apenas o ID.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            systemInstruction: "Você é o Sommelier de Smash Burgers da SK Burgers. Seu objetivo é aumentar o ticket médio sugerindo acompanhamentos lógicos. Responda apenas o JSON com o campo 'suggestedId'.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedId: { type: Type.STRING }
              },
              required: ["suggestedId"]
            }
          }
        });

        const jsonStr = response.text?.trim();
        if (jsonStr) {
          const { suggestedId } = JSON.parse(jsonStr);
          const product = allProducts.find(p => p.id === suggestedId);
          
          if (product && !cart.some(i => i.id === product.id)) {
            setSuggestion(product);
          } else {
            const hasDrink = cart.some(i => i.category === 'Bebida');
            const fallback = allProducts.find(p => 
              (hasDrink ? p.category === 'Acompanhamento' : p.category === 'Bebida') && 
              !cart.some(i => i.id === p.id) && !p.isPaused
            );
            setSuggestion(fallback || null);
          }
        }
      } catch (e) {
        console.error("Error fetching suggestion:", e);
        setSuggestion(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestion, 1500);
    return () => clearTimeout(timer);
  }, [cart, allProducts]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-orange-500/20 p-6 rounded-[2rem] flex items-center justify-center gap-3 animate-pulse">
        <Loader2 size={18} className="animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">IA harmonizando seu pedido...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-[2.5rem] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-orange-500" />
        <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-[0.2em]">Sugestão do Sommelier</h4>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden shrink-0 border border-white/5">
          <img src={suggestion.image} className="w-full h-full object-cover" alt={suggestion.name} referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1">
          <h5 className="text-white font-black uppercase text-xs italic">{suggestion.name}</h5>
          <p className="text-zinc-500 text-[10px] font-bold mt-1 line-clamp-1">{suggestion.description}</p>
          <p className="text-orange-500 font-black text-sm mt-1">{formatCurrency(suggestion.price)}</p>
        </div>
        <button 
          onClick={() => onAdd(suggestion)}
          className="bg-orange-500 text-black p-3 rounded-xl hover:bg-orange-400 transition-all active:scale-90 shadow-lg shadow-orange-500/20"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default SmartUpsell;
