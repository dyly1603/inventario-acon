import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Monitor, KeyRound, Mail, Lock } from 'lucide-react';

export function Login({ setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setAuth(res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Monitor size={48} color="#0d9488" style={{ marginBottom: '10px' }} />
          <h2 style={{ margin: 0, color: '#0f172a' }}>Grupo Acón</h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Sistema de Inventario TI</p>
        </div>
        
        {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="Ingresa tu usuario pai" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Ingresar al Sistema
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => navigate('/recuperar')} style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setMensaje(''); setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMensaje(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar correo');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a', textAlign: 'center' }}>Recuperar Acceso</h2>
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
        
        {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{mensaje}</div>}
        {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleRecuperar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Tu correo electrónico..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar Enlace</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Volver al Login</button>
        </div>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', { token, newPassword });
      setMensaje(res.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Enlace inválido o expirado');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a', textAlign: 'center' }}>Nueva Contraseña</h2>
        {mensaje && <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{mensaje}</div>}
        {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Escribe tu nueva contraseña..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar y Entrar</button>
        </form>
      </div>
    </div>
  );
}