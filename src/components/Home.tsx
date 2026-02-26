import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Settings, ShoppingCart, Beef, Zap, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans overflow-x-hidden flex flex-col">
            {/* Ambient Glow - Mais suave e dinâmico */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-20 flex flex-col items-center flex-1 w-full">
                
                {/* Logo Section */}
                <header className="flex flex-col items-center text-center mb-12 md:mb-20 animate-in fade-in slide-in-from-top-6 duration-1000">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.2rem] flex items-center justify-center shadow-[0_0_50px_-12px_rgba(249,115,22,0.5)] mb-8 rotate-3 hover:rotate-0 transition-all duration-700 border border-white/20 group cursor-default">
                        <Beef size={48} className="text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8] bg-gradient-to-b from-white via-white to-zinc-600 bg-clip-text text-transparent">
                        SK BURGERS
                    </h1>
                    <div className="flex items-center gap-4 mt-6">
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-orange-500/50"></div>
                        <p className="text-orange-500 text-[10px] md:text-[12px] font-black tracking-[0.6em] uppercase italic">Manaus Premium Smash</p>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-orange-500/50"></div>
                    </div>
                </header>

                <div className="w-full space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                    
                    {/* Hero Card com Overlay mais rico */}
                    <div className="relative group rounded-[3rem] md:rounded-[4rem] overflow-hidden border border-white/10 aspect-[4/3] md:aspect-[21/9] shadow-2xl">
                        <img 
                            src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=1200" 
                            className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
                            alt="Burger Destaque"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"></div>
                        
                        <div className="absolute bottom-8 left-8 right-8 md:bottom-12 md:left-12 flex justify-between items-end">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 bg-orange-500 text-black text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-tighter shadow-xl">
                                    <Zap size={12} fill="currentColor" /> Nova Cidade
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-[0.9]">O AUTÊNTICO <br/><span className="text-orange-500">SABOR SMASH</span></h2>
                            </div>
                            
                            <div className="hidden md:flex items-center gap-3 bg-zinc-950/80 backdrop-blur-xl px-5 py-2.5 rounded-3xl border border-white/10">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[10px] font-black uppercase text-white tracking-widest">Loja Aberta</span>
                            </div>
                        </div>
                    </div>

                    {/* Botão Call to Action - Agora mais "vibrante" */}
                    <button 
                        onClick={() => navigate('/order')}
                        className="w-full group relative bg-orange-500 hover:bg-white text-black p-8 md:p-10 rounded-[2.8rem] flex items-center justify-between transition-all duration-500 active:scale-[0.97] shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)] overflow-hidden"
                    >
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="w-16 h-16 bg-black rounded-[1.4rem] flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-lg">
                                <ShoppingCart size={30} strokeWidth={2.5} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-2xl md:text-4xl font-black uppercase italic leading-none tracking-tighter">FAZER MEU PEDIDO</h3>
                                <p className="text-black/50 group-hover:text-black/70 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 transition-colors">Ver cardápio e promoções do dia</p>
                            </div>
                        </div>
                        <ArrowRight size={40} className="relative z-10 group-hover:translate-x-3 transition-transform duration-500" strokeWidth={3} />
                        
                        {/* Brilho interno no hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                </div>

                {/* Footer com Staff Hub Discreto */}
                <footer className="mt-auto pt-16 w-full flex flex-col md:flex-row items-center justify-between gap-8 pb-6 border-t border-white/5">
                    <div className="flex items-center gap-5 opacity-30 hover:opacity-100 transition-all duration-700">
                        <img src="https://logopng.com.br/logos/ifood-43.png" className="h-3.5 grayscale brightness-200" alt="iFood" referrerPolicy="no-referrer" />
                        <div className="w-px h-4 bg-white/20"></div>
                        <div className="flex flex-col items-start">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white italic">SK BURGERS v3.2</p>
                            <p className="text-[7px] font-medium text-zinc-500 uppercase tracking-widest">Powered by Gemini AI Engine</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 px-4 py-2 bg-zinc-900/50 rounded-full border border-white/5 opacity-20 hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
                        <button onClick={() => navigate('/admin')} className="p-2.5 text-zinc-400 hover:text-orange-500 transition-colors" title="Acesso Admin"><Settings size={16} /></button>
                        <div className="w-px h-3 bg-white/10 mx-1"></div>
                        <button onClick={() => navigate('/kitchen')} className="p-2.5 text-zinc-400 hover:text-blue-500 transition-colors" title="Monitor KDS"><ChefHat size={16} /></button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Home;

