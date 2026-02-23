export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATIONAL = 'OPERATIONAL',
  CUSTOMER = 'CUSTOMER'
}

export enum PaymentMethod {
  PIX = 'PIX',
  SODEXO = 'SODEXO',
  CASH = 'CASH',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  ALELO = 'ALELO'
}

export interface InventoryItem {
  id: string;
  name: string;
  costPrice: number;
  stock: number;
  unit: string;
  quantity: number;
  minQuantity: number;
  physicalCount?: number;
}


export interface StoreConfig {
  dailyGoal: number;
  whatsappNumber: string;
  rainMode: boolean;
  overloadMode: boolean;
  aberta: boolean;
  pixKey: string;
  dessertOfferPrice: number;
  dessertSoloPrice: number;
  adminPassword?: string;
  kitchenPassword?: string;
  addons: { name: string; price: number }[];
}



export interface RecipeIngredient {
  id: string;
  qty: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  priceCombo?: number | null;
  description: string;
  category: string;
  stock: number;
  image: string;
  recipe: RecipeIngredient[];
  isPaused: boolean;
  cmv: number;
}

export interface OrderItem {
  id: string;
  name: string;
  qtd: number;
  price: number;
  addons?: { name: string; price: number }[];
  obsExtras?: string[];
  isCombo?: boolean;
}

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: string;
  numeroComanda: string;
  itens: OrderItem[];
  total: number;
  subtotal: number;
  taxaEntrega: number;
  taxas: number;
  status: OrderStatus;
  pagamento: PaymentMethod;
  customerName: string;
  customerPhone: string;
  address: string;
  cliente: {
    nome: string;
    bairro: string;
    whatsapp?: string;
    endereco?: string;
    totalPurchases?: number;
    coords?: { lat: number; lng: number };
  };
  createdAt: number;
  dataCriacao: any;
  preparacaoIniciadaEm?: any;
  finalizadoEm?: any;
  entregadorId?: string;
  entregadorNome?: string;
  deliveryStart?: any;
  gpsConfirmado?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  pin: string;
  status: 'idle' | 'busy' | 'offline';
}


export interface FinancialSummary {
  bruto: number;
  taxasGateway: number;
  custoInsumos: number; // CMV
  custoOperacional: number; // Chapeiro + Motoboy
  lucroLiquido: number;
  ticketMedio: number;
}

export interface WasteLog {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: 'queimado' | 'vencido' | 'erro_preparo' | 'outros';
  date: any;
  costImpact: number;
}

export interface IngredientItem {
  id: string;
  qty: number;
}

// Tipo auxiliar para garantir que a baixa de estoque 
// aconteça apenas se o produto tiver receita (recipe)
export interface MissingCustomer {
  name: string;
  phone: string;
  lastOrderDate: Date;
  daysSince: number;
  totalOrders: number;
}

