import React from 'react';
import './TrainingsModal.css'; // Импорт CSS для модального окна тренировок

const workouts = [
  {
    id: 1,
    name: 'Кардио-тренировки',
    description: 'Улучшите выносливость и сожгите калории с помощью наших кардио-программ.',
    image: '/img/icons/sport-1.png', // Пример пути к изображению
  },
  {
    id: 2,
    name: 'Силовые тренировки',
    description: 'Нарастите мышечную массу и увеличьте силу под руководством опытных тренеров.',
    image: '/img/icons/sport-2.png', // Предполагается, что у вас есть еще изображения
  },
  {
    id: 3,
    name: 'Йога и растяжка',
    description: 'Расслабьтесь, улучшите гибкость и обретите гармонию с нашими занятиями йогой.',
    image: '/img/icons/sport-3.png',
  },
  {
    id: 4,
    name: 'Функциональные тренировки',
    description: 'Развивайте силу, гибкость и координацию для повседневной жизни.',
    image: '/img/icons/sport-4.png',
  },
];

const TrainingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="modal-close" onClick={onClose}>×</button>
        <h1>Наши тренировки</h1>
        <p>Откройте для себя разнообразие тренировок, предлагаемых нашим фитнес-клубом.</p>
        <div className="workout-list">
          {workouts.map((workout) => (
            <div key={workout.id} className="workout-card">
              <img src={workout.image} alt={workout.name} className="workout-image" />
              <h3>{workout.name}</h3>
              <p>{workout.description}</p>
              <button className="learn-more-btn">Узнать больше</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainingsModal;
