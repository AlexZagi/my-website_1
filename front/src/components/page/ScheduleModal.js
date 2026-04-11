import React from 'react';
import './ScheduleModal.css'; // Импорт CSS для модального окна расписания

const joinTimes = (times) => times.join(' ; ');

const SCHEDULE = [
  {
    day: 'Понедельник',
    items: [
      { time: joinTimes(['09:00', '10:30', '12:00', '15:00', '16:30', '18:00']), name: 'Кардио-тренировки' },
      { time: joinTimes(['09:30', '11:30', '13:30', '15:00', '16:30', '18:00']), name: 'Силовые тренировки' },
      { time: joinTimes(['12:00', '13:30', '15:00', '16:30']), name: 'Йога и растяжка' },
      { time: joinTimes(['13:30', '15:00', '16:30']), name: 'Функциональные тренировки' },
    ],
  },
  {
    day: 'Вторник',
    items: [
      { time: joinTimes(['09:00', '10:30', '12:00', '13:30']), name: 'Гимнастика' },
      { time: joinTimes(['10:30', '12:00', '13:30', '15:00']), name: 'Пилатес' },
      { time: joinTimes(['12:00', '13:30', '15:00', '16:30']), name: 'Кроссфит' },
      { time: joinTimes(['13:30', '15:00', '16:30', '18:00']), name: 'Аквааэробика' },
    ],
  },
  {
    day: 'Среда',
    items: [
      { time: joinTimes(['09:00', '10:30', '12:00', '15:30', '17:00']), name: 'Кардио-тренировки' },
      { time: joinTimes(['10:30', '12:00', '13:30', '15:00', '17:30']), name: 'Силовые тренировки' },
      { time: joinTimes(['12:00', '13:30', '15:00', '16:30']), name: 'Йога и растяжка' },
      { time: joinTimes(['13:30', '15:00', '16:30']), name: 'Функциональные тренировки' },
    ],
  },
  {
    day: 'Четверг',
    items: [
      { time: joinTimes(['09:00', '10:30', '12:00', '13:30']), name: 'Гимнастика' },
      { time: joinTimes(['10:30', '12:00', '13:30', '15:00']), name: 'Пилатес' },
      { time: joinTimes(['12:00', '13:30', '15:00', '16:30']), name: 'Кроссфит' },
      { time: joinTimes(['13:30', '15:00', '16:30', '18:00']), name: 'Аквааэробика' },
    ],
  },
  {
    day: 'Пятница',
    items: [
      { time: joinTimes(['09:00', '10:30', '12:00', '14:30', '16:00', '17:30', '19:00']), name: 'Кардио-тренировки' },
      { time: joinTimes(['10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00']), name: 'Силовые тренировки' },
      { time: joinTimes(['12:00', '13:30', '15:00', '16:30']), name: 'Йога и растяжка' },
      { time: joinTimes(['13:30', '15:00', '16:30']), name: 'Функциональные тренировки' },
    ],
  },
  {
    day: 'Суббота',
    items: [
      { time: joinTimes(['09:00', '10:30', '12:00', '13:30']), name: 'Гимнастика' },
      { time: joinTimes(['10:30', '12:00', '13:30', '15:00']), name: 'Пилатес' },
      { time: joinTimes(['12:00', '13:30', '15:00', '16:30']), name: 'Кроссфит' },
      { time: joinTimes(['13:30', '15:00', '16:30', '18:00']), name: 'Аквааэробика' },
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
