import React, { useState } from 'react';
import './ContactModal.css';

const AboutModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>

      <button onClick={openModal} className="about-button">
        Контакты
      </button>


      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeModal}>×</button>
            <h2>КОНТАКТЫ</h2>
            <p>
            КОРОТКИЙ НОМЕР:
            233<br/>
            <br/>
            ТЕЛЕФОН:<br/>
            +375298421065<br/>
            <br/>
            АДРЕС:<br />
            ЧОНГАРСКАЯ 98<br/>
            <br/>
            EMAIL:<br/>
            info@eva.by<br/>
            </p>

          </div>
        </div>
      )}
    </>
  );
};

export default AboutModal;
