import React, { useState, useEffect, useRef } from 'react';
import { SHOP_PRODUCTS } from '../../data/shopProducts';
import './AdminBookingsModal.css';

const API_URL = 'http://127.0.0.1:8000/api/';
const TRAINING_DURATION_MINUTES = 90;

const WORKOUT_OPTIONS = [
  { value: 'cardio', label: 'Кардио-тренировки' },
  { value: 'strength', label: 'Силовые тренировки' },
  { value: 'yoga', label: 'Йога и растяжка' },
  { value: 'functional', label: 'Функциональные тренировки' },
  { value: 'gymnastics', label: 'Гимнастика' },
  { value: 'pilates', label: 'Пилатес' },
  { value: 'crossfit', label: 'Кроссфит' },
  { value: 'aqua', label: 'Аквааэробика' },
];

// Должно совпадать с WORKOUT_SCHEDULE на бэкенде.
const TRAINING_SCHEDULE = {
  cardio: { 0: ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'], 2: ['09:00', '10:30', '12:00', '15:30', '17:00'], 4: ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30', '19:00'] },
  strength: { 0: ['09:30', '11:30', '13:30', '15:00', '16:30', '18:00'], 2: ['10:30', '12:00', '13:30', '15:00', '17:30'], 4: ['10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'] },
  yoga: { 0: ['12:00', '13:30', '15:00', '16:30'], 2: ['12:00', '13:30', '15:00', '16:30'], 4: ['12:00', '13:30', '15:00', '16:30'] },
  functional: { 0: ['13:30', '15:00', '16:30'], 2: ['13:30', '15:00', '16:30'], 4: ['13:30', '15:00', '16:30'] },
  gymnastics: { 1: ['09:00', '10:30', '12:00', '13:30'], 3: ['09:00', '10:30', '12:00', '13:30'], 5: ['09:00', '10:30', '12:00', '13:30'] },
  pilates: { 1: ['10:30', '12:00', '13:30', '15:00'], 3: ['10:30', '12:00', '13:30', '15:00'], 5: ['10:30', '12:00', '13:30', '15:00'] },
  crossfit: { 1: ['12:00', '13:30', '15:00', '16:30'], 3: ['12:00', '13:30', '15:00', '16:30'], 5: ['12:00', '13:30', '15:00', '16:30'] },
  aqua: { 1: ['13:30', '15:00', '16:30', '18:00'], 3: ['13:30', '15:00', '16:30', '18:00'], 5: ['13:30', '15:00', '16:30', '18:00'] },
};

const WEEKDAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

// JS getDay(): 0 = Sunday ... 6 = Saturday -> Python style: 0 = Monday ... 6 = Sunday
const jsDateToPythonWeekday = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const jsDay = d.getDay();
  return (jsDay + 6) % 7;
};

const getAllowedTimes = (workoutType, dateStr) => {
  if (!workoutType || !dateStr) return [];
  const pyWeekday = jsDateToPythonWeekday(dateStr);
  if (pyWeekday === null) return [];
  const byDay = TRAINING_SCHEDULE[workoutType] || {};
  return byDay[pyWeekday] || [];
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const val = typeof timeStr === 'string' ? timeStr.slice(0, 5) : String(timeStr);
  const [hh, mm] = val.split(':');
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const getAllowedDaysText = (workoutType) => {
  if (!workoutType) return '';
  const byDay = TRAINING_SCHEDULE[workoutType];
  if (!byDay) return '';
  const days = Object.keys(byDay)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map((pyIdx) => WEEKDAY_NAMES[pyIdx]);
  if (!days.length) return '';
  return `Для этой тренировки доступны дни: ${days.join(', ')}.`;
};

const formatOrderPlacedAt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function AdminBookingsModal({
  isOpen,
  onClose,
  openStoreTab = false,
  openStoreProductId = null,
  adminAlertBookings = false,
  adminAlertPurchases = false,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    workout_type: '',
    date: '',
    time: '',
    trainer: '',
    comments: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const [adminTab, setAdminTab] = useState('bookings'); // 'bookings' | 'store_products' | 'store_orders' | 'profiles'
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productEditingId, setProductEditingId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    summary: '',
    detail: '',
    composition: '',
    price: '',
    image: '',
    is_active: true,
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productDeleteLoadingId, setProductDeleteLoadingId] = useState(null);
  const [productImageFile, setProductImageFile] = useState(null);
  const [seedDemoLoading, setSeedDemoLoading] = useState(false);

  const prevModalOpenRef = useRef(false);
  const consumedOpenStoreProductIdRef = useRef(null);
  const productsFetchInFlightRef = useRef(false);

  const token = localStorage.getItem('access_token');
  const isSuperuser = localStorage.getItem('is_superuser') === 'true';
  const canManageBookings = localStorage.getItem('can_manage_bookings') === 'true';
  const canManageStore = localStorage.getItem('can_manage_store') === 'true';

  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');

  const isSlotAvailable = (startTimeStr, dateStr, ignoreId) => {
    if (!startTimeStr || !dateStr) return true;
    const requestedStart = timeToMinutes(startTimeStr);
    if (requestedStart === null) return false;
    const requestedEnd = requestedStart + TRAINING_DURATION_MINUTES;

    return !bookings.some((b) => {
      if (!b?.date || b.date !== dateStr) return false;
      if (ignoreId && b.id === ignoreId) return false;
      const existingStart = timeToMinutes(b.time);
      if (existingStart === null) return false;
      const existingEnd = existingStart + TRAINING_DURATION_MINUTES;
      return requestedStart < existingEnd && requestedEnd > existingStart;
    });
  };

  const PURCHASE_STATUS_LABELS = {
    processing: 'В обработке',
    ready: 'Готово к выдаче',
    delivered: 'Выдано',
    cancelled: 'Отменён',
  };

  const fetchBookings = async () => {
    if (!token) return;
    if (!canManageBookings) {
      setBookings([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/admin/bookings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError('Доступ запрещён. Только для администратора.');
        setBookings([]);
        return;
      }
      if (!res.ok) throw new Error('Не удалось загрузить записи');
      const data = await res.json();
      setBookings(data);
    } catch (e) {
      setError(e.message || 'Ошибка загрузки');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    if (!token) return;
    if (!canManageStore) {
      setPurchases([]);
      return;
    }
    setPurchasesLoading(true);
    setPurchasesError('');
    try {
      const res = await fetch(`${API_URL}users/admin/purchase-history/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setPurchasesError('Доступ запрещён. Только для администратора.');
        setPurchases([]);
        return;
      }
      if (!res.ok) throw new Error('Не удалось загрузить покупки');
      const data = await res.json();
      setPurchases(data);
    } catch (e) {
      setPurchasesError(e.message || 'Ошибка загрузки');
      setPurchases([]);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!token) return;
    if (!canManageStore) {
      setProducts([]);
      return;
    }
    productsFetchInFlightRef.current = true;
    setProductsLoading(true);
    setProductsError('');
    try {
      const res = await fetch(`${API_URL}users/admin/shop-products/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setProductsError('Доступ запрещён. Только для менеджера заказов.');
        setProducts([]);
        return;
      }
      if (!res.ok) throw new Error('Не удалось загрузить товары');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setProductsError(e.message || 'Ошибка загрузки товаров');
      setProducts([]);
    } finally {
      productsFetchInFlightRef.current = false;
      setProductsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (!token) return;
    if (!isSuperuser) return;
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const res = await fetch(`${API_URL}users/admin/profiles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setProfilesError('Доступ запрещён. Только для superuser.');
        setProfiles([]);
        return;
      }
      if (!res.ok) throw new Error('Не удалось загрузить профили');
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e) {
      setProfilesError(e.message || 'Ошибка загрузки профилей');
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchBookings();
      fetchPurchases();
      fetchProducts();
      if (isSuperuser) fetchProfiles();
      if (!canManageBookings && canManageStore) setAdminTab('store_products');
      if (canManageBookings && !canManageStore) setAdminTab('bookings');
      if (isSuperuser && adminTab === 'profiles') fetchProfiles();
    } else if (!isOpen) {
      setBookings([]);
      setError('');
      setEditingId(null);
      setDeleteLoadingId(null);
      setPurchases([]);
      setPurchasesError('');
      setPurchasesLoading(false);
      setProducts([]);
      setProductsError('');
      setProductsLoading(false);
      setProductEditingId(null);
      setProductSaving(false);
      setProductDeleteLoadingId(null);
      setProductImageFile(null);
      setSeedDemoLoading(false);
      setProductForm({
        name: '',
        summary: '',
        detail: '',
        composition: '',
        price: '',
        image: '',
        is_active: true,
      });
      consumedOpenStoreProductIdRef.current = null;
      setProfiles([]);
      setProfilesError('');
      setProfilesLoading(false);
      setAdminTab('bookings');
    }
  }, [isOpen, isSuperuser]);

  useEffect(() => {
    const wasOpen = prevModalOpenRef.current;
    prevModalOpenRef.current = isOpen;
    if (isOpen && !wasOpen && openStoreTab && canManageStore) {
      setAdminTab('store_products');
    }
    if (!isOpen) {
      consumedOpenStoreProductIdRef.current = null;
    }
  }, [isOpen, openStoreTab, canManageStore]);

  useEffect(() => {
    if (!isOpen || !token) return;
    if (!canManageBookings || adminTab !== 'bookings') return;
    let cancelled = false;
    (async () => {
      try {
        const lb = localStorage.getItem('admin_header_last_booking_id') || '0';
        const lu = localStorage.getItem('admin_header_last_booking_update_id') || '0';
        const lp = localStorage.getItem('admin_header_last_purchase_id') || '0';
        const q = new URLSearchParams({
          last_booking_id: lb,
          last_booking_update_id: lu,
          last_purchase_id: lp,
        });
        const res = await fetch(`${API_URL}users/admin/header-alerts/?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled || !data.bookings) return;
        localStorage.setItem('admin_header_last_booking_id', String(data.bookings.max_booking_id ?? 0));
        localStorage.setItem(
          'admin_header_last_booking_update_id',
          String(data.bookings.max_booking_update_id ?? 0)
        );
        window.dispatchEvent(new CustomEvent('adminPanelAlertUpdated'));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, adminTab, token, canManageBookings]);

  useEffect(() => {
    if (!isOpen || !token) return;
    if (!canManageStore || adminTab !== 'store_orders') return;
    let cancelled = false;
    (async () => {
      try {
        const lb = localStorage.getItem('admin_header_last_booking_id') || '0';
        const lu = localStorage.getItem('admin_header_last_booking_update_id') || '0';
        const lp = localStorage.getItem('admin_header_last_purchase_id') || '0';
        const q = new URLSearchParams({
          last_booking_id: lb,
          last_booking_update_id: lu,
          last_purchase_id: lp,
        });
        const res = await fetch(`${API_URL}users/admin/header-alerts/?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled || !data.purchases) return;
        localStorage.setItem('admin_header_last_purchase_id', String(data.purchases.max_purchase_id ?? 0));
        window.dispatchEvent(new CustomEvent('adminPanelAlertUpdated'));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, adminTab, token, canManageStore]);

  const startProductCreate = () => {
    setProductEditingId('new');
    setProductsError('');
    setProductImageFile(null);
    setProductForm({
      name: '',
      summary: '',
      detail: '',
      composition: '',
      price: '',
      image: '',
      is_active: true,
    });
  };

  const startProductEdit = (p) => {
    setProductEditingId(p.id);
    setProductsError('');
    setProductImageFile(null);
    setProductForm({
      name: p.name || '',
      summary: p.summary || '',
      detail: p.detail || '',
      composition: p.composition || '',
      price: p.price ?? '',
      image: p.image || '',
      is_active: p.is_active !== false,
    });
  };

  useEffect(() => {
    if (!isOpen || openStoreProductId == null || !canManageStore || adminTab !== 'store_products') return;
    if (productsFetchInFlightRef.current || productsLoading) return;
    const key = String(openStoreProductId);
    if (consumedOpenStoreProductIdRef.current === key) return;
    const p = products.find((x) => x.id === openStoreProductId);
    if (p) {
      consumedOpenStoreProductIdRef.current = key;
      setProductEditingId(p.id);
      setProductsError('');
      setProductForm({
        name: p.name || '',
        summary: p.summary || '',
        detail: p.detail || '',
        composition: p.composition || '',
        price: p.price ?? '',
        image: p.image || '',
        is_active: p.is_active !== false,
      });
      return;
    }
    consumedOpenStoreProductIdRef.current = key;
  }, [isOpen, openStoreProductId, canManageStore, adminTab, products, productsLoading]);

  const cancelProductEdit = () => {
    setProductEditingId(null);
    setProductSaving(false);
    setProductImageFile(null);
  };

  const seedDemoCatalog = async () => {
    if (!token || !canManageStore || products.length > 0) return;
    setSeedDemoLoading(true);
    setProductsError('');
    try {
      for (const p of SHOP_PRODUCTS) {
        const payload = {
          name: p.name,
          summary: p.summary || '',
          detail: p.detail || '',
          composition: p.composition || '',
          price: p.price,
          image: typeof p.image === 'string' ? p.image : '',
          is_active: true,
        };
        const res = await fetch(`${API_URL}users/admin/shop-products/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Не удалось добавить «${p.name}»`);
        }
      }
      await fetchProducts();
      window.dispatchEvent(new CustomEvent('shopCatalogUpdated'));
    } catch (e) {
      setProductsError(e.message || 'Ошибка загрузки демо-каталога');
    } finally {
      setSeedDemoLoading(false);
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const saveProduct = async () => {
    if (!token) return;
    if (!canManageStore) return;
    if (!productEditingId) return;
    setProductSaving(true);
    setProductsError('');
    try {
      const isNew = productEditingId === 'new';
      const url = isNew
        ? `${API_URL}users/admin/shop-products/`
        : `${API_URL}users/admin/shop-products/${productEditingId}/`;
      const method = isNew ? 'POST' : 'PATCH';
      const payload = {
        name: String(productForm.name || '').trim(),
        summary: String(productForm.summary || '').trim(),
        detail: String(productForm.detail || '').trim(),
        composition: String(productForm.composition || '').trim(),
        price: productForm.price === '' ? 0 : Number(productForm.price),
        image: String(productForm.image || '').trim(),
        is_active: !!productForm.is_active,
      };
      if (!payload.name) throw new Error('Введите название товара.');
      if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error('Некорректная цена.');

      const useMultipart = !!productImageFile;
      let res;
      if (useMultipart) {
        const fd = new FormData();
        fd.append('name', payload.name);
        fd.append('summary', payload.summary);
        fd.append('detail', payload.detail);
        fd.append('composition', payload.composition);
        fd.append('price', String(payload.price));
        fd.append('is_active', payload.is_active ? 'true' : 'false');
        fd.append('image', payload.image || '');
        fd.append('image_upload', productImageFile);
        res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      } else {
        res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const parts = [];
        if (errData.detail) parts.push(typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail));
        for (const [k, v] of Object.entries(errData)) {
          if (k === 'detail') continue;
          if (Array.isArray(v)) parts.push(`${k}: ${v.join(' ')}`);
          else if (v && typeof v === 'object') parts.push(`${k}: ${JSON.stringify(v)}`);
          else parts.push(`${k}: ${v}`);
        }
        throw new Error(parts.length ? parts.join('. ') : 'Не удалось сохранить товар');
      }
      const saved = await res.json();
      setProducts((prev) => {
        if (isNew) return [saved, ...prev];
        return prev.map((x) => (x.id === saved.id ? saved : x));
      });
      setProductEditingId(null);
      setProductImageFile(null);
      window.dispatchEvent(new CustomEvent('shopCatalogUpdated'));
    } catch (e) {
      setProductsError(e.message || 'Ошибка сохранения товара');
    } finally {
      setProductSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!token || !canManageStore) return;
    if (!window.confirm('Удалить этот товар? Карточка исчезнет из каталога.')) return;
    setProductDeleteLoadingId(id);
    setProductsError('');
    try {
      const res = await fetch(`${API_URL}users/admin/shop-products/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!(res.ok || res.status === 404)) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Не удалось удалить товар');
      }
      setProducts((prev) => prev.filter((x) => x.id !== id));
      setProductEditingId((prev) => (prev === id ? null : prev));
    } catch (e) {
      setProductsError(e.message || 'Ошибка удаления товара');
    } finally {
      setProductDeleteLoadingId(null);
    }
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditFormData({
      workout_type: b.workout_type,
      date: b.date,
      time: typeof b.time === 'string' ? b.time.slice(0, 5) : b.time,
      trainer: b.trainer || '',
      comments: b.comments || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSaving(false);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'workout_type' || name === 'date') {
        const allowed = getAllowedTimes(
          name === 'workout_type' ? value : next.workout_type,
          name === 'date' ? value : next.date
        );
        const available = allowed.filter((t) => isSlotAvailable(t, name === 'date' ? value : next.date, editingId));
        if (next.time && !available.includes(next.time)) {
          next.time = '';
        }
      }
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editingId || !token) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/admin/bookings/${editingId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_type: editFormData.workout_type,
          date: editFormData.date,
          time: editFormData.time,
          trainer: editFormData.trainer,
          comments: editFormData.comments,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.workout_type?.[0] || 'Ошибка сохранения');
      }
      const updated = await res.json();
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? { ...updated, user_username: updated.user_username || b.user_username, user_phone: updated.user_phone || b.user_phone }
            : b
        )
      );
      setEditingId(null);
    } catch (e) {
      setError(e.message || 'Не удалось сохранить изменения.');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteBooking = async (id) => {
    if (!token || !window.confirm('Удалить эту запись на тренировку?')) return;
    setDeleteLoadingId(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/admin/bookings/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404 || res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setEditingId((prev) => (prev === id ? null : prev));
      } else {
        throw new Error('Не удалось удалить запись.');
      }
    } catch (e) {
      setError(e.message || 'Ошибка удаления');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (!isOpen) return null;
  const allowedTimes = getAllowedTimes(editFormData.workout_type, editFormData.date);
  const availableTimes = allowedTimes.filter((t) => isSlotAvailable(t, editFormData.date, editingId));
  const daysHint = getAllowedDaysText(editFormData.workout_type);

  const shopProductEditorForm = (
    <div className="admin-bookings-edit admin-shop-product-inline-form">
      <div className="admin-bookings-form-group">
        <label>Название</label>
        <input
          type="text"
          name="name"
          value={productForm.name}
          onChange={handleProductFormChange}
          className="admin-bookings-input"
          required
        />
      </div>
      <div className="admin-bookings-form-group">
        <label>Фото по ссылке (если не загружаете файл)</label>
        <input
          type="text"
          name="image"
          value={productForm.image}
          onChange={handleProductFormChange}
          className="admin-bookings-input"
          placeholder="/img/icons/1.jpg или https://…"
        />
      </div>
      <div className="admin-bookings-form-group">
        <label>Фото с компьютера (JPG, PNG до 5 МБ — при сохранении заменит ссылку)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="admin-bookings-input admin-bookings-input_file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setProductImageFile(f || null);
            e.target.value = '';
          }}
        />
        {productImageFile && (
          <p className="admin-shop-product-file-hint">Выбран файл: {productImageFile.name}</p>
        )}
      </div>
      <div className="admin-bookings-form-group">
        <label>Краткое описание (в списке магазина)</label>
        <input
          type="text"
          name="summary"
          value={productForm.summary}
          onChange={handleProductFormChange}
          className="admin-bookings-input"
        />
      </div>
      <div className="admin-bookings-form-group">
        <label>Подробное описание (в окне товара)</label>
        <textarea
          name="detail"
          value={productForm.detail}
          onChange={handleProductFormChange}
          className="admin-bookings-input admin-bookings-input_textarea"
          rows={3}
        />
      </div>
      <div className="admin-bookings-form-group">
        <label>Состав</label>
        <input
          type="text"
          name="composition"
          value={productForm.composition}
          onChange={handleProductFormChange}
          className="admin-bookings-input"
        />
      </div>
      <div className="admin-bookings-form-group">
        <label>Цена (BYN)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          name="price"
          value={productForm.price}
          onChange={handleProductFormChange}
          className="admin-bookings-input"
        />
      </div>
      <div className="admin-bookings-form-group">
        <label style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
          <input
            type="checkbox"
            name="is_active"
            checked={!!productForm.is_active}
            onChange={handleProductFormChange}
          />
          Активен (показывать в магазине)
        </label>
      </div>
      <div className="admin-bookings-edit-actions">
        <button
          type="button"
          className="admin-bookings-btn admin-bookings-btn_primary"
          onClick={saveProduct}
          disabled={productSaving}
        >
          {productSaving ? 'Сохранение...' : 'Сохранить товар'}
        </button>
        <button
          type="button"
          className="admin-bookings-btn admin-bookings-btn_secondary"
          onClick={cancelProductEdit}
          disabled={productSaving}
        >
          Отмена
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-bookings-overlay">
      <div className="admin-bookings-modal">
        <button type="button" className="admin-bookings-close" onClick={onClose}>×</button>
        <h2>
          {canManageBookings
            ? 'Управление записями'
            : canManageStore
              ? 'Управление магазином'
              : 'Админ-панель'}
        </h2>
        <div className="admin-bookings-tabs">
          {canManageBookings && (
            <button
              type="button"
              className={`admin-bookings-tab ${adminTab === 'bookings' ? 'admin-bookings-tab_active' : ''}`}
              onClick={() => setAdminTab('bookings')}
            >
              <span className="admin-bookings-tab__label">Записи</span>
              {adminAlertBookings && (
                <span
                  className="admin-bookings-tab__dot"
                  title="Новые записи или ответы клиентов"
                  aria-hidden
                />
              )}
            </button>
          )}
          {canManageStore && (
            <button
              type="button"
              className={`admin-bookings-tab ${adminTab === 'store_products' ? 'admin-bookings-tab_active' : ''}`}
              onClick={() => setAdminTab('store_products')}
            >
              <span className="admin-bookings-tab__label">Товары</span>
            </button>
          )}
          {canManageStore && (
            <button
              type="button"
              className={`admin-bookings-tab ${adminTab === 'store_orders' ? 'admin-bookings-tab_active' : ''}`}
              onClick={() => setAdminTab('store_orders')}
            >
              <span className="admin-bookings-tab__label">Заказы</span>
              {adminAlertPurchases && (
                <span
                  className="admin-bookings-tab__dot"
                  title="Новые заказы"
                  aria-hidden
                />
              )}
            </button>
          )}
          {isSuperuser && (
            <button
              type="button"
              className={`admin-bookings-tab ${adminTab === 'profiles' ? 'admin-bookings-tab_active' : ''}`}
              onClick={() => setAdminTab('profiles')}
            >
              Профили
            </button>
          )}
        </div>

        {!canManageBookings && !canManageStore && !isSuperuser && (
          <p className="admin-bookings-error">Для вашего аккаунта не выданы права администратора панели.</p>
        )}

        {adminTab === 'bookings' && (
          <>
            {error && <p className="admin-bookings-error">{error}</p>}

            {loading ? (
              <div className="admin-bookings-loading">Загрузка...</div>
            ) : bookings.length === 0 && !error ? (
              <p className="admin-bookings-empty">Записей пока нет.</p>
            ) : (
              <ul className="admin-bookings-list">
                {bookings.map((b) => (
                  <li key={b.id} className="admin-bookings-item">
                    {editingId === b.id ? (
                      <div className="admin-bookings-edit">
                        <div className="admin-bookings-form-group">
                          <label>Пользователь</label>
                          <span className="admin-bookings-user-readonly">{b.user_username}</span>
                        </div>
                        <div className="admin-bookings-form-group">
                          <label>Телефон</label>
                          <span className="admin-bookings-user-readonly">{b.user_phone || 'Не указан'}</span>
                        </div>
                        <div className="admin-bookings-form-group">
                          <label>Тип тренировки</label>
                          <select
                            name="workout_type"
                            value={editFormData.workout_type}
                            onChange={handleEditFormChange}
                            className="admin-bookings-input"
                            required
                          >
                            {WORKOUT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {daysHint && <span className="admin-bookings-user-readonly">{daysHint}</span>}
                        </div>
                        <div className="admin-bookings-form-group">
                          <label>Дата</label>
                          <input
                            type="date"
                            name="date"
                            value={editFormData.date}
                            onChange={handleEditFormChange}
                            className="admin-bookings-input"
                            required
                          />
                        </div>
                        <div className="admin-bookings-form-group">
                          <label>Время</label>
                          <select
                            name="time"
                            value={editFormData.time}
                            onChange={handleEditFormChange}
                            className="admin-bookings-input"
                            required
                            disabled={!editFormData.workout_type || !editFormData.date || availableTimes.length === 0}
                          >
                            <option value="">
                              {editFormData.workout_type && editFormData.date
                                ? availableTimes.length
                                  ? 'Выберите время'
                                  : 'В этот день время недоступно'
                                : 'Сначала выберите тренировку и дату'}
                            </option>
                            {availableTimes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="admin-bookings-form-group">
                          <label>Тренер</label>
                          <input
                            type="text"
                            name="trainer"
                            value={editFormData.trainer}
                            onChange={handleEditFormChange}
                            className="admin-bookings-input"
                            placeholder="Необязательно"
                          />
                        </div>
                        <div className="admin-bookings-form-group">
                          <label>Комментарий</label>
                          <textarea
                            name="comments"
                            value={editFormData.comments}
                            onChange={handleEditFormChange}
                            className="admin-bookings-input admin-bookings-input_textarea"
                            rows={2}
                            placeholder="Необязательно"
                          />
                        </div>
                        <div className="admin-bookings-edit-actions">
                          <button
                            type="button"
                            className="admin-bookings-btn admin-bookings-btn_primary"
                            onClick={saveEdit}
                            disabled={editSaving}
                          >
                            {editSaving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button
                            type="button"
                            className="admin-bookings-btn admin-bookings-btn_secondary"
                            onClick={cancelEdit}
                            disabled={editSaving}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="admin-bookings-user">{b.user_username}</span>
                        <span className="admin-bookings-phone">Телефон: {b.user_phone || 'Не указан'}</span>
                        <span className="admin-bookings-type">{b.workout_type_display}</span>
                        <span className="admin-bookings-datetime">
                          {new Date(b.date).toLocaleDateString('ru-RU')} в {typeof b.time === 'string' ? b.time.slice(0, 5) : b.time}
                        </span>
                        {b.trainer && <span className="admin-bookings-trainer">Тренер: {b.trainer}</span>}
                        <div className="admin-bookings-actions">
                          <button
                            type="button"
                            className="admin-bookings-action-btn admin-bookings-action-btn_edit"
                            onClick={() => startEdit(b)}
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            className="admin-bookings-action-btn admin-bookings-action-btn_delete"
                            onClick={() => deleteBooking(b.id)}
                            disabled={deleteLoadingId === b.id}
                          >
                            {deleteLoadingId === b.id ? 'Удаление...' : 'Удалить'}
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {adminTab === 'store_products' && (
          <>
            <h3 className="admin-bookings-title">Товары (карточки магазина)</h3>
            {productsError && <p className="admin-bookings-error">{productsError}</p>}
            {productsLoading ? (
              <div className="admin-bookings-loading">Загрузка товаров...</div>
            ) : (
              <>
                <div
                  className="admin-bookings-actions"
                  style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}
                >
                  <button
                    type="button"
                    className="admin-bookings-action-btn admin-bookings-action-btn_edit"
                    onClick={startProductCreate}
                    disabled={!!productEditingId}
                  >
                    Добавить товар
                  </button>
                  {products.length === 0 && (
                    <button
                      type="button"
                      className="admin-bookings-btn admin-bookings-btn_secondary"
                      onClick={seedDemoCatalog}
                      disabled={seedDemoLoading || !!productEditingId}
                    >
                      {seedDemoLoading ? 'Загрузка…' : 'Заполнить демо-каталог с сайта'}
                    </button>
                  )}
                </div>

                {productEditingId === 'new' && (
                  <div className="admin-bookings-item admin-shop-product-card admin-shop-product-card--editing">
                    <span className="admin-bookings-type">Новый товар</span>
                    {shopProductEditorForm}
                  </div>
                )}

                {products.length === 0 && productEditingId !== 'new' && (
                  <p className="admin-bookings-empty">
                    На сервере нет товаров — в магазине у посетителей могли показываться только демо-карточки без
                    связи с каталогом. Нажмите «Заполнить демо-каталог с сайта», чтобы перенести их в базу и
                    включить редактирование, либо создайте товар вручную.
                  </p>
                )}
                {products.length > 0 && (
                  <ul className="admin-bookings-list">
                    {products.map((p) => (
                      <li
                        key={`product-${p.id}`}
                        className={`admin-bookings-item admin-shop-product-card${
                          productEditingId === p.id ? ' admin-shop-product-card--editing' : ''
                        }`}
                      >
                        {productEditingId === p.id ? (
                          <>
                            <span className="admin-bookings-type">Редактирование: {p.name}</span>
                            {shopProductEditorForm}
                          </>
                        ) : (
                          <>
                            <span className="admin-bookings-type">{p.name}</span>
                            <span className="admin-bookings-datetime">
                              Цена: {Number(p.price || 0).toLocaleString('ru-RU')} BYN •{' '}
                              {p.is_active ? 'Активен' : 'Скрыт'}
                            </span>
                            <div className="admin-bookings-actions">
                              <button
                                type="button"
                                className="admin-bookings-action-btn admin-bookings-action-btn_edit"
                                onClick={() => startProductEdit(p)}
                                disabled={!!productEditingId}
                              >
                                Изменить
                              </button>
                              <button
                                type="button"
                                className="admin-bookings-action-btn admin-bookings-action-btn_delete"
                                onClick={() => deleteProduct(p.id)}
                                disabled={productDeleteLoadingId === p.id || !!productEditingId}
                              >
                                {productDeleteLoadingId === p.id ? 'Удаление...' : 'Удалить'}
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        {adminTab === 'store_orders' && (
          <>
            <h3 className="admin-bookings-title">Заказы пользователей</h3>
            {purchasesError && <p className="admin-bookings-error">{purchasesError}</p>}
            {purchasesLoading ? (
              <div className="admin-bookings-loading">Загрузка...</div>
            ) : purchases.length === 0 && !purchasesError ? (
              <p className="admin-bookings-empty">Покупок пока нет.</p>
            ) : (
              <ul className="admin-bookings-list">
                {purchases.map((p) => (
                  <li key={p.id} className="admin-bookings-item">
                    <span className="admin-bookings-user">
                      {p.user_username || p.full_name || 'Пользователь'}
                    </span>
                    <span className="admin-bookings-phone">Телефон: {p.user_phone || p.phone || 'Не указан'}</span>
                    <span className="admin-bookings-type">Товар: {p.product_name}</span>
                    <span className="admin-bookings-datetime">
                      Оформлен: {formatOrderPlacedAt(p.created_at)}
                    </span>
                    <span className="admin-bookings-datetime">
                      Кол-во: {p.quantity} • Сумма: {Number(p.total_price).toLocaleString('ru-RU')} BYN
                    </span>
                    <span className="admin-bookings-datetime">
                      Статус: {PURCHASE_STATUS_LABELS[p.status] || p.status}
                    </span>
                    <div className="admin-bookings-actions">
                      <select
                        className="admin-bookings-input"
                        value={p.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            const res = await fetch(`${API_URL}users/admin/purchase-history/${p.id}/`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            if (!res.ok) throw new Error('Не удалось обновить статус');
                            const updated = await res.json();
                            setPurchases((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
                          } catch (err) {
                            setPurchasesError(err.message || 'Ошибка обновления');
                          }
                        }}
                      >
                        <option value="processing">В обработке</option>
                        <option value="ready">Готово к выдаче</option>
                        <option value="delivered">Выдано</option>
                        <option value="cancelled">Отменён</option>
                      </select>
                      <button
                        type="button"
                        className="admin-bookings-action-btn admin-bookings-action-btn_delete"
                        onClick={async () => {
                          if (!window.confirm('Отменить этот заказ?')) return;
                          try {
                            const res = await fetch(`${API_URL}users/admin/purchase-history/${p.id}/`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ status: 'cancelled' }),
                            });
                            if (!res.ok) throw new Error('Не удалось отменить заказ');
                            const updated = await res.json();
                            setPurchases((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
                          } catch (err) {
                            setPurchasesError(err.message || 'Ошибка отмены');
                          }
                        }}
                        disabled={p.status === 'cancelled'}
                      >
                        Отменить
                      </button>
                      <button
                        type="button"
                        className="admin-bookings-action-btn admin-bookings-action-btn_delete"
                        onClick={async () => {
                          if (!window.confirm('Удалить этот заказ безвозвратно?')) return;
                          try {
                            const res = await fetch(`${API_URL}users/admin/purchase-history/${p.id}/`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!(res.status === 404 || res.ok)) throw new Error('Не удалось удалить заказ');
                            setPurchases((prev) => prev.filter((x) => x.id !== p.id));
                          } catch (err) {
                            setPurchasesError(err.message || 'Ошибка удаления');
                          }
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {adminTab === 'profiles' && isSuperuser && (
          <>
            {profilesError && <p className="admin-bookings-error">{profilesError}</p>}
            {profilesLoading ? (
              <div className="admin-bookings-loading">Загрузка профилей...</div>
            ) : profiles.length === 0 && !profilesError ? (
              <p className="admin-bookings-empty">Профили отсутствуют.</p>
            ) : (
              <ul className="admin-bookings-list">
                {profiles.map((p) => (
                  <li key={p.id} className="admin-bookings-item">
                    <span className="admin-bookings-user">{p.username}</span>
                    <span className="admin-bookings-datetime">Email: {p.email || '—'}</span>
                    <span className="admin-bookings-datetime">Имя: {p.first_name || '—'} {p.last_name || ''}</span>
                    <span className="admin-bookings-phone">Телефон: {p.phone || 'Не указан'}</span>
                    <span className="admin-bookings-datetime">
                      Дата рождения: {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString('ru-RU') : '—'}
                    </span>
                    <span className="admin-bookings-datetime">Доступ админа: {p.is_staff ? 'Есть' : 'Нет'}</span>
                    <div className="admin-bookings-actions">
                      <button
                        type="button"
                        className="admin-bookings-action-btn admin-bookings-action-btn_delete"
                        onClick={async () => {
                          if (!window.confirm(`Удалить профиль пользователя ${p.username}?`)) return;
                          try {
                            const res = await fetch(`${API_URL}users/admin/profiles/${p.id}/`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!(res.status === 404 || res.ok)) throw new Error('Не удалось удалить профиль');
                            setProfiles((prev) => prev.filter((x) => x.id !== p.id));
                          } catch (err) {
                            setProfilesError(err.message || 'Ошибка удаления профиля');
                          }
                        }}
                        disabled={p.is_superuser}
                        title={p.is_superuser ? 'Нельзя удалить superuser' : 'Удалить профиль'}
                      >
                        Удалить профиль
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminBookingsModal;
