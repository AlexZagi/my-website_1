import logoImg from './../../img/icons/logo-neon.svg'
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
  const [adminModalOpenStore, setAdminModalOpenStore] = useState(false);
  const [adminModalStoreProductId, setAdminModalStoreProductId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [canManageBookings, setCanManageBookings] = useState(false);
  const [canManageStore, setCanManageStore] = useState(false);
  const [username, setUsername] = useState(''); // Логин текущего пользователя
  const [hasBookingAlert, setHasBookingAlert] = useState(false);
  const [hasAdminPanelAlert, setHasAdminPanelAlert] = useState(false);
  const [adminAlertBookings, setAdminAlertBookings] = useState(false);
  const [adminAlertPurchases, setAdminAlertPurchases] = useState(false);
  const navigate = useNavigate();
  const API_URL = 'http://127.0.0.1:8000/api/';

  const checkLoginStatus = () => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
    setUsername(localStorage.getItem('username') || '');
    setIsStaff(localStorage.getItem('is_staff') === 'true');
    setIsSuperuser(localStorage.getItem('is_superuser') === 'true');
    setCanManageBookings(localStorage.getItem('can_manage_bookings') === 'true');
    setCanManageStore(localStorage.getItem('can_manage_store') === 'true');
    if (!token) {
      setHasBookingAlert(false);
      setHasAdminPanelAlert(false);
      setAdminAlertBookings(false);
      setAdminAlertPurchases(false);
    }
  };

  const fetchBookingAlerts = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setHasBookingAlert(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}users/training-booking-updates/alerts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setHasBookingAlert(false);
        return;
      }
      const data = await res.json();
      setHasBookingAlert(!!data?.has_unseen);
    } catch {
      setHasBookingAlert(false);
    }
  }, []);

  const fetchAdminPanelAlerts = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setHasAdminPanelAlert(false);
      setAdminAlertBookings(false);
      setAdminAlertPurchases(false);
      return;
    }
    const book = localStorage.getItem('can_manage_bookings') === 'true';
    const store = localStorage.getItem('can_manage_store') === 'true';
    if (!book && !store) {
      setHasAdminPanelAlert(false);
      setAdminAlertBookings(false);
      setAdminAlertPurchases(false);
      return;
    }
    const lb = localStorage.getItem('admin_header_last_booking_id') || '0';
    const lu = localStorage.getItem('admin_header_last_booking_update_id') || '0';
    const lp = localStorage.getItem('admin_header_last_purchase_id') || '0';
    try {
      const q = new URLSearchParams({
        last_booking_id: lb,
        last_booking_update_id: lu,
        last_purchase_id: lp,
      });
      const res = await fetch(`${API_URL}users/admin/header-alerts/?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setHasAdminPanelAlert(false);
        setAdminAlertBookings(false);
        setAdminAlertPurchases(false);
        return;
      }
      const data = await res.json();
      const bNews = !!(book && data.bookings?.has_news);
      const pNews = !!(store && data.purchases?.has_news);
      setAdminAlertBookings(bNews);
      setAdminAlertPurchases(pNews);
      setHasAdminPanelAlert(bNews || pNews);
    } catch {
      setHasAdminPanelAlert(false);
      setAdminAlertBookings(false);
      setAdminAlertPurchases(false);
    }
  }, []);

  useEffect(() => {
    const openAuthFromPage = () => setShowAuthModal(true);
    window.addEventListener('openAuthModal', openAuthFromPage);
    return () => window.removeEventListener('openAuthModal', openAuthFromPage);
  }, []);

  useEffect(() => {
    const openAdminFromPage = (e) => {
      const d = e.detail || {};
      if (d.tab === 'store') {
        setAdminModalOpenStore(true);
        setAdminModalStoreProductId(d.productId != null ? d.productId : null);
      } else {
        setAdminModalOpenStore(false);
        setAdminModalStoreProductId(null);
      }
      setShowAdminBookingsModal(true);
    };
    window.addEventListener('openAdminBookingsModal', openAdminFromPage);
    return () => window.removeEventListener('openAdminBookingsModal', openAdminFromPage);
  }, []);

  useEffect(() => {
    checkLoginStatus(); // Проверяем статус при монтировании компонента
    fetchBookingAlerts();
    fetchAdminPanelAlerts();

    const handleStorageChange = () => {
      checkLoginStatus(); // Обновляем статус при изменении localStorage
      fetchBookingAlerts();
      fetchAdminPanelAlerts();
    };

    const handleLoginStatusChange = () => {
      checkLoginStatus();
      fetchBookingAlerts();
      fetchAdminPanelAlerts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStatusChange', handleLoginStatusChange);
    const handleBookingAlertUpdated = () => fetchBookingAlerts();
    window.addEventListener('bookingAlertUpdated', handleBookingAlertUpdated);
    const handleAdminPanelAlertUpdated = () => fetchAdminPanelAlerts();
    window.addEventListener('adminPanelAlertUpdated', handleAdminPanelAlertUpdated);

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
    const refreshAlertsOnFocus = () => {
      fetchBookingAlerts();
      fetchAdminPanelAlerts();
    };
    window.addEventListener('focus', refreshAlertsOnFocus);
    const alertsInterval = window.setInterval(() => {
      fetchBookingAlerts();
      fetchAdminPanelAlerts();
    }, 10000);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStatusChange', handleLoginStatusChange);
      window.removeEventListener('bookingAlertUpdated', handleBookingAlertUpdated);
      window.removeEventListener('adminPanelAlertUpdated', handleAdminPanelAlertUpdated);
      window.removeEventListener('focus', refreshAlertsOnFocus);
      window.clearInterval(alertsInterval);
    };
  }, [fetchBookingAlerts, fetchAdminPanelAlerts, lastScrollY]);


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
    localStorage.removeItem('is_superuser');
    localStorage.removeItem('can_manage_bookings');
    localStorage.removeItem('can_manage_store');
    setIsLoggedIn(false);
    setIsStaff(false);
    setIsSuperuser(false);
    setCanManageBookings(false);
    setCanManageStore(false);
    setUsername('');
    window.dispatchEvent(new CustomEvent('loginStatusChange'));
    alert('Вы успешно вышли из системы.');
    navigate('/');
  };

  const handleOpenAdminBookingsModal = () => {
    setAdminModalOpenStore(false);
    setAdminModalStoreProductId(null);
    setShowAdminBookingsModal(true);
  };

  const handleCloseAdminBookingsModal = () => {
    setShowAdminBookingsModal(false);
    setAdminModalOpenStore(false);
    setAdminModalStoreProductId(null);
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
              {!isLoggedIn && (
                <>
                  <li><a href="/#about" className="header_link_button">О клубе</a></li>
                  <li><a href="/#contacts" className="header_link_button">Контакты</a></li>
                </>
              )}
              {(!isLoggedIn || (!isStaff && !isSuperuser) || canManageStore) && (
                <li>
                  <Link to="/pitanie" className="header_link_button">
                    {canManageStore && isLoggedIn ? 'Магазин' : 'Питание'}
                  </Link>
                </li>
              )}
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
              {isLoggedIn && !isStaff && <li><button onClick={handleOpenSignUpModal} className="header_link_button">Записаться</button></li>}
              {isLoggedIn && (isSuperuser || isStaff) && (isSuperuser || canManageBookings || canManageStore) && (
                <li>
                  <button
                    type="button"
                    onClick={handleOpenAdminBookingsModal}
                    className="header_link_button header_profile_link"
                  >
                    <span>Админ-панель</span>
                    {hasAdminPanelAlert && (
                      <span
                        className="header_bell_button header_bell_button--active"
                        title="Есть обновления: новые записи, ответы клиентов или заказы"
                        aria-label="Есть уведомления в админ-панели"
                      >
                        🔔
                      </span>
                    )}
                  </button>
                </li>
              )}
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
      <AdminBookingsModal
        isOpen={showAdminBookingsModal}
        onClose={handleCloseAdminBookingsModal}
        openStoreTab={adminModalOpenStore}
        openStoreProductId={adminModalStoreProductId}
        adminAlertBookings={adminAlertBookings}
        adminAlertPurchases={adminAlertPurchases}
      />
    </header>
  );
}

export default Header;
