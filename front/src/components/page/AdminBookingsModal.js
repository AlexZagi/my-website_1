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
    setEditFormData((prev) => ({ ...prev, [name]: value }));
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
          b.id === editingId ? { ...updated, user_username: b.user_username } : b
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
                      <input
                        type="time"
                        name="time"
                        value={editFormData.time}
                        onChange={handleEditFormChange}
                        className="admin-bookings-input"
                        required
                      />
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
