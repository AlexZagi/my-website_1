import React, { useState } from 'react';
import './TimeModal.css';

const AboutModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>

      <button onClick={openModal} className="about-button">
        Режим работы
      </button>


      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeModal}>×</button>
            <h2>РЕЖИМ РАБОТЫ:</h2>

	         <p>
	         Понедельник-Суббота(Выходной: Воскресенье)
	          08:00 до 22:00 </p>


          </div>
        </div>
      )}
    </>
  );
};

export default AboutModal;
