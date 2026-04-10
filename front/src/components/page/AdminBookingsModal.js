import React, { useState, useEffect } from 'react';
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

function AdminBookingsModal({ isOpen, onClose }) {
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

  const [adminTab, setAdminTab] = useState('bookings'); // 'bookings' | 'store' | 'profiles'
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
      if (!canManageBookings && canManageStore) setAdminTab('store');
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
      setProductForm({
        name: '',
        summary: '',
        detail: '',
        composition: '',
        price: '',
        image: '',
        is_active: true,
      });
      setProfiles([]);
      setProfilesError('');
      setProfilesLoading(false);
      setAdminTab('bookings');
    }
  }, [isOpen, isSuperuser]);

  const startProductCreate = () => {
    setProductEditingId('new');
    setProductsError('');
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

  const cancelProductEdit = () => {
    setProductEditingId(null);
    setProductSaving(false);
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

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Не удалось сохранить товар');
      }
      const saved = await res.json();
      setProducts((prev) => {
        if (isNew) return [saved, ...prev];
        return prev.map((x) => (x.id === saved.id ? saved : x));
      });
      setProductEditingId(null);
    } catch (e) {
      setProductsError(e.message || 'Ошибка сохранения товара');
    } finally {
      setProductSaving(false);
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

  return (
    <div className="admin-bookings-overlay">
      <div className="admin-bookings-modal">
        <button type="button" className="admin-bookings-close" onClick={onClose}>×</button>
        <h2>Управление записями</h2>
        <div className="admin-bookings-tabs">
          {canManageBookings && (
            <button
              type="button"
              className={`admin-bookings-tab ${adminTab === 'bookings' ? 'admin-bookings-tab_active' : ''}`}
              onClick={() => setAdminTab('bookings')}
            >
              Записи
            </button>
          )}
          {canManageStore && (
            <button
              type="button"
              className={`admin-bookings-tab ${adminTab === 'store' ? 'admin-bookings-tab_active' : ''}`}
              onClick={() => setAdminTab('store')}
            >
              Магазин
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

        {adminTab === 'store' && (
          <>
            <h3 className="admin-bookings-title">Товары (карточки магазина)</h3>
            {productsError && <p className="admin-bookings-error">{productsError}</p>}
            {productsLoading ? (
              <div className="admin-bookings-loading">Загрузка товаров...</div>
            ) : (
              <>
                <div className="admin-bookings-actions" style={{ justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="admin-bookings-action-btn admin-bookings-action-btn_edit"
                    onClick={startProductCreate}
                  >
                    Добавить товар
                  </button>
                </div>

                {productEditingId && (
                  <div className="admin-bookings-edit">
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
                      <label>Короткое описание (на карточке)</label>
                      <input
                        type="text"
                        name="summary"
                        value={productForm.summary}
                        onChange={handleProductFormChange}
                        className="admin-bookings-input"
                      />
                    </div>
                    <div className="admin-bookings-form-group">
                      <label>Подробное описание (в модалке)</label>
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
                      <label>Картинка (URL или путь, например `/img/icons/1.jpg`)</label>
                      <input
                        type="text"
                        name="image"
                        value={productForm.image}
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
                )}

                {products.length === 0 ? (
                  <p className="admin-bookings-empty">Товаров пока нет. Нажмите «Добавить товар».</p>
                ) : (
                  <ul className="admin-bookings-list">
                    {products.map((p) => (
                      <li key={`product-${p.id}`} className="admin-bookings-item">
                        <span className="admin-bookings-type">{p.name}</span>
                        <span className="admin-bookings-datetime">
                          Цена: {Number(p.price || 0).toLocaleString('ru-RU')} BYN • {p.is_active ? 'Активен' : 'Скрыт'}
                        </span>
                        <div className="admin-bookings-actions">
                          <button
                            type="button"
                            className="admin-bookings-action-btn admin-bookings-action-btn_edit"
                            onClick={() => startProductEdit(p)}
                          >
                            Изменить
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <h3 className="admin-bookings-title" style={{ marginTop: 18 }}>Заказы пользователей</h3>
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
                    <span className="admin-bookings-datetime">Роль: {p.role === 'manager' ? 'Менеджер' : 'Тренер'}</span>
                    <span className="admin-bookings-datetime">Доступ админа: {p.is_staff ? 'Есть' : 'Нет'}</span>
                    <div className="admin-bookings-actions">
                      <select
                        className="admin-bookings-input"
                        value={p.role}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          try {
                            const res = await fetch(`${API_URL}users/admin/profiles/${p.id}/`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ role: newRole, is_staff: p.is_staff }),
                            });
                            if (!res.ok) throw new Error('Не удалось обновить роль');
                            const updated = await res.json();
                            setProfiles((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
                          } catch (err) {
                            setProfilesError(err.message || 'Ошибка обновления');
                          }
                        }}
                      >
                        <option value="trainer">Тренер</option>
                        <option value="manager">Менеджер заказов</option>
                      </select>
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
