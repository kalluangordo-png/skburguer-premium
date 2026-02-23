import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Lock, ArrowLeft, Package, Settings, Truck, ChefHat, Utensils, Users, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../services/utils';
import AdminDashboard from './AdminDashboard';
import AdminInventory from './AdminInventory';
import AdminConfig from './AdminConfig';
import AdminDispatch from './AdminDispatch';
import AdminKDS from './AdminKDS';
import AdminProducts from './AdminProducts';
import AdminMarketing from './AdminMarketing';
import AdminOrders from './AdminOrders';
import { Order, Product, InventoryItem, StoreConfig, Driver } from '../../types';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'products' | 'orders' | 'kds' | 'dispatch' | 'marketing' | 'settings'>('dashboard');
  const [isSaving, setIsSaving] = useState(false);

  // Mock data for demonstration
  const mockOrders: Order[] = [];
  const mockInventory: InventoryItem[] = [];
  const mockProducts: Product[] = [];
  const mockDrivers: Driver[] = [
    { id: '1', name: 'JOÃO SILVA', pin: '1111', status: 'idle' },
    { id: '2', name: 'MARCOS OLIVEIRA', pin: '2222', status: 'busy' }
  ];
  const [mockConfig, setMockConfig] = useState<StoreConfig>({
    dailyGoal: 400,
    whatsappNumber: '5592999999999',
    rainMode: false,
    overloadMode: false,
    aberta: true,
    pixKey: 'pix@skburgers.com',
    dessertOfferPrice: 5.00,
    dessertSoloPrice: 12.00,
    adminPassword: '1214',
    kitchenPassword: '1234',
    addons: []
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1214') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleSaveInventory = (item: Partial<InventoryItem>) => {
    console.log('Saving inventory item:', item);
  };

  const handleUpdateStock = (id: string, newQty: number) => {
    console.log('Updating stock:', id, newQty);
  };

  const handleSaveConfig = async (newConfig: StoreConfig) => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMockConfig(newConfig);
    setIsSaving(false);
  };

  const handleFixAddress = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleToggleProductStatus = async (product: Product) => {
    console.log('Toggling product status:', product.id);
  };

  const handleDeleteProduct = async (id: string) => {
    console.log('Deleting product:', id);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card w-full max-w-md space-y-8"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-orange-accent" />
            </div>
            <h2 className="text-2xl font-bold">Acesso Administrativo</h2>
            <p className="text-zinc-500 text-sm mt-2">Área restrita para gestores.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              className={cn(
                "input-field w-full text-center text-2xl tracking-[0.5em]",
                error && "border-red-500"
              )}
              autoFocus
            />
            <button type="submit" className="btn-primary w-full">Entrar</button>
          </form>

          <Link to="/" className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-orange-accent w-8 h-8" />
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        </div>
        
        <nav className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'dashboard' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'inventory' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Package size={14} /> Almoxarifado
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'products' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Utensils size={14} /> Cardápio
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'orders' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ClipboardList size={14} /> Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('kds')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'kds' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ChefHat size={14} /> Cozinha
          </button>
          <button 
            onClick={() => setActiveTab('dispatch')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'dispatch' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Truck size={14} /> Despacho
          </button>
          <button 
            onClick={() => setActiveTab('marketing')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'marketing' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Users size={14} /> Marketing
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'settings' ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Settings size={14} /> Config
          </button>
        </nav>

        <Link to="/" className="btn-primary !bg-zinc-800 hover:!bg-zinc-700 text-sm">Sair</Link>
      </header>

      {activeTab === 'dashboard' && (
        <AdminDashboard 
          orders={mockOrders} 
          config={mockConfig}
          inventory={mockInventory} 
        />
      )}
      
      {activeTab === 'inventory' && (
        <AdminInventory 
          inventory={mockInventory}
          products={mockProducts}
          onSave={handleSaveInventory}
          onUpdateStock={handleUpdateStock}
        />
      )}

      {activeTab === 'products' && (
        <AdminProducts 
          products={mockProducts}
          inventory={mockInventory}
          config={mockConfig}
          onUpdateConfig={handleSaveConfig}
          onToggleStatus={handleToggleProductStatus}
          onDelete={handleDeleteProduct}
        />
      )}

      {activeTab === 'orders' && (
        <AdminOrders 
          orders={mockOrders}
        />
      )}

      {activeTab === 'kds' && (
        <AdminKDS 
          orders={mockOrders}
          products={mockProducts}
          inventory={mockInventory}
        />
      )}

      {activeTab === 'dispatch' && (
        <AdminDispatch 
          orders={mockOrders}
          drivers={mockDrivers}
        />
      )}

      {activeTab === 'marketing' && (
        <AdminMarketing />
      )}

      {activeTab === 'settings' && (
        <AdminConfig 
          config={mockConfig}
          onSave={handleSaveConfig}
          onFixAddress={handleFixAddress}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};
export default Admin;
