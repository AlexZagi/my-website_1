import React, { useState, useEffect, useCallback } from 'react';
import { SHOP_PRODUCTS } from '../../data/shopProducts';
import { addOrderItem, loadOrders } from '../../utils/shopOrders';
import './NutritionPage.css';

const API_URL = 'http://127.0.0.1:8000/api/';
const CURRENCY = 'BYN';

const ProductDetailModal = ({ product, isLoggedIn, isInOrders, onClose, onAddToOrders, onOpenAuth }) => {
  if (!product) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="nutrition-product-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nutrition-product-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="nutrition-product-modal__box">
        <button type="button" className="nutrition-product-modal__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        {product.image && (
          <div className="nutrition-product-modal__img-wrap">
            <img src={product.image} alt="" className="nutrition-product-modal__img" />
          </div>
        )}
        <h3 id="nutrition-product-modal-title" className="nutrition-product-modal__title">
          {product.name}
        </h3>
        <p className="nutrition-product-modal__detail">{product.detail}</p>
        {product.composition && <p className="nutrition-product-modal__composition">Состав: {product.composition}</p>}
        <p className="nutrition-product-modal__price">{product.price.toLocaleString('ru-RU')} {CURRENCY}</p>
        <div className="nutrition-product-modal__actions">
          {isLoggedIn ? (
            isInOrders ? (
              <button type="button" className="nutrition-shop__buy nutrition-shop__buy--added" disabled>
                В моих заказах
              </button>
            ) : (
              <button type="button" className="nutrition-shop__buy" onClick={() => onAddToOrders(product)}>
                В мои заказы
              </button>
            )
          ) : (
            <>
              <button type="button" className="nutrition-shop__buy nutrition-shop__buy--locked" disabled>
                В мои заказы
              </button>
              <button type="button" className="nutrition-shop__login" onClick={onOpenAuth}>
                Войти, чтобы добавить в заказы
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const NutritionPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('access_token'));
  const [shopMessage, setShopMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [shopOrders, setShopOrders] = useState(() => loadOrders());
  const [products, setProducts] = useState(() => SHOP_PRODUCTS);

  const syncAuth = useCallback(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'));
  }, []);

  const refreshShopOrders = useCallback(() => {
    setShopOrders(loadOrders());
  }, []);

  useEffect(() => {
    syncAuth();
    const onAuthChange = () => syncAuth();
    window.addEventListener('storage', onAuthChange);
    window.addEventListener('loginStatusChange', onAuthChange);
    return () => {
      window.removeEventListener('storage', onAuthChange);
      window.removeEventListener('loginStatusChange', onAuthChange);
    };
  }, [syncAuth]);

  useEffect(() => {
    setShopMessage('');
  }, [isLoggedIn]);

  useEffect(() => {
    refreshShopOrders();
    const onShopOrdersUpdated = () => refreshShopOrders();
    window.addEventListener('shopOrdersUpdated', onShopOrdersUpdated);
    return () => window.removeEventListener('shopOrdersUpdated', onShopOrdersUpdated);
  }, [refreshShopOrders]);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_URL}users/shop-products/`);
        if (!res.ok) throw new Error('bad_response');
        const data = await res.json();
        if (!isMounted) return;
        if (Array.isArray(data) && data.length) {
          setProducts(data.map((p) => ({
            ...p,
            // normalize types expected by UI
            price: typeof p.price === 'string' ? Number(p.price) : p.price,
          })));
        } else {
          setProducts(SHOP_PRODUCTS);
        }
      } catch {
        if (isMounted) setProducts(SHOP_PRODUCTS);
      }
    };
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProduct) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedProduct(null);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedProduct]);

  const openAuthModal = () => {
    window.dispatchEvent(new Event('openAuthModal'));
  };

  const handleAddToOrders = (product) => {
    if (!localStorage.getItem('access_token')) {
      setShopMessage('Войдите в аккаунт, чтобы добавить товар в заказы.');
      return;
    }
    const ok = addOrderItem(product);
    if (ok) {
      setShopMessage(`«${product.name}» добавлен в «Мои заказы» в личном кабинете.`);
      setSelectedProduct(null);
      // Make the UI respond immediately (also gets updated via shopOrdersUpdated).
      refreshShopOrders();
    }
  };

  const openDetails = (product) => {
    setSelectedProduct(product);
  };

  const orderProductIds = new Set(shopOrders.map((o) => o.productId));

  return (
    <div className="nutrition-page">
      <div className="nutrition-page__inner">
        <h1 className="nutrition-page__title">Питание</h1>
        <p className="nutrition-page__lead">
          Правильное питание — основа эффективных тренировок и хорошего самочувствия. Здесь собраны базовые
          ориентиры для тех, кто только знакомится с нашим клубом.
        </p>

        <section className="nutrition-shop" aria-labelledby="nutrition-shop-title">
          <div className="nutrition-shop__head">
            <h2 id="nutrition-shop-title" className="nutrition-shop__title">
              Магазин спортивного питания
            </h2>
            <p className="nutrition-shop__subtitle">
              Выбирайте добавки и спортивное питание под свои цели. Описание и состав доступны в карточке каждого товара.
            </p>
            {!isLoggedIn && (
              <p className="nutrition-shop__hint">
                Добавлять товары в заказы могут только авторизованные пользователи. Войдите в аккаунт.
              </p>
            )}
          </div>

          {shopMessage && (
            <p className="nutrition-shop__message" role="status">
              {shopMessage}
            </p>
          )}

          <ul className="nutrition-shop__grid">
            {products.map((p) => {
              const inOrders = orderProductIds.has(p.id);
              return (
                <li key={p.id} className="nutrition-shop__card">
                  <div className="nutrition-shop__thumb">
                    <img src={p.image} alt={p.name} className="nutrition-shop__thumb-img" />
                  </div>
                  <h3 className="nutrition-shop__name">{p.name}</h3>
                  <p className="nutrition-shop__desc">{p.summary}</p>
                  {p.composition && <p className="nutrition-shop__composition">Состав: {p.composition}</p>}
                  <p className="nutrition-shop__price">{p.price.toLocaleString('ru-RU')} {CURRENCY}</p>
                  <button type="button" className="nutrition-shop__more" onClick={() => openDetails(p)}>
                    Подробнее
                  </button>
                  <div className="nutrition-shop__actions">
                    {isLoggedIn ? (
                      <button
                        type="button"
                        className={`nutrition-shop__buy ${inOrders ? 'nutrition-shop__buy--added' : ''}`}
                        onClick={() => !inOrders && handleAddToOrders(p)}
                        disabled={inOrders}
                      >
                        {inOrders ? 'В моих заказах' : 'В мои заказы'}
                      </button>
                    ) : (
                      <>
                        <button type="button" className="nutrition-shop__buy nutrition-shop__buy--locked" disabled>
                          В мои заказы
                        </button>
                        <button type="button" className="nutrition-shop__login" onClick={openAuthModal}>
                          Войти, чтобы добавить в заказы
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="nutrition-page__section">
          <h2>Баланс БЖУ</h2>
          <p>
            Белки поддерживают мышцы, углеводы дают энергию для занятий, жиры участвуют в гормональном балансе.
            Не стоит исключать целые группы продуктов без рекомендации специалиста — важнее сбалансировать рацион
            под ваш ритм жизни и цели.
          </p>
        </section>

        <section className="nutrition-page__section">
          <h2>Вода</h2>
          <p>
            Пейте достаточно жидкости в течение дня, особенно до и после тренировки. Вода участвует в обмене
            веществ и помогает восстановлению.
          </p>
        </section>

        <section className="nutrition-page__section">
          <h2>Режим</h2>
          <p>
            Регулярные приёмы пищи и сон 7–8 часов поддерживают стабильный уровень энергии и снижают тягу к
            перекусам «на бегу».
          </p>
        </section>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        isLoggedIn={isLoggedIn}
        isInOrders={selectedProduct ? shopOrders.some((o) => o.productId === selectedProduct.id) : false}
        onClose={() => setSelectedProduct(null)}
        onAddToOrders={handleAddToOrders}
        onOpenAuth={openAuthModal}
      />
    </div>
  );
};

export default NutritionPage;
