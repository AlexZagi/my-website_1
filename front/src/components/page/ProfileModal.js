import React, { useState, useEffect } from 'react';
import './ProfileModal.css'; // Импорт CSS

const API_URL = 'http://127.0.0.1:8000/api/'; // URL вашего бэкенда

const emptyForm = { username: '', email: '', password: '', passwordConfirm: '', name: '', phone: '' };

function PasswordVisibilityIcon({ passwordVisible }) {
  if (passwordVisible) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Номер Беларуси → +375 и 9 цифр (как на бэкенде). */
function normalizeBelarusPhone(raw) {
  const digitsOnly = String(raw || '').replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('375')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('80')) {
    return `+375${digitsOnly.slice(2)}`;
  }
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    return `+375${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 9) {
    return `+375${digitsOnly}`;
  }
  const stripped = String(raw || '').replace(/[^\d+]/g, '');
  return /^\+375\d{9}$/.test(stripped) ? stripped : null;
}

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(emptyForm);
      setError('');
      setShowPassword(false);
      setShowPasswordConfirm(false);
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
      const normalizedPhone = normalizeBelarusPhone(formData.phone);
      if (!normalizedPhone) {
        setError(
          'Укажите номер Беларуси: после кода страны 9 цифр. Например +375291234567, 375291234567, 80291234567 или 0291234567.'
        );
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
        phone: normalizeBelarusPhone(formData.phone),
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
        if (typeof data === 'object' && data !== null && !data.detail) {
          const parts = [];
          for (const [key, val] of Object.entries(data)) {
            if (Array.isArray(val)) parts.push(`${key}: ${val.join(' ')}`);
            else if (typeof val === 'object' && val !== null) {
              for (const [k2, v2] of Object.entries(val)) {
                parts.push(`${k2}: ${Array.isArray(v2) ? v2.join(' ') : v2}`);
              }
            } else parts.push(`${key}: ${val}`);
          }
          if (parts.length) {
            setError(parts.join('. '));
            return;
          }
        }
        setError(data.detail || (typeof data === 'string' ? data : JSON.stringify(data)));
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
              <label>Телефон (Беларусь):</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+375 (29) 123-45-67 или 8 029 1234567"
                autoComplete="tel"
                required
              />
              <p className="form-hint">
                Допустимо: +375 и 9 цифр, или 375…, 80… (как с городского), 029… без кода страны.
              </p>
            </div>
          )}
          <div className="form-group">
            <label>Пароль:</label>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                className="password-field__input"
              />
              <button
                type="button"
                className="password-field__toggle password-field__toggle--icon"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                <PasswordVisibilityIcon passwordVisible={showPassword} />
              </button>
            </div>
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>Повторите пароль:</label>
              <div className="password-field">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required={!isLogin}
                  className="password-field__input"
                />
                <button
                  type="button"
                  className="password-field__toggle password-field__toggle--icon"
                  onClick={() => setShowPasswordConfirm((v) => !v)}
                  aria-pressed={showPasswordConfirm}
                  aria-label={showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
                  title={showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <PasswordVisibilityIcon passwordVisible={showPasswordConfirm} />
                </button>
              </div>
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
