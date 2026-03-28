import React from 'react';
import AboutModal from './AboutModal';
import ContactModal from './ContactModal';
import TimeModal from './TimeModal';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p>&copy; {new Date().getFullYear()} Все права защищены.</p>
                <ul className="footer-links">
                    <li><AboutModal /></li>
                    <li><ContactModal /></li>
                    <li><TimeModal /></li>
                </ul>
            </div>
        </footer>
    );
};

export default Footer;
