import React, { useState } from 'react';
import './AboutModal.css';


const AboutModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
      <button className="about-button" onClick={openModal}>О нас</button>
      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>О нас</h2>
            <p>Мы больше, чем просто фитнес-клуб

Мы большая семья, объединенная общими целями и стремлениями! Наш современный клуб является комфортным фитнес-пространством. У нас все условия для занятия спортом, а так же есть зона отдыха, для того, чтобы после тренировки получить нужный для организма отдых! В наличии нашего клуба огромный выбор направлений для укрепления и прокачки вашего тела и здоровья! Удобный режим работы позволит вам самостоятельно управлять своим временем. В любое время, наши двери будут для вас открыты!</p>
            <button className="close-button" onClick={closeModal}>×</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AboutModal;

