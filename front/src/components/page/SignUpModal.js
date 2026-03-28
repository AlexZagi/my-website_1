import React, { useState } from 'react';
import './SignUpModal.css'; // Импорт CSS для модального окна записи

const API_URL = 'http://127.0.0.1:8000/api/';

// Расписание должно совпадать с WORKOUT_SCHEDULE на бэкенде.
// Ключи дней: 0 = понедельник, 6 = воскресенье (как в Python).
const TRAINING_SCHEDULE = {
  cardio: { 0: ['09:00','18:00'], 2: ['09:00','16:00'], 4: ['09:00','19:00'] },
  strength: { 0: ['11:30','15:00'], 2: ['10:30','17:30'], 4: ['10:30','21:00'] },
  yoga: { 0: ['12:00'], 2: ['12:00'], 4: ['12:00'] },
  functional: { 0: ['13:30'], 2: ['13:30'], 4: ['13:30'] },
  gymnastics: { 1: ['09:00'], 3: ['09:00'], 5: ['09:00'] },
  pilates: { 1: ['10:30'], 3: ['10:30'], 5: ['10:30'] },
  crossfit: { 1: ['12:00'], 3: ['12:00'], 5: ['12:00'] },
  aqua: { 1: ['13:30'], 3: ['13:30'], 5: ['13:30'] },
};

const WEEKDAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

// JS getDay(): 0 = Sunday ... 6 = Saturday
// Переводим в индекс как в Python (0 = Monday ... 6 = Sunday)
const jsDateToPythonWeekday = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const jsDay = d.getDay(); // 0..6 (0 = Sunday)
  return (jsDay + 6) % 7; // 1->0 (Mon), ..., 0->6 (Sun)
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

const SignUpModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    workoutType: '',
    date: '',
    time: '',
    trainer: '',
    comments: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('access_token');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };

    // При смене тренировки или даты пересчитываем доступное время
    if (name === 'workoutType' || name === 'date') {
      const allowed = getAllowedTimes(
        name === 'workoutType' ? value : next.workoutType,
        name === 'date' ? value : next.date
      );
      // Сбрасываем время, если оно не входит в доступные слоты
      if (!allowed.includes(next.time)) {
        next.time = '';
      }
      // Если выбрана дата, но нет доступных слотов — показываем подсказку
      if (next.workoutType && next.date && allowed.length === 0) {
        const daysText = getAllowedDaysText(next.workoutType);
        setError(`На выбранную дату эта тренировка не проводится. ${daysText}`.trim());
      } else {
        setError('');
      }
    } else {
      setError('');
    }

    setFormData(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Войдите в аккаунт, чтобы записаться на тренировку.');
      return;
    }

    const allowed = getAllowedTimes(formData.workoutType, formData.date);
    if (!allowed.includes(formData.time)) {
      const daysText = getAllowedDaysText(formData.workoutType);
      setError(`Выберите время в соответствии с расписанием. ${daysText}`.trim());
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}users/training-bookings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_type: formData.workoutType,
          date: formData.date,
          time: formData.time,
          trainer: formData.trainer || '',
          comments: formData.comments || '',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail ||
            errData.workout_type?.[0] ||
            errData.time?.[0] ||
            'Ошибка записи'
        );
      }
      alert('Вы успешно записались на тренировку!');
      setFormData({ workoutType: '', date: '', time: '', trainer: '', comments: '' });
      onClose();
    } catch (e) {
      setError(e.message || 'Не удалось записаться. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allowedTimes = getAllowedTimes(formData.workoutType, formData.date);
  const daysHint = getAllowedDaysText(formData.workoutType);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Записаться на тренировку</h2>
        <p>Сначала выберите тренировку, затем дату и доступное время по расписанию.</p>
        {error && <p className="signup-modal-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="workoutType">Вид тренировки:</label>
            <select
              id="workoutType"
              name="workoutType"
              value={formData.workoutType}
              onChange={handleChange}
              required
            >
              <option value="">Выберите тренировку</option>
              <option value="cardio">Кардио-тренировки</option>
              <option value="strength">Силовые тренировки</option>
              <option value="yoga">Йога и растяжка</option>
              <option value="functional">Функциональные тренировки</option>
              <option value="gymnastics">Гимнастика</option>
              <option value="pilates">Пилатес</option>
              <option value="crossfit">Кроссфит</option>
              <option value="aqua">Аквааэробика</option>
            </select>
            {daysHint && <p className="signup-modal-hint">{daysHint}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="date">Дата:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="time">Время:</label>
            <select
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
              disabled={!formData.workoutType || !formData.date || allowedTimes.length === 0}
            >
              <option value="">
                {formData.workoutType && formData.date
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

          <div className="form-group">
            <label htmlFor="trainer">Тренер:</label>
            <input
              type="text"
              id="trainer"
              name="trainer"
              value={formData.trainer}
              onChange={handleChange}
              placeholder="Имя тренера (необязательно)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="comments">Комментарии:</label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows="4"
              placeholder="Любые пожелания или комментарии"
            ></textarea>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Отправка...' : 'Записаться'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpModal;
