import React, { useEffect, useState } from 'react';
import './SignUpModal.css'; // Импорт CSS для модального окна записи

const API_URL = 'http://127.0.0.1:8000/api/';
const TRAINING_DURATION_MINUTES = 90;

// Расписание должно совпадать с WORKOUT_SCHEDULE на бэкенде.
// Ключи дней: 0 = понедельник, 6 = воскресенье (как в Python).
const TRAINING_SCHEDULE = {
  cardio: { 0: ['09:00','10:30','12:00','15:00','16:30','18:00'], 2: ['09:00','10:30','12:00','15:30','17:00'], 4: ['09:00','10:30','12:00','14:30','16:00','17:30','19:00'] },
  strength: { 0: ['09:30','11:30','13:30','15:00','16:30','18:00'], 2: ['10:30','12:00','13:30','15:00','17:30'], 4: ['10:30','12:00','13:30','15:00','16:30','18:00','19:30','21:00'] },
  yoga: { 0: ['12:00','13:30','15:00','16:30'], 2: ['12:00','13:30','15:00','16:30'], 4: ['12:00','13:30','15:00','16:30'] },
  functional: { 0: ['13:30','15:00','16:30'], 2: ['13:30','15:00','16:30'], 4: ['13:30','15:00','16:30'] },
  gymnastics: { 1: ['09:00','10:30','12:00','13:30'], 3: ['09:00','10:30','12:00','13:30'], 5: ['09:00','10:30','12:00','13:30'] },
  pilates: { 1: ['10:30','12:00','13:30','15:00'], 3: ['10:30','12:00','13:30','15:00'], 5: ['10:30','12:00','13:30','15:00'] },
  crossfit: { 1: ['12:00','13:30','15:00','16:30'], 3: ['12:00','13:30','15:00','16:30'], 5: ['12:00','13:30','15:00','16:30'] },
  aqua: { 1: ['13:30','15:00','16:30','18:00'], 3: ['13:30','15:00','16:30','18:00'], 5: ['13:30','15:00','16:30','18:00'] },
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

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const val = typeof timeStr === 'string' ? timeStr.slice(0, 5) : String(timeStr);
  const [hh, mm] = val.split(':');
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
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

const getTodayLocalDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Слот по локальной дате/времени уже в прошлом (нельзя записаться). */
const isSlotInPast = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;
  const t = timeStr.slice(0, 5);
  const slot = new Date(`${dateStr}T${t}:00`);
  if (Number.isNaN(slot.getTime())) return true;
  return slot.getTime() <= Date.now();
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
  const [myBookings, setMyBookings] = useState([]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let cancelled = false;
    const fetchMyBookings = async () => {
      try {
        const res = await fetch(`${API_URL}users/training-bookings/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMyBookings(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    };
    fetchMyBookings();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token]);

  const isSlotFreeForMyBookings = (startTimeStr, dateStr) => {
    if (!startTimeStr || !dateStr) return true;
    const requestedStart = timeToMinutes(startTimeStr);
    if (requestedStart === null) return false;
    const requestedEnd = requestedStart + TRAINING_DURATION_MINUTES;
    return !myBookings.some((b) => {
      if (!b?.date || b.date !== dateStr) return false;
      const existingStart = timeToMinutes(b.time);
      if (existingStart === null) return false;
      const existingEnd = existingStart + TRAINING_DURATION_MINUTES;
      return requestedStart < existingEnd && requestedEnd > existingStart;
    });
  };

  const isDuplicateSlotForMe = (workoutType, dateStr, timeStr) => {
    if (!workoutType || !dateStr || !timeStr) return false;
    const t = timeStr.slice(0, 5);
    return myBookings.some((b) => {
      if (!b?.date || b.date !== dateStr || b.workout_type !== workoutType) return false;
      const bt = typeof b.time === 'string' ? b.time.slice(0, 5) : String(b.time).slice(0, 5);
      return bt === t;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };

    // При смене тренировки или даты пересчитываем доступное время
    if (name === 'workoutType' || name === 'date') {
      const dateVal = name === 'date' ? value : next.date;
      const todayStr = getTodayLocalDateStr();
      if (name === 'date' && dateVal && dateVal < todayStr) {
        next.date = '';
        next.time = '';
        setError('Нельзя выбрать прошедшую дату.');
        setFormData(next);
        return;
      }
      const allowed = getAllowedTimes(
        name === 'workoutType' ? value : next.workoutType,
        name === 'date' ? value : next.date
      );
      const dStr = name === 'date' ? value : next.date;
      const wType = name === 'workoutType' ? value : next.workoutType;
      const filtered = allowed.filter(
        (t) =>
          isSlotFreeForMyBookings(t, dStr) &&
          !isSlotInPast(dStr, t) &&
          !isDuplicateSlotForMe(wType, dStr, t)
      );
      // Сбрасываем время, если оно не входит в доступные слоты
      if (!filtered.includes(next.time)) {
        next.time = '';
      }
      // Если выбрана дата, но нет доступных слотов — показываем подсказку
      if (next.workoutType && next.date && filtered.length === 0) {
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

    const todayStr = getTodayLocalDateStr();
    if (!formData.date || formData.date < todayStr) {
      setError('Выберите сегодняшнюю или будущую дату.');
      return;
    }
    if (isSlotInPast(formData.date, formData.time)) {
      setError('Выберите время, которое ещё не прошло.');
      return;
    }
    if (isDuplicateSlotForMe(formData.workoutType, formData.date, formData.time)) {
      setError('Вы уже записаны на эту тренировку в выбранные дату и время.');
      return;
    }
    const allowed = getAllowedTimes(formData.workoutType, formData.date);
    const filtered = allowed.filter(
      (t) =>
        isSlotFreeForMyBookings(t, formData.date) &&
        !isSlotInPast(formData.date, t) &&
        !isDuplicateSlotForMe(formData.workoutType, formData.date, t)
    );
    if (!filtered.includes(formData.time)) {
      const daysText = getAllowedDaysText(formData.workoutType);
      setError(`Выберите доступное время. ${daysText}`.trim());
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
            errData.date?.[0] ||
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

  const todayStr = getTodayLocalDateStr();
  const allowedTimes = getAllowedTimes(formData.workoutType, formData.date);
  const filteredAllowedTimes = allowedTimes.filter(
    (t) =>
      isSlotFreeForMyBookings(t, formData.date) &&
      !isSlotInPast(formData.date, t) &&
      !isDuplicateSlotForMe(formData.workoutType, formData.date, t)
  );
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
              min={todayStr}
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
              disabled={!formData.workoutType || !formData.date || filteredAllowedTimes.length === 0}
            >
              <option value="">
                {formData.workoutType && formData.date
                  ? filteredAllowedTimes.length
                    ? 'Выберите время'
                    : 'В этот день время недоступно'
                  : 'Сначала выберите тренировку и дату'}
              </option>
              {filteredAllowedTimes.map((t) => (
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
