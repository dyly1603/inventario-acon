import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Search, Plus, Monitor, Laptop, ShieldCheck, Pencil, Trash2, X, ChevronLeft, ChevronRight, Filter, Download, Building, Users, LogOut } from 'lucide-react';
import { Login, RecuperarPassword, ResetPassword } from './login';

// ==========================================
// COMPONENTE: GESTIÓN DE USUARIOS (Solo Admin)
// ==========================================
function UsuariosManager() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'Operario' });

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error('Error al cargar usuarios', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await axios.put(`http://localhost:5000/api/usuarios/${editandoId}`, formData);
      } else {
        await axios.post('http://localhost:5000/api/usuarios', formData);
      }
      setModalOpen(false);
      cargarUsuarios();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Eliminar al usuario ${nombre}?`)) {
      await axios.delete(`http://localhost:5000/api/usuarios/${id}`);
      cargarUsuarios();
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Users /> Control de Accesos y Usuarios</h2>
        <button onClick={() => { setEditandoId(null); setFormData({ nombre: '', email: '', password: '', rol: 'Operario' }); setModalOpen(true); }} style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Nuevo Usuario
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
              <th style={{ padding: '12px' }}>Nombre</th>
              <th style={{ padding: '12px' }}>Correo Electrónico</th>
              <th style={{ padding: '12px' }}>Rol de Acceso</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.nombre}</td>
                <td style={{ padding: '12px' }}>{u.email}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    backgroundColor: u.rol === 'Admin' ? '#fef08a' : (u.rol === 'Lector' ? '#dcfce7' : '#e2e8f0'), 
                    color: u.rol === 'Admin' ? '#854d0e' : (u.rol === 'Lector' ? '#15803d' : '#475569'), 
                    padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' 
                  }}>
                    {u.rol}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => { setEditandoId(u.id); setFormData({ nombre: u.nombre, email: u.email, password: '', rol: u.rol }); setModalOpen(true); }} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}><Pencil size={16} /></button>
                  <button onClick={() => handleEliminar(u.id, u.nombre)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '400px' }}>
            <h3>{editandoId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required type="text" placeholder="Nombre completo" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input required type="email" placeholder="Correo electrónico" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input type="password" placeholder={editandoId ? "Nueva contraseña (dejar en blanco para no cambiar)" : "Contraseña"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editandoId} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <option value="Lector">Lector (Solo visualizar y exportar)</option>
                <option value="Operario">Operario (Puede editar y crear activos)</option>
                <option value="Admin">Administrador (Control total + Usuarios)</option>
              </select>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '10px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px', backgroundColor: '#0d9488', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE: INVENTARIO PRINCIPAL CON SCROLL HORIZONTAL COMPLETO
// ==========================================
function DashboardInventario({ rol }) {
  const [activos, setActivos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [criterioBusqueda, setCriterioBusqueda] = useState('todos');
  const [fincaFiltro, setFincaFiltro] = useState('TODAS');
  const [loading, setLoading] = useState(true);
  const [pestaniaActiva, setPestaniaActiva] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 50;

  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const INITIAL_FORM = { placa: '', serie: '', producto: 'Desktop', marca: '', modelo: '', tipo: '', finca_depto: 'CAF', ubicacion: '', empresa: 'Limofrut SA', asignado_a: '', status: 'Bueno', observaciones: '', traza: '', especificaciones: '' };
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => { obtenerActivos(); }, []);

  const obtenerActivos = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/activos');
      setActivos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar activos:', error);
      setLoading(false);
    }
  };

  const esLaptop = (item) => {
    const p = (item.producto || '').toLowerCase();
    const m = (item.modelo || '').toLowerCase();
    const t = (item.tipo || '').toLowerCase();
    return p.includes('laptop') || m.includes('latitude') || m.includes('vostro') || m.includes('thinkpad') || t.includes('laptop');
  };

  const listaFincas = Array.from(
    new Set(activos.map(a => (a.finca_depto || '').trim().toUpperCase()).filter(Boolean))
  ).sort();

  const activosFiltrados = activos.filter((item) => {
    const laptopCheck = esLaptop(item);
    if (pestaniaActiva === 'todos' && laptopCheck) return false;
    if (pestaniaActiva === 'laptops' && !laptopCheck) return false;

    if (fincaFiltro !== 'TODAS') {
      const fincaItem = (item.finca_depto || '').trim().toUpperCase();
      if (fincaItem !== fincaFiltro) return false;
    }

    if (!busqueda.trim()) return true;

    const t = busqueda.toLowerCase().trim();
    if (criterioBusqueda === 'placa') return item.placa && item.placa.toLowerCase().includes(t);
    if (criterioBusqueda === 'serie') return item.serie && item.serie.toLowerCase().includes(t);
    if (criterioBusqueda === 'asignado_a') return item.asignado_a && item.asignado_a.toLowerCase().includes(t);
    if (criterioBusqueda === 'finca_depto') return item.finca_depto && item.finca_depto.toLowerCase().includes(t);

    return (
      (item.placa && item.placa.toLowerCase().includes(t)) ||
      (item.serie && item.serie.toLowerCase().includes(t)) ||
      (item.marca && item.marca.toLowerCase().includes(t)) ||
      (item.modelo && item.modelo.toLowerCase().includes(t)) ||
      (item.finca_depto && item.finca_depto.toLowerCase().includes(t)) ||
      (item.asignado_a && item.asignado_a.toLowerCase().includes(t)) ||
      (item.observaciones && item.observaciones.toLowerCase().includes(t)) ||
      (item.especificaciones && item.especificaciones.toLowerCase().includes(t))
    );
  });

  const handleExportarExcel = () => {
    if (activosFiltrados.length === 0) return alert('No hay datos.');
    const datosExcel = activosFiltrados.map((item) => ({
      Placa: item.placa, Serie: item.serie, Producto: item.producto, Marca: item.marca, Modelo: item.modelo, Tipo: item.tipo, 'Hardware / Specs': item.especificaciones || 'N/A', 'Finca / Depto': item.finca_depto, Ubicación: item.ubicacion, Empresa: item.empresa, 'Asignado A': item.asignado_a, Status: item.status, Observaciones: item.observaciones, Traza: item.traza
    }));
    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, `Reporte_${pestaniaActiva === 'laptops' ? 'Laptops' : 'Equipos'}${fincaFiltro !== 'TODAS' ? `_${fincaFiltro}` : ''}.xlsx`);
  };

  const totalPaginas = Math.ceil(activosFiltrados.length / registrosPorPagina) || 1;
  const activosPaginados = activosFiltrados.slice((paginaActual - 1) * registrosPorPagina, paginaActual * registrosPorPagina);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rol === 'Lector') return;
    try {
      if (editandoId) await axios.put(`http://localhost:5000/api/activos/${editandoId}`, formData);
      else await axios.post('http://localhost:5000/api/activos', formData);
      setModalOpen(false);
      obtenerActivos();
    } catch (error) { alert('Error al guardar datos. Verifica Placa/Serie duplicada.'); }
  };

  const handleEliminar = async (id, placa) => {
    if (rol === 'Lector') return;
    if (window.confirm(`¿Eliminar placa ${placa}?`)) {
      await axios.delete(`http://localhost:5000/api/activos/${id}`);
      obtenerActivos();
    }
  };

  return (
    <div style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setPestaniaActiva('todos'); setPaginaActual(1); }} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: pestaniaActiva === 'todos' ? '#0f766e' : '#e2e8f0', color: pestaniaActiva === 'todos' ? '#ffffff' : '#475569', cursor: 'pointer' }}>
            <Monitor size={18} /> Equipos ({activos.length - activos.filter(esLaptop).length})
          </button>
          <button onClick={() => { setPestaniaActiva('laptops'); setPaginaActual(1); }} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: pestaniaActiva === 'laptops' ? '#0f766e' : '#e2e8f0', color: pestaniaActiva === 'laptops' ? '#ffffff' : '#475569', cursor: 'pointer' }}>
            <Laptop size={18} /> Laptops ({activos.filter(esLaptop).length})
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportarExcel} style={{ backgroundColor: '#15803d', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <Download size={18} /> Exportar Excel
          </button>
          
          {rol !== 'Lector' && (
            <button onClick={() => { setEditandoId(null); setFormData({...INITIAL_FORM, finca_depto: fincaFiltro !== 'TODAS' ? fincaFiltro : 'CAF'}); setModalOpen(true); }} style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
              <Plus size={18} /> Nuevo Activo
            </button>
          )}
        </div>
      </div>

      {/* Controles de Filtros */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <Building size={16} color="#0d9488" />
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Finca/Depto:</span>
          <select value={fincaFiltro} onChange={(e) => { setFincaFiltro(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#ffffff', cursor: 'pointer' }}>
            <option value="TODAS">-- TODAS LAS FINCAS --</option>
            {listaFincas.map(finca => <option key={finca} value={finca}>{finca}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <Filter size={16} color="#0d9488" />
          <select value={criterioBusqueda} onChange={(e) => { setCriterioBusqueda(e.target.value); setPaginaActual(1); }} style={{ border: 'none', outline: 'none', padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#ffffff', cursor: 'pointer' }}>
            <option value="todos">Todos los campos</option>
            <option value="placa">Placa</option>
            <option value="serie">Serie</option>
            <option value="asignado_a">Asignado A</option>
          </select>
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', minWidth: '250px' }}>
          <Search size={20} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
          <input type="text" placeholder="Escribir para buscar..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }} style={{ width: '100%', padding: '12px 40px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
          {busqueda && <button onClick={() => {setBusqueda(''); setPaginaActual(1);}} style={{ position: 'absolute', right: '10px', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck color="#0d9488" />
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>RESULTADOS</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{activosFiltrados.length}</div>
          </div>
        </div>
      </div>

      {/* TLA TABLA AHORA TIENE CONTENEDOR CON SCROLL HORIZONTAL FORZADO (overflowX: 'auto') Y ANCHO MÍNIMO */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', minWidth: '1400px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f766e', color: 'white' }}>
              {rol !== 'Lector' && <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Acciones</th>}
              <th style={{ padding: '12px' }}>Placa</th>
              <th style={{ padding: '12px' }}>Serie</th>
              <th style={{ padding: '12px' }}>Producto</th>
              <th style={{ padding: '12px' }}>Marca / Modelo</th>
              {pestaniaActiva === 'laptops' && <th style={{ padding: '12px', backgroundColor: '#0d9488' }}>Hardware / Specs</th>}
              <th style={{ padding: '12px' }}>Finca / Depto</th>
              <th style={{ padding: '12px' }}>Ubicación</th>
              <th style={{ padding: '12px' }}>Empresa</th>
              <th style={{ padding: '12px' }}>Asignado A</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {activosPaginados.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                {rol !== 'Lector' && (
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button onClick={() => {setEditandoId(item.id); setFormData(item); setModalOpen(true);}} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', padding: '6px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}><Pencil size={14} /></button>
                    <button onClick={() => handleEliminar(item.id, item.placa)} style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </td>
                )}
                <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{item.placa}</td>
                <td style={{ padding: '10px 12px' }}>{item.serie}</td>
                <td style={{ padding: '10px 12px' }}>{item.producto || 'N/A'}</td>
                <td style={{ padding: '10px 12px' }}>{item.marca} {item.modelo}</td>
                {pestaniaActiva === 'laptops' && <td style={{ padding: '10px 12px' }}>{item.especificaciones || '-'}</td>}
                <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f766e' }}>{item.finca_depto}</td>
                <td style={{ padding: '10px 12px' }}>{item.ubicacion || '-'}</td>
                <td style={{ padding: '10px 12px' }}>{item.empresa || '-'}</td>
                <td style={{ padding: '10px 12px' }}>{item.asignado_a || '-'}</td>
                <td style={{ padding: '10px 12px' }}>{item.status}</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.observaciones || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e2e8f0', fontSize: '13px' }}>
          <div>Página {paginaActual} de {totalPaginas}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} style={{ cursor: 'pointer', padding: '5px' }}><ChevronLeft size={16} /></button>
            <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(p => p + 1)} style={{ cursor: 'pointer', padding: '5px' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {modalOpen && rol !== 'Lector' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '650px', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h2>{editandoId ? 'Editar' : 'Registrar'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input required type="text" placeholder="Placa *" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value})} style={{ padding: '8px' }} />
              <input required type="text" placeholder="Serie *" value={formData.serie} onChange={e => setFormData({...formData, serie: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Marca" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Finca / Depto" value={formData.finca_depto} onChange={e => setFormData({...formData, finca_depto: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Ubicación" value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Empresa" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Asignado A" value={formData.asignado_a} onChange={e => setFormData({...formData, asignado_a: e.target.value})} style={{ padding: '8px' }} />
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '8px' }}>
                <option value="Bueno">Bueno</option><option value="Malo">Malo</option><option value="Baja">Baja</option>
              </select>
              <input type="text" placeholder="Hardware Specs" value={formData.especificaciones} onChange={e => setFormData({...formData, especificaciones: e.target.value})} style={{ padding: '8px' }} />
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '10px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '10px' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px', background: '#0d9488', color: '#fff', border: 'none' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ENRUTADOR PRINCIPAL (APP)
// ==========================================
function App() {
  const [auth, setAuth] = useState(JSON.parse(localStorage.getItem('user')));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(null);
  };

  const RutaProtegida = ({ children, rolRequerido }) => {
    if (!auth) return <Navigate to="/login" />;
    if (rolRequerido && auth.rol !== rolRequerido) return <Navigate to="/" />;
    return children;
  };

  return (
    <Router>
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
        
        {auth && (
          <nav style={{ backgroundColor: '#1e293b', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '18px' }}>
                <Monitor color="#0d9488" /> Grupo Acón
              </div>
              
              <Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 'bold', marginLeft: '20px' }}>📦 Inventario</Link>
              
              {auth.rol === 'Admin' && (
                <Link to="/usuarios" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 'bold' }}>👥 Usuarios</Link>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white' }}>
              <span style={{ fontSize: '14px' }}>Hola, <b style={{ color: '#0d9488' }}>{auth.nombre}</b> ({auth.rol})</span>
              <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <LogOut size={16} /> Salir
              </button>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/login" element={<Login setAuth={setAuth} />} />
          <Route path="/recuperar" element={<RecuperarPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          <Route path="/" element={
            <RutaProtegida>
              <DashboardInventario rol={auth?.rol} />
            </RutaProtegida>
          } />

          <Route path="/usuarios" element={
            <RutaProtegida rolRequerido="Admin">
              <UsuariosManager />
            </RutaProtegida>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;