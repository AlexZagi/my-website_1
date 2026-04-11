import React, { useState } from 'react';
import './ContactModal.css';

/**
 * @param {{ variant?: 'footer-button' | 'controlled', isOpen?: boolean, onClose?: () => void }} props
 */
const ContactModal = ({ variant = 'footer-button', isOpen: isOpenProp, onClose }) => {
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
        <button type="button" onClick={openModal} className="about-button">
          Контакты
        </button>
      )}
      {open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-button" onClick={closeModal}>
              ×
            </button>
            <h2>КОНТАКТЫ</h2>
            <p>
              КОРОТКИЙ НОМЕР:
              233
              <br />
              <br />
              ТЕЛЕФОН:
              <br />
              +375298421065
              <br />
              <br />
              АДРЕС:
              <br />
              ЧОНГАРСКАЯ 98
              <br />
              <br />
              EMAIL:
              <br />
              info@eva.by
              <br />
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactModal;
