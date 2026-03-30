import React from 'react';
import './ScheduleModal.css'; // Импорт CSS для модального окна расписания

const SCHEDULE = [
  {
    day: 'Понедельник',
    items: [
      { time: ['09:00'," ; ", "18:00"], name: 'Кардио-тренировки' },
      { time: ['11:30'," ; ","15:00"], name: 'Силовые тренировки' },
      { time: '12:00', name: 'Йога и растяжка' },
      { time: '13:30', name: 'Функциональные тренировки' },
    ],
  },
  {
    day: 'Вторник',
    items: [
      { time: '09:00', name: 'Гимнастика' },
      { time: '10:30', name: 'Пилатес' },
      { time: '12:00', name: 'Кроссфит' },
      { time: '13:30', name: 'Аквааэробика' },
    ],
  },
  {
    day: 'Среда',
    items: [
      { time: ['09:00'," ; ", "16:00"], name: 'Кардио-тренировки' },
      { time: ['10:30'," ; ", "17:30"], name: 'Силовые тренировки' },
      { time: '12:00', name: 'Йога и растяжка' },
      { time: '13:30', name: 'Функциональные тренировки' },
    ],
  },
  {
    day: 'Четверг',
    items: [
      { time: '09:00', name: 'Гимнастика' },
      { time: '10:30', name: 'Пилатес' },
      { time: '12:00', name: 'Кроссфит' },
      { time: '13:30', name: 'Аквааэробика' },
    ],
  },
  {
    day: 'Пятница',
    items: [
      { time: ['09:00'," ; ", "19:00"], name: 'Кардио-тренировки' },
      { time: ['10:30'," ; ", "21:00"], name: 'Силовые тренировки' },
      { time: '12:00', name: 'Йога и растяжка' },
      { time: '13:30', name: 'Функциональные тренировки' },
    ],
  },
  {
    day: 'Суббота',
    items: [
      { time: '09:00', name: 'Гимнастика' },
      { time: '10:30', name: 'Пилатес' },
      { time: '12:00', name: 'Кроссфит' },
      { time: '13:30', name: 'Аквааэробика' },
    ],
  },
  {
    day: 'Воскресенье',
    items: [
      { time: '—', name: 'Нет тренировок (выходной)' },
    ],
  },
];

const ScheduleModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content schedule-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Расписание занятий</h2>
        <p>Записаться можно только в указанные дни и время.</p>

        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>День</th>
                <th>Время</th>
                <th>Тренировка</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((dayBlock) =>
                dayBlock.items.map((item, index) => (
                  <tr key={`${dayBlock.day}-${item.time}`}>
                    {index === 0 && (
                      <td rowSpan={dayBlock.items.length} className="schedule-day-cell">
                        {dayBlock.day}
                      </td>
                    )}
                    <td>{item.time}</td>
                    <td>{item.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
