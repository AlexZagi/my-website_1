import React, { useState, useEffect } from 'react';
import './ProfileModal.css'; // Импорт CSS

const API_URL = 'http://127.0.0.1:8000/api/'; // URL вашего бэкенда

const emptyForm = { username: '', email: '', password: '', passwordConfirm: '', name: '', phone: '' };

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(emptyForm);
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Очистить предыдущие ошибки

    if (!isLogin) {
      if (formData.password !== formData.passwordConfirm) {
        setError('Пароли не совпадают.');
        return;
      }
      const byPhoneRegex = /^\+375\d{9}$/;
      const normalizedPhone = String(formData.phone || '').replace(/[^\d+]/g, '');
      if (!byPhoneRegex.test(normalizedPhone)) {
        setError('Введите белорусский номер в формате +375XXXXXXXXX.');
        return;
      }
    }

    let url = '';
    let body = {};

    if (isLogin) {
      url = `${API_URL}token/`;
      body = { username: formData.username, password: formData.password };
    } else {
      url = `${API_URL}users/register/`;
      body = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.passwordConfirm,
        first_name: formData.name, // Используем name как first_name для регистрации
        last_name: '', // Можно добавить отдельное поле для фамилии
        phone: String(formData.phone || '').replace(/[^\d+]/g, ''),
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          localStorage.setItem('username', formData.username);
          try {
            const profileRes = await fetch(`${API_URL}users/profile/`, {
              headers: { Authorization: `Bearer ${data.access}` },
            });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              localStorage.setItem('is_staff', profileData.is_staff ? 'true' : 'false');
              localStorage.setItem('is_superuser', profileData.is_superuser ? 'true' : 'false');
              localStorage.setItem('can_manage_bookings', profileData.can_manage_bookings ? 'true' : 'false');
              localStorage.setItem('can_manage_store', profileData.can_manage_store ? 'true' : 'false');
            }
          } catch (e) { /* ignore */ }
          window.dispatchEvent(new CustomEvent('loginStatusChange'));
          alert('Авторизация успешна!');
        } else {
          alert('Регистрация успешна! Теперь вы можете войти.');
          setIsLogin(true); // Переключиться на форму входа после регистрации
        }
        onClose();
      } else {
        setError(data.detail || JSON.stringify(data));
      }
    } catch (error) {
      console.error('Ошибка API:', error);
      setError('Произошла ошибка при подключении к серверу.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>

        <h2>{isLogin ? 'Авторизация' : 'Регистрация'}</h2>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div className="modal-tabs">
          <button
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >Войти</button>
          <button
            className={!isLogin ? 'active' : ''}
            onClick={() => setIsLogin(false)}
          >Регистрация</button>
        </div>

        <form onSubmit={handleSubmit}>
                    {/* Поле "Имя пользователя" всегда отображается */}
          <div className="form-group">
            <label>Имя пользователя:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Имя (для регистрации):</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}
          {!isLogin && ( /* Поле Email только для регистрации */
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          )}
          {!isLogin && (
            <div className="form-group">
              <label>Телефон:</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+375291234567"
                pattern="^\+375\d{9}$"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Пароль:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>Повторите пароль:</label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}
          <button type="submit" className="submit-btn">
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
