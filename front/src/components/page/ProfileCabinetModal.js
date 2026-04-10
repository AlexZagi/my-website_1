import React, { useState, useEffect, useCallback } from 'react';
import './ProfileCabinetModal.css';
import { loadOrders, removeOrderItem } from '../../utils/shopOrders';
import { Link } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000/api/';
const CURRENCY = 'BYN';

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
const WEEK_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function ProfileCabinetModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'bookings' | 'orders' | 'orders-history'
  const [shopOrders, setShopOrders] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(false);
  const [ordersHistoryViewed, setOrdersHistoryViewed] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
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
  const [bookingNotice, setBookingNotice] = useState('');
  const [bookingUpdates, setBookingUpdates] = useState([]);
  const [bookingUpdatesLoading, setBookingUpdatesLoading] = useState(false);
  const [respondingUpdateId, setRespondingUpdateId] = useState(null);
  const [orderQuantities, setOrderQuantities] = useState({});
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    comment: '',
  });
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const token = localStorage.getItem('access_token');
  const isAdmin = localStorage.getItem('is_staff') === 'true';

  const refreshShopOrders = useCallback(() => {
    setShopOrders(loadOrders());
  }, []);

  const getNumericPrice = (price) => {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const normalized = Number(price.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, ''));
      return Number.isFinite(normalized) ? normalized : 0;
    }
    return 0;
  };

  const getOrderQuantity = (itemId) => {
    const qty = Number(orderQuantities[itemId]);
    if (!Number.isFinite(qty) || qty < 1) return 1;
    return Math.min(99, Math.floor(qty));
  };

  const toIsoDate = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthLabel = startOfMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const firstWeekday = (startOfMonth.getDay() + 6) % 7; // Monday as first day
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const daysGrid = [];
  for (let i = 0; i < firstWeekday; i += 1) daysGrid.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    daysGrid.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
  }
  while (daysGrid.length % 7 !== 0) daysGrid.push(null);

  const pendingBookingIds = new Set(bookingUpdates.map((u) => u.booking));
  const calendarBookings = selectedCalendarDate
    ? bookings.filter((b) => b.date === selectedCalendarDate)
    : bookings;
  const hasReadyPurchases = purchaseHistory.some((p) => p.status === 'ready');
  const hasCancelledPurchases = purchaseHistory.some((p) => p.status === 'cancelled');
  const hasOrdersHistoryAlert = (hasReadyPurchases || hasCancelledPurchases) && !ordersHistoryViewed;
  const cancelledPurchases = purchaseHistory.filter((p) => p.status === 'cancelled');
  const managerPhoneForCancelled = cancelledPurchases.find((p) => p.manager_phone)?.manager_phone || '';

  const PURCHASE_STATUS_LABELS = {
    processing: 'В обработке',
    ready: 'Готово к выдаче',
    delivered: 'Выдано',
    cancelled: 'Отменён',
  };

  useEffect(() => {
    const onShopOrders = () => refreshShopOrders();
    window.addEventListener('shopOrdersUpdated', onShopOrders);
    return () => window.removeEventListener('shopOrdersUpdated', onShopOrders);
  }, [refreshShopOrders]);

  useEffect(() => {
    setOrderQuantities((prev) => {
      const next = {};
      shopOrders.forEach((o) => {
        const prevQty = Number(prev[o.id]);
        next[o.id] = Number.isFinite(prevQty) && prevQty >= 1 ? Math.min(99, Math.floor(prevQty)) : 1;
      });
      return next;
    });
  }, [shopOrders]);

  useEffect(() => {
    if (isOpen && token) {
      fetchProfile();
    } else if (!isOpen) {
      setProfile(null);
      setError('');
      setAvatarPreview(null);
      setAvatarFile(null);
      setActiveTab('profile');
      setEditingId(null);
      setDeleteLoadingId(null);
      setCheckoutItem(null);
      setCheckoutSubmitting(false);
      setBookingNotice('');
      setSelectedCalendarDate('');
      setCalendarMonth(new Date());
      setOrdersHistoryViewed(false);
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onClose();
        return;
      }
      if (!res.ok) throw new Error('Не удалось загрузить профиль');
      const data = await res.json();
      setProfile(data);
      if (data.is_staff !== undefined) {
        localStorage.setItem('is_staff', data.is_staff ? 'true' : 'false');
        localStorage.setItem('is_superuser', data.is_superuser ? 'true' : 'false');
        localStorage.setItem('can_manage_bookings', data.can_manage_bookings ? 'true' : 'false');
        localStorage.setItem('can_manage_store', data.can_manage_store ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('loginStatusChange'));
      }
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : '',
      });
      if (data.avatar) setAvatarPreview(data.avatar);
      else setAvatarPreview(null);
      fetchBookings();
      fetchPurchaseHistory();
      refreshShopOrders();
    } catch (e) {
      setError(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Выберите файл изображения (jpg, png, gif)');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('first_name', formData.first_name);
      form.append('last_name', formData.last_name);
      form.append('email', formData.email);
      form.append('phone', formData.phone);
      if (formData.date_of_birth) form.append('date_of_birth', formData.date_of_birth);
      if (avatarFile) form.append('avatar', avatarFile);

      const res = await fetch(`${API_URL}users/profile/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || JSON.stringify(errData) || 'Ошибка сохранения');
      }
      const data = await res.json();
      setProfile(data);
      if (data.avatar) setAvatarPreview(data.avatar);
      setAvatarFile(null);
      alert('Данные сохранены.');
    } catch (e) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const fetchBookings = async () => {
    if (!token) return;
    setBookingsLoading(true);
    try {
      const res = await fetch(`${API_URL}users/training-bookings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
        if (Array.isArray(data) && data.length > 0) {
          const firstDate = data[0].date;
          setSelectedCalendarDate((prev) => prev || firstDate);
          const [yy, mm] = String(firstDate || '').split('-');
          if (yy && mm) setCalendarMonth(new Date(Number(yy), Number(mm) - 1, 1));
        }
        setBookingNotice('');
      } else {
        setBookings([]);
        setBookingNotice('');
      }
    } catch {
      setBookings([]);
      setBookingNotice('');
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchBookingUpdates = async () => {
    if (!token) return;
    setBookingUpdatesLoading(true);
    try {
      const res = await fetch(`${API_URL}users/training-booking-updates/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookingUpdates(Array.isArray(data) ? data : []);
        setBookingNotice((Array.isArray(data) && data.length > 0)
          ? 'Внимание: есть изменения по вашим записям.'
          : '');
      } else {
        setBookingUpdates([]);
        setBookingNotice('');
      }
    } catch {
      setBookingUpdates([]);
      setBookingNotice('');
    } finally {
      setBookingUpdatesLoading(false);
    }
  };

  const markBookingUpdatesSeen = async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}users/training-booking-updates/seen/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      window.dispatchEvent(new CustomEvent('bookingAlertUpdated'));
    } catch {
      // ignore
    }
  };

  const respondToBookingUpdate = async (updateId, decision) => {
    if (!token) return;
    setRespondingUpdateId(updateId);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/training-booking-updates/${updateId}/respond/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Не удалось обработать изменение.');
      }
      // Обновим список записей и доступных изменений.
      await fetchBookings();
      await fetchBookingUpdates();
      window.dispatchEvent(new CustomEvent('bookingAlertUpdated'));
    } catch (e) {
      setError(e.message || 'Ошибка');
    } finally {
      setRespondingUpdateId(null);
    }
  };

  const fetchPurchaseHistory = async () => {
    if (!token) return;
    setPurchaseHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}users/purchase-history/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchaseHistory(Array.isArray(data) ? data : []);
      } else {
        setPurchaseHistory([]);
      }
    } catch {
      setPurchaseHistory([]);
    } finally {
      setPurchaseHistoryLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    if (isAdmin) {
      setActiveTab('profile');
      return;
    }
    setActiveTab(tab);
    if (tab === 'bookings') {
      if (bookings.length === 0 && !bookingsLoading) {
        fetchBookings();
      }
      fetchBookingUpdates();
      markBookingUpdatesSeen();
    } else if (tab === 'orders') {
      refreshShopOrders();
    } else if (tab === 'orders-history') {
      fetchPurchaseHistory();
      setOrdersHistoryViewed(true);
    } else if (tab === 'profile') {
      setEditingId(null);
    }
  };

  const handleRemoveOrder = (itemId) => {
    if (!window.confirm('Убрать этот товар из заказов?')) return;
    removeOrderItem(itemId);
    refreshShopOrders();
  };

  const handleQuantityChange = (itemId, value) => {
    const parsed = Number(value);
    const safeQty = Number.isFinite(parsed) ? Math.max(1, Math.min(99, Math.floor(parsed))) : 1;
    setOrderQuantities((prev) => ({ ...prev, [itemId]: safeQty }));
  };

  const openCheckout = (orderItem) => {
    setCheckoutItem(orderItem);
    setCheckoutForm((prev) => ({
      ...prev,
      fullName: prev.fullName || `${formData.first_name} ${formData.last_name}`.trim() || profile?.username || '',
      phone: prev.phone || formData.phone || '',
    }));
  };

  const closeCheckout = () => {
    setCheckoutItem(null);
  };

  const handleCheckoutFormChange = (e) => {
    const { name, value } = e.target;
    setCheckoutForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutItem) return;
    if (!token) {
      setError('Требуется авторизация для оформления покупки.');
      return;
    }
    const qty = getOrderQuantity(checkoutItem.id);
    const unitPrice = getNumericPrice(checkoutItem.price);
    const total = unitPrice * qty;

    try {
      setCheckoutSubmitting(true);
      setError('');
      const response = await fetch(`${API_URL}users/purchase-history/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: checkoutItem.productId ? String(checkoutItem.productId) : '',
          product_name: checkoutItem.name,
          unit_price: unitPrice.toFixed(2),
          quantity: qty,
          total_price: total.toFixed(2),
          full_name: checkoutForm.fullName.trim(),
          phone: checkoutForm.phone.trim(),
          address: checkoutForm.address.trim(),
          comment: checkoutForm.comment.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Не удалось оформить покупку.');
      }

      removeOrderItem(checkoutItem.id);
      await fetchPurchaseHistory();
      alert(`Покупка оформлена!\nКоличество: ${qty}\nСумма: ${total.toLocaleString('ru-RU')} ${CURRENCY}`);
      setCheckoutItem(null);
    } catch (e2) {
      setError(e2.message || 'Ошибка оформления покупки.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const startEdit = (b) => {
    if (pendingBookingIds.has(b.id)) return;
    setEditingId(b.id);
    setEditFormData({
      workout_type: b.workout_type,
      date: b.date,
      time: b.time.slice(0, 5),
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
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    if (!editingId || !token) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/training-bookings/${editingId}/`, {
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
      setBookings((prev) => prev.map((b) => (b.id === editingId ? updated : b)));
      setEditingId(null);
    } catch (e) {
      setError(e.message || 'Не удалось сохранить изменения.');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteBooking = async (id) => {
    if (pendingBookingIds.has(id)) return;
    if (!token || !window.confirm('Удалить эту запись на тренировку?')) return;
    setDeleteLoadingId(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/training-bookings/${id}/`, {
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

  const quickRescheduleBooking = async (booking) => {
    if (pendingBookingIds.has(booking.id)) return;
    if (!token) return;
    if (!selectedCalendarDate) {
      setError('Сначала выберите дату в календаре для переноса записи.');
      return;
    }
    if (booking.date === selectedCalendarDate) {
      setError('Выберите другую дату для переноса записи.');
      return;
    }
    setDeleteLoadingId(booking.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/training-bookings/${booking.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_type: booking.workout_type,
          date: selectedCalendarDate,
          time: booking.time.slice(0, 5),
          trainer: booking.trainer || '',
          comments: booking.comments || '',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.time?.[0] || errData.detail || 'Не удалось перенести запись.');
      }
      const updated = await res.json();
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)));
    } catch (e) {
      setError(e.message || 'Ошибка переноса');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-cabinet-overlay">
      <div className="profile-cabinet-modal">
        <button type="button" className="profile-cabinet-close" onClick={onClose}>×</button>
        <h2>Личный кабинет</h2>
        {error && <p className="profile-cabinet-error">{error}</p>}

        {loading ? (
          <div className="profile-cabinet-loading">Загрузка...</div>
        ) : (
          <>
            <div className="profile-cabinet-tabs">
              <button
                type="button"
                className={`profile-cabinet-tab ${activeTab === 'profile' ? 'profile-cabinet-tab_active' : ''}`}
                onClick={() => handleTabChange('profile')}
              >
                Профиль
              </button>
              {!isAdmin && (
                <>
                  <button
                    type="button"
                    className={`profile-cabinet-tab ${activeTab === 'bookings' ? 'profile-cabinet-tab_active' : ''} ${bookingNotice ? 'profile-cabinet-tab_changed' : ''}`}
                    onClick={() => handleTabChange('bookings')}
                  >
                    Мои записи
                  </button>
                  <button
                    type="button"
                    className={`profile-cabinet-tab ${activeTab === 'orders' ? 'profile-cabinet-tab_active' : ''}`}
                    onClick={() => handleTabChange('orders')}
                  >
                    <span className="profile-cabinet-tab-label">
                      Мои заказы
                      {shopOrders.length > 0 && <span className="profile-cabinet-tab-dot" aria-hidden="true" />}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`profile-cabinet-tab ${activeTab === 'orders-history' ? 'profile-cabinet-tab_active' : ''}`}
                    onClick={() => handleTabChange('orders-history')}
                  >
                    <span className="profile-cabinet-tab-label">
                      История заказов
                      {hasOrdersHistoryAlert && <span className="profile-cabinet-tab-dot" aria-hidden="true" />}
                    </span>
                  </button>
                </>
              )}
            </div>

            {activeTab === 'profile' && (
              <>
            <div className="profile-cabinet-avatar-block">
              <div className="profile-cabinet-avatar-wrap">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Аватар" className="profile-cabinet-avatar-img" />
                ) : (
                  <div className="profile-cabinet-avatar-placeholder">
                    {profile?.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <label className="profile-cabinet-avatar-label">
                <span>Изменить фото</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="profile-cabinet-avatar-input"
                />
              </label>
            </div>

            <p className="profile-cabinet-username">Логин: <strong>{profile?.username}</strong></p>

            <form onSubmit={handleSubmit} className="profile-cabinet-form">
              <div className="profile-cabinet-form-group">
                <label>Имя</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="profile-cabinet-input"
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Фамилия</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="profile-cabinet-input"
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="profile-cabinet-input"
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="profile-cabinet-input"
                  placeholder="+375 (99) 123-45-67"
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Дата рождения</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="profile-cabinet-input"
                />
              </div>
              <button type="submit" className="profile-cabinet-submit" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </form>
              </>
            )}

            {!isAdmin && activeTab === 'orders' && (
              <section className="profile-cabinet-orders">
                <h3 className="profile-cabinet-bookings-title">Мои заказы</h3>
                {shopOrders.length === 0 ? (
                  <>
                    <p className="profile-cabinet-bookings-empty">Пока нет товаров. Перейдите в магазин, чтобы добавить их в заказы.</p>
                    <Link
                      to="/pitanie"
                      className="profile-cabinet-btn profile-cabinet-btn_secondary profile-cabinet-orders-shop-link"
                      onClick={onClose}
                    >
                      Перейти в магазин
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="profile-cabinet-orders-actions">
                      <Link
                        to="/pitanie"
                        className="profile-cabinet-btn profile-cabinet-btn_secondary"
                        onClick={onClose}
                      >
                        Купить ещё
                      </Link>
                    </div>
                    <ul className="profile-cabinet-orders-list">
                      {shopOrders.map((o) => (
                        <li key={o.id} className="profile-cabinet-order-item">
                          {o.image && (
                            <div className="profile-cabinet-order-thumb">
                              <img src={o.image} alt={o.name} className="profile-cabinet-order-img" />
                            </div>
                          )}
                          <div className="profile-cabinet-order-body">
                            {(() => {
                              const qty = getOrderQuantity(o.id);
                              const lineTotal = getNumericPrice(o.price) * qty;
                              return (
                                <>
                            <span className="profile-cabinet-order-name">{o.name}</span>
                            <span className="profile-cabinet-order-price">
                              {typeof o.price === 'number' ? o.price.toLocaleString('ru-RU') : o.price} {CURRENCY}
                            </span>
                            <div className="profile-cabinet-order-qty-row">
                              <label htmlFor={`order-qty-${o.id}`} className="profile-cabinet-order-qty-label">Количество:</label>
                              <input
                                id={`order-qty-${o.id}`}
                                type="number"
                                min="1"
                                max="99"
                                value={qty}
                                onChange={(e) => handleQuantityChange(o.id, e.target.value)}
                                className="profile-cabinet-order-qty-input"
                              />
                            </div>
                            <span className="profile-cabinet-order-total">
                              Сумма: {lineTotal.toLocaleString('ru-RU')} {CURRENCY}
                            </span>
                            <span className="profile-cabinet-order-date">
                              {new Date(o.createdAt).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              type="button"
                              className="profile-cabinet-order-buy"
                              onClick={() => openCheckout(o)}
                            >
                              Купить
                            </button>
                            <button
                              type="button"
                              className="profile-cabinet-order-remove"
                              onClick={() => handleRemoveOrder(o.id)}
                            >
                              Убрать из заказов
                            </button>
                                </>
                              );
                            })()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            {!isAdmin && activeTab === 'orders-history' && (
              <section className="profile-cabinet-orders">
                <h3 className="profile-cabinet-bookings-title">История заказов</h3>
                {hasReadyPurchases && (
                  <p className="profile-cabinet-orders-ready-notice">
                    У вас есть заказ, готовый к выдаче. Можно обратиться к администратору для получения.
                  </p>
                )}
                {hasCancelledPurchases && (
                  <p className="profile-cabinet-orders-cancelled-notice">
                    Внимание: отменены заказы: {cancelledPurchases.map((p) => p.product_name).join(', ')}.
                    {' '}Для уточнения отмены свяжитесь с менеджером{managerPhoneForCancelled ? `: ${managerPhoneForCancelled}` : '.'}
                  </p>
                )}
                {purchaseHistoryLoading ? (
                  <p className="profile-cabinet-bookings-loading">Загрузка покупок...</p>
                ) : purchaseHistory.length === 0 ? (
                  <p className="profile-cabinet-bookings-empty">Пока нет оформленных покупок.</p>
                ) : (
                  <ul className="profile-cabinet-purchase-history-list">
                    {purchaseHistory.map((purchase) => (
                      <li key={purchase.id} className="profile-cabinet-purchase-history-item">
                        <div className="profile-cabinet-purchase-history-head">
                          <span className="profile-cabinet-order-name">{purchase.product_name}</span>
                          <span className={`profile-cabinet-purchase-status profile-cabinet-purchase-status_${purchase.status || 'processing'}`}>
                            {PURCHASE_STATUS_LABELS[purchase.status] || 'Статус обновляется'}
                          </span>
                        </div>
                        <span className="profile-cabinet-order-total">
                          Сумма: {Number(purchase.total_price || 0).toLocaleString('ru-RU')} {CURRENCY}
                        </span>
                        <span className="profile-cabinet-order-date">
                          {new Date(purchase.created_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="profile-cabinet-order-timeline">
                          {(purchase.status_timeline || []).map((step) => (
                            <div
                              key={`${purchase.id}-${step.status}`}
                              className={`profile-cabinet-order-timeline-step ${step.changed_at ? 'profile-cabinet-order-timeline-step_done' : ''}`}
                            >
                              <span className="profile-cabinet-order-timeline-status">
                                {step.status === 'created'
                                  ? 'Оформлен'
                                  : PURCHASE_STATUS_LABELS[step.status] || step.status}
                              </span>
                              <span className="profile-cabinet-order-timeline-date">
                                {step.changed_at
                                  ? new Date(step.changed_at).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                  : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!isAdmin && activeTab === 'bookings' && (
            <section className="profile-cabinet-bookings profile-cabinet-bookings_tab">
              <h3 className="profile-cabinet-bookings-title">Мои записи на тренировки</h3>
              <div className="profile-cabinet-calendar">
                <div className="profile-cabinet-calendar-head">
                  <button
                    type="button"
                    className="profile-cabinet-calendar-nav"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  >
                    ←
                  </button>
                  <span className="profile-cabinet-calendar-title">{monthLabel}</span>
                  <button
                    type="button"
                    className="profile-cabinet-calendar-nav"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  >
                    →
                  </button>
                </div>
                <div className="profile-cabinet-calendar-grid profile-cabinet-calendar-grid_weekdays">
                  {WEEK_DAYS_SHORT.map((dayName) => (
                    <span key={dayName} className="profile-cabinet-calendar-weekday">{dayName}</span>
                  ))}
                </div>
                <div className="profile-cabinet-calendar-grid">
                  {daysGrid.map((day, idx) => {
                    if (!day) return <span key={`empty-${idx}`} className="profile-cabinet-calendar-day-empty" />;
                    const dayIso = toIsoDate(day);
                    const dayBookingsCount = bookings.filter((b) => b.date === dayIso).length;
                    return (
                      <button
                        key={dayIso}
                        type="button"
                        className={`profile-cabinet-calendar-day ${selectedCalendarDate === dayIso ? 'profile-cabinet-calendar-day_selected' : ''} ${dayBookingsCount > 0 ? 'profile-cabinet-calendar-day_has-bookings' : ''}`}
                        onClick={() => setSelectedCalendarDate(dayIso)}
                      >
                        <span>{day.getDate()}</span>
                        {dayBookingsCount > 0 && <span className="profile-cabinet-calendar-dot" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {bookingUpdatesLoading ? (
                <p className="profile-cabinet-bookings-loading">Загрузка изменений...</p>
              ) : bookingUpdates.length > 0 ? (
                <>
                  {bookingNotice && <p className="profile-cabinet-bookings-notice">{bookingNotice}</p>}
                  <ul className="profile-cabinet-booking-updates-list">
                    {bookingUpdates.map((u) => (
                      <li key={u.id} className="profile-cabinet-booking-update-item">
                        <div className="profile-cabinet-booking-update-block">
                          <div className="profile-cabinet-booking-update-row">
                            <span className="profile-cabinet-order-name">Было:</span>
                            <span className="profile-cabinet-order-total">
                              {u.old_workout_type_display} — {new Date(u.old_date).toLocaleDateString('ru-RU')} в {String(u.old_time).slice(0, 5)}
                            </span>
                          </div>
                          <div className="profile-cabinet-booking-update-row">
                            <span className="profile-cabinet-order-name">Стало:</span>
                            <span className="profile-cabinet-order-total">
                              {u.new_workout_type_display} — {new Date(u.new_date).toLocaleDateString('ru-RU')} в {String(u.new_time).slice(0, 5)}
                            </span>
                          </div>
                        </div>
                        <div className="profile-cabinet-booking-update-actions">
                          <button
                            type="button"
                            className="profile-cabinet-booking-btn profile-cabinet-booking-btn_accept"
                            onClick={() => respondToBookingUpdate(u.id, 'accepted')}
                            disabled={respondingUpdateId === u.id}
                          >
                            {respondingUpdateId === u.id ? 'Принятие...' : 'Принять'}
                          </button>
                          <button
                            type="button"
                            className="profile-cabinet-booking-btn profile-cabinet-booking-btn_reject"
                            onClick={() => respondToBookingUpdate(u.id, 'rejected')}
                            disabled={respondingUpdateId === u.id}
                          >
                            {respondingUpdateId === u.id ? 'Отклонение...' : 'Отклонить'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {bookingsLoading ? (
                <p className="profile-cabinet-bookings-loading">Загрузка записей...</p>
              ) : calendarBookings.length === 0 ? (
                <p className="profile-cabinet-bookings-empty">У вас пока нет записей на тренировки.</p>
              ) : (
                <ul className="profile-cabinet-bookings-list">
                  {calendarBookings.map((b) => (
                    <li key={b.id} className={`profile-cabinet-booking-item ${b.admin_updated ? 'profile-cabinet-booking-item_changed' : ''}`}>
                      {editingId === b.id ? (
                        <div className="profile-cabinet-booking-edit">
                          <div className="profile-cabinet-form-group">
                            <label>Тип тренировки</label>
                            <select
                              name="workout_type"
                              value={editFormData.workout_type}
                              onChange={handleEditFormChange}
                              className="profile-cabinet-input"
                              required
                            >
                              {WORKOUT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="profile-cabinet-form-group">
                            <label>Дата</label>
                            <input
                              type="date"
                              name="date"
                              value={editFormData.date}
                              onChange={handleEditFormChange}
                              className="profile-cabinet-input"
                              required
                            />
                          </div>
                          <div className="profile-cabinet-form-group">
                            <label>Время</label>
                            <input
                              type="time"
                              name="time"
                              value={editFormData.time}
                              onChange={handleEditFormChange}
                              className="profile-cabinet-input"
                              required
                            />
                          </div>
                          <div className="profile-cabinet-form-group">
                            <label>Тренер</label>
                            <input
                              type="text"
                              name="trainer"
                              value={editFormData.trainer}
                              onChange={handleEditFormChange}
                              className="profile-cabinet-input"
                              placeholder="Необязательно"
                            />
                          </div>
                          <div className="profile-cabinet-form-group">
                            <label>Комментарий</label>
                            <textarea
                              name="comments"
                              value={editFormData.comments}
                              onChange={handleEditFormChange}
                              className="profile-cabinet-input profile-cabinet-input_textarea"
                              rows={2}
                              placeholder="Необязательно"
                            />
                          </div>
                          <div className="profile-cabinet-booking-edit-actions">
                            <button
                              type="button"
                              className="profile-cabinet-btn profile-cabinet-btn_primary"
                              onClick={saveEdit}
                              disabled={editSaving}
                            >
                              {editSaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button
                              type="button"
                              className="profile-cabinet-btn profile-cabinet-btn_secondary"
                              onClick={cancelEdit}
                              disabled={editSaving}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="profile-cabinet-booking-type">{b.workout_type_display}</span>
                          <span className="profile-cabinet-booking-datetime">
                            {new Date(b.date).toLocaleDateString('ru-RU')} в {b.time.slice(0, 5)}
                          </span>
                          {b.trainer && <span className="profile-cabinet-booking-trainer">Тренер: {b.trainer}</span>}
                          <div className="profile-cabinet-booking-actions">
                            <button
                              type="button"
                              className="profile-cabinet-booking-btn profile-cabinet-booking-btn_edit"
                              onClick={() => startEdit(b)}
                              disabled={pendingBookingIds.has(b.id)}
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              className="profile-cabinet-booking-btn profile-cabinet-booking-btn_delete"
                              onClick={() => deleteBooking(b.id)}
                              disabled={deleteLoadingId === b.id || pendingBookingIds.has(b.id)}
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
            </section>
            )}
          </>
        )}
      </div>
      {checkoutItem && (
        <div className="profile-cabinet-checkout-overlay" onClick={closeCheckout}>
          <div className="profile-cabinet-checkout-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="profile-cabinet-close" onClick={closeCheckout}>×</button>
            <h3 className="profile-cabinet-bookings-title">Оформление покупки</h3>
            <p className="profile-cabinet-checkout-product">{checkoutItem.name}</p>
            <p className="profile-cabinet-checkout-total">
              Итого: {(getNumericPrice(checkoutItem.price) * getOrderQuantity(checkoutItem.id)).toLocaleString('ru-RU')} {CURRENCY}
            </p>
            <form className="profile-cabinet-checkout-form" onSubmit={handleCheckoutSubmit}>
              <div className="profile-cabinet-form-group">
                <label>Количество</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={getOrderQuantity(checkoutItem.id)}
                  onChange={(e) => handleQuantityChange(checkoutItem.id, e.target.value)}
                  className="profile-cabinet-input"
                  required
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>ФИО</label>
                <input
                  type="text"
                  name="fullName"
                  value={checkoutForm.fullName}
                  onChange={handleCheckoutFormChange}
                  className="profile-cabinet-input"
                  required
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  name="phone"
                  value={checkoutForm.phone}
                  onChange={handleCheckoutFormChange}
                  className="profile-cabinet-input"
                  required
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Адрес доставки</label>
                <input
                  type="text"
                  name="address"
                  value={checkoutForm.address}
                  onChange={handleCheckoutFormChange}
                  className="profile-cabinet-input"
                  required
                />
              </div>
              <div className="profile-cabinet-form-group">
                <label>Комментарий</label>
                <textarea
                  name="comment"
                  value={checkoutForm.comment}
                  onChange={handleCheckoutFormChange}
                  className="profile-cabinet-input profile-cabinet-input_textarea"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="profile-cabinet-btn profile-cabinet-btn_primary"
                disabled={checkoutSubmitting}
              >
                {checkoutSubmitting ? 'Оформляем...' : 'Подтвердить покупку'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileCabinetModal;
