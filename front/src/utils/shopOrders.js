const STORAGE_PREFIX = 'sportshop_orders_v1';

export function getOrdersStorageKey() {
  const username = localStorage.getItem('username');
  if (!username) return null;
  return `${STORAGE_PREFIX}_${username}`;
}

export function loadOrders() {
  const key = getOrdersStorageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} product — элемент из SHOP_PRODUCTS (нужны id, name, price, image)
 */
export function addOrderItem(product) {
  const key = getOrdersStorageKey();
  if (!key) return false;
  const orders = loadOrders();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    productId: product.id,
    name: product.name,
    price: product.price,
    image: product.image || null,
    createdAt: new Date().toISOString(),
  };
  orders.push(item);
  localStorage.setItem(key, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent('shopOrdersUpdated'));
  return true;
}

export function removeOrderItem(itemId) {
  const key = getOrdersStorageKey();
  if (!key) return false;
  const next = loadOrders().filter((o) => o.id !== itemId);
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('shopOrdersUpdated'));
  return true;
}
