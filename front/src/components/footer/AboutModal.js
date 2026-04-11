import React, { useState } from 'react';
import './AboutModal.css';

/**
 * @param {{ variant?: 'footer-button' | 'controlled', isOpen?: boolean, onClose?: () => void }} props
 */
const AboutModal = ({ variant = 'footer-button', isOpen: isOpenProp, onClose }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = variant === 'controlled';
  const open = isControlled ? !!isOpenProp : internalOpen;

  const closeModal = () => {
    if (isControlled) onClose?.();
    else setInternalOpen(false);
  };

  const openModal = () => setInternalOpen(true);

  return (
    <>
      {!isControlled && (
        <button type="button" className="about-button" onClick={openModal}>
          О нас
        </button>
      )}
      {open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>О нас</h2>
            <p>
              Мы больше, чем просто фитнес-клуб
              <br />
              <br />
              Мы большая семья, объединенная общими целями и стремлениями! Наш современный клуб является
              комфортным фитнес-пространством. У нас все условия для занятия спортом, а так же есть зона
              отдыха, для того, чтобы после тренировки получить нужный для организма отдых! В наличии
              нашего клуба огромный выбор направлений для укрепления и прокачки вашего тела и здоровья!
              Удобный режим работы позволит вам самостоятельно управлять своим временем. В любое время,
              наши двери будут для вас открыты!
            </p>
            <button type="button" className="close-button" onClick={closeModal}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AboutModal;
