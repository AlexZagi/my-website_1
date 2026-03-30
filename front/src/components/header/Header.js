import logoImg from './../../img/icons/fitness.jpg'
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthModal from '../page/ProfileModal';
import ScheduleModal from '../page/ScheduleModal';
import SignUpModal from '../page/SignUpModal';
import ProfileCabinetModal from '../page/ProfileCabinetModal';
import AdminBookingsModal from '../page/AdminBookingsModal';

import './Header.css'



function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false); // Состояние для модального окна авторизации
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showProfileCabinetModal, setShowProfileCabinetModal] = useState(false);
  const [showAdminBookingsModal, setShowAdminBookingsModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [username, setUsername] = useState(''); // Логин текущего пользователя
  const [hasBookingAlert, setHasBookingAlert] = useState(false);
  const navigate = useNavigate();
  const API_URL = 'http://127.0.0.1:8000/api/';

  const checkLoginStatus = () => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
    setUsername(localStorage.getItem('username') || '');
    setIsStaff(localStorage.getItem('is_staff') === 'true');
    if (!token) setHasBookingAlert(false);
  };

  const fetchBookingAlerts = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setHasBookingAlert(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}users/training-bookings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setHasBookingAlert(false);
        return;
      }
      const data = await res.json();
      setHasBookingAlert(Array.isArray(data) && data.some((b) => b.admin_updated));
    } catch {
      setHasBookingAlert(false);
    }
  }, []);

  useEffect(() => {
    const openAuthFromPage = () => setShowAuthModal(true);
    window.addEventListener('openAuthModal', openAuthFromPage);
    return () => window.removeEventListener('openAuthModal', openAuthFromPage);
  }, []);

  useEffect(() => {
    checkLoginStatus(); // Проверяем статус при монтировании компонента
    fetchBookingAlerts();

    const handleStorageChange = () => {
      checkLoginStatus(); // Обновляем статус при изменении localStorage
      fetchBookingAlerts();
    };

    const handleLoginStatusChange = () => {
      checkLoginStatus();
      fetchBookingAlerts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStatusChange', handleLoginStatusChange);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('focus', fetchBookingAlerts);
    const alertsInterval = window.setInterval(() => {
      fetchBookingAlerts();
    }, 10000);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStatusChange', handleLoginStatusChange);
      window.removeEventListener('focus', fetchBookingAlerts);
      window.clearInterval(alertsInterval);
    };
  }, [fetchBookingAlerts, lastScrollY]);


  const handleOpenAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    checkLoginStatus(); // Проверяем статус после закрытия модального окна (на случай успешного входа)
  };

  const handleOpenScheduleModal = () => {
    setShowScheduleModal(true);
  };

  const handleCloseScheduleModal = () => {
    setShowScheduleModal(false);
  };

  const handleOpenSignUpModal = () => {
    setShowSignUpModal(true);
  };

  const handleCloseSignUpModal = () => {
    setShowSignUpModal(false);
  };

  const handleOpenProfileCabinetModal = () => {
    setShowProfileCabinetModal(true);
  };

  const handleCloseProfileCabinetModal = () => {
    setShowProfileCabinetModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_staff');
    setIsLoggedIn(false);
    setIsStaff(false);
    setUsername('');
    window.dispatchEvent(new CustomEvent('loginStatusChange'));
    alert('Вы успешно вышли из системы.');
    navigate('/');
  };

  const handleOpenAdminBookingsModal = () => {
    setShowAdminBookingsModal(true);
  };

  const handleCloseAdminBookingsModal = () => {
    setShowAdminBookingsModal(false);
  };

  return (
    <header className={`header ${isVisible ? 'header--visible' : 'header--hidden'}`}>
      <div className="container">
        <div className="header_row">
          <div className="header_logo">
            <Link to="/"> {/* Логотип ведёт на главную */}
              <img src={logoImg} alt="Logo" />
            </Link>
          </div>
          <div className="header_nav">
            <ul>
              <li><button onClick={handleOpenScheduleModal} className="header_link_button">Расписание</button></li>
              <li><Link to="/pitanie" className="header_link_button">Питание</Link></li>
              {isLoggedIn && (
                <li>
                  <button onClick={handleOpenProfileCabinetModal} className="header_link_button header_profile_link">
                    <span>Личный кабинет</span>
                    {!isStaff && hasBookingAlert && (
                      <span
                        className="header_bell_button header_bell_button--active"
                        title="Есть изменения от администратора"
                        aria-label="Есть уведомления о записях"
                      >
                        🔔
                      </span>
                    )}
                  </button>
                </li>
              )}
              {isLoggedIn && <li><button onClick={handleOpenSignUpModal} className="header_link_button">Записаться</button></li>}
              {isLoggedIn && isStaff && <li><button onClick={handleOpenAdminBookingsModal} className="header_link_button">Управление записями</button></li>}
              <li>
                {isLoggedIn ? (
                  <span className="header_user_block">
                    <span className="header_username">{username}</span>
                    <button onClick={handleLogout} className="header_link_button">Выйти</button>
                  </span>
                ) : (
                  <button onClick={handleOpenAuthModal} className="header_link_button">Войти/Регистрация</button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={handleCloseAuthModal} />
      <ScheduleModal isOpen={showScheduleModal} onClose={handleCloseScheduleModal} />
      <SignUpModal isOpen={showSignUpModal} onClose={handleCloseSignUpModal} />
      <ProfileCabinetModal isOpen={showProfileCabinetModal} onClose={handleCloseProfileCabinetModal} />
      <AdminBookingsModal isOpen={showAdminBookingsModal} onClose={handleCloseAdminBookingsModal} />
    </header>
  );
}

export default Header;
