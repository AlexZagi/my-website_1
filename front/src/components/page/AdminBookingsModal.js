import React, { useState, useEffect } from 'react';
import './AdminBookingsModal.css';

const API_URL = 'http://127.0.0.1:8000/api/';

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
  cardio: { 0: ['09:00', '18:00'], 2: ['09:00', '16:00'], 4: ['09:00', '19:00'] },
  strength: { 0: ['11:30', '15:00'], 2: ['10:30', '17:30'], 4: ['10:30', '21:00'] },
  yoga: { 0: ['12:00'], 2: ['12:00'], 4: ['12:00'] },
  functional: { 0: ['13:30'], 2: ['13:30'], 4: ['13:30'] },
  gymnastics: { 1: ['09:00'], 3: ['09:00'], 5: ['09:00'] },
  pilates: { 1: ['10:30'], 3: ['10:30'], 5: ['10:30'] },
  crossfit: { 1: ['12:00'], 3: ['12:00'], 5: ['12:00'] },
  aqua: { 1: ['13:30'], 3: ['13:30'], 5: ['13:30'] },
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

  const token = localStorage.getItem('access_token');

  const fetchBookings = async () => {
    if (!token) return;
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

  useEffect(() => {
    if (isOpen && token) {
      fetchBookings();
    } else if (!isOpen) {
      setBookings([]);
      setError('');
      setEditingId(null);
      setDeleteLoadingId(null);
    }
  }, [isOpen]);

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
        if (!allowed.includes(next.time)) {
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
  const daysHint = getAllowedDaysText(editFormData.workout_type);

  return (
    <div className="admin-bookings-overlay">
      <div className="admin-bookings-modal">
        <button type="button" className="admin-bookings-close" onClick={onClose}>×</button>
        <h2>Управление записями на тренировки</h2>
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
                        disabled={!editFormData.workout_type || !editFormData.date || allowedTimes.length === 0}
                      >
                        <option value="">
                          {editFormData.workout_type && editFormData.date
                            ? allowedTimes.length
                              ? 'Выберите время'
                              : 'В этот день время недоступно'
                            : 'Сначала выберите тренировку и дату'}
                        </option>
                        {allowedTimes.map((t) => (
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
      </div>
    </div>
  );
}

export default AdminBookingsModal;
