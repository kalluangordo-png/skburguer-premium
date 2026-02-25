import { db } from "./firebase";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";

export const seedInitialData = async () => {
  const batch = writeBatch(db);

  // Initial Inventory
  const inventory = [
    { id: 'pao', name: 'PÃO BRIOCHE', unit: 'UN', quantity: 100, minQuantity: 20, costPrice: 1.50 },
    { id: 'carne', name: 'BLEND 150G', unit: 'UN', quantity: 50, minQuantity: 10, costPrice: 5.00 },
    { id: 'queijo', name: 'CHEDDAR', unit: 'FATIA', quantity: 200, minQuantity: 40, costPrice: 0.80 },
    { id: 'bacon', name: 'BACON', unit: 'G', quantity: 2000, minQuantity: 500, costPrice: 0.05 },
  ];

  inventory.forEach(item => {
    const ref = doc(db, 'inventory', item.id);
    batch.set(ref, item);
  });

  // Initial Products
  const products = [
    { 
      id: 'classic', 
      name: 'SK CLASSIC BURGER', 
      price: 32.90, 
      category: 'Burgers', 
      description: 'Pão brioche, blend 150g, queijo cheddar, bacon crocante e molho especial.',
      stock: 50,
      recipe: [
        { id: 'pao', qty: 1 },
        { id: 'carne', qty: 1 },
        { id: 'queijo', qty: 2 },
        { id: 'bacon', qty: 30 }
      ]
    }
  ];

  products.forEach(product => {
    const ref = doc(db, 'products', product.id);
    batch.set(ref, { ...product, isPaused: false });
  });

  // Initial Config
  const configRef = doc(db, 'config', 'store');
  batch.set(configRef, {
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
    categories: ['Burgers', 'Combos', 'Bebidas', 'Acompanhamentos', 'Sobremesas'],
    addons: [
      { name: 'BACON EXTRA', price: 5.00 },
      { name: 'CARNE EXTRA', price: 12.00 },
      { name: 'QUEIJO EXTRA', price: 4.00 }
    ]
  });

  await batch.commit();
};
