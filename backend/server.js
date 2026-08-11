const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// CONEXIÓN A POSTGRESQL
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicializar tablas al arrancar el servidor
const inicializarBaseDatos = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'Operario'
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS activos (
                id SERIAL PRIMARY KEY,
                placa VARCHAR(50) UNIQUE NOT NULL,
                serie VARCHAR(100) NOT NULL,
                producto VARCHAR(100),
                marca VARCHAR(100),
                modelo VARCHAR(100),
                tipo VARCHAR(100),
                finca_depto VARCHAR(100),
                ubicacion VARCHAR(100),
                empresa VARCHAR(100),
                asignado_a VARCHAR(100),
                status VARCHAR(50),
                observaciones TEXT,
                traza TEXT,
                especificaciones TEXT
            )
        `);

        // Crear usuario Administrador por defecto si la tabla está vacía
        const resUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', ['admin@grupoacon.com']);
        if (resUser.rows.length === 0) {
            const hash = bcrypt.hashSync('123456', 8);
            await pool.query(
                'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
                ['Administrador', 'admin@grupoacon.com', hash, 'Admin']
            );
            console.log('Usuario Administrador por defecto creado (admin@grupoacon.com / 123456)');
        }

        console.log('Base de datos PostgreSQL conectada y tablas listas.');
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
    }
};

inicializarBaseDatos();

// Configuración de Nodemailer para correos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Almacén temporal de tokens de recuperación en memoria
const resetTokens = new Map();

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Correo o contraseña incorrectos' });

        const user = result.rows[0];
        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) return res.status(400).json({ error: 'Correo o contraseña incorrectos' });

        const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET || 'secreto', { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Correo no registrado' });

        const token = Math.random().toString(36).substring(2);
        resetTokens.set(token, { email, exp: Date.now() + 900000 }); // 15 mins

        const resetLink = `http://localhost:5173/reset-password/${token}`;
        await transporter.sendMail({
            to: email,
            subject: 'Recuperación de Contraseña - Inventario Grupo Acón',
            html: `<p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p><a href="${resetLink}">${resetLink}</a>`
        });

        res.json({ message: 'Correo de recuperación enviado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    const data = resetTokens.get(token);
    if (!data || data.exp < Date.now()) return res.status(400).json({ error: 'Enlace inválido o expirado' });

    try {
        const hash = bcrypt.hashSync(newPassword, 8);
        await pool.query('UPDATE usuarios SET password = $1 WHERE email = $2', [hash, data.email]);
        resetTokens.delete(token);
        res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// RUTAS DE GESTIÓN DE USUARIOS (Admin)
// ==========================================
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    try {
        const hash = bcrypt.hashSync(password, 8);
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id',
            [nombre, email, hash, rol || 'Operario']
        );
        res.json({ id: result.rows[0].id, message: 'Usuario creado con éxito' });
    } catch (err) {
        res.status(400).json({ error: 'El correo ya está registrado o hay un error.' });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    try {
        if (password && password.trim() !== '') {
            const hash = bcrypt.hashSync(password, 8);
            await pool.query('UPDATE usuarios SET nombre=$1, email=$2, password=$3, rol=$4 WHERE id=$5', [nombre, email, hash, rol, req.params.id]);
        } else {
            await pool.query('UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4', [nombre, email, rol, req.params.id]);
        }
        res.json({ message: 'Usuario actualizado con éxito' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// RUTAS DE ACTIVOS (Inventario)
// ==========================================
app.get('/api/activos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM activos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/activos', async (req, res) => {
    const { placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, status, observaciones, traza, especificaciones } = req.body;
    try {
        await pool.query(
            `INSERT INTO activos (placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, status, observaciones, traza, especificaciones) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, status, observaciones, traza, especificaciones]
        );
        res.json({ message: 'Activo registrado con éxito' });
    } catch (err) {
        res.status(400).json({ error: 'Error al registrar activo (Placa o Serie duplicada).' });
    }
});

app.put('/api/activos/:id', async (req, res) => {
    const { placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, status, observaciones, traza, especificaciones } = req.body;
    try {
        await pool.query(
            `UPDATE activos SET placa=$1, serie=$2, producto=$3, marca=$4, modelo=$5, tipo=$6, finca_depto=$7, ubicacion=$8, empresa=$9, asignado_a=$10, status=$11, observaciones=$12, traza=$13, especificaciones=$14 WHERE id=$15`,
            [placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, status, observaciones, traza, especificaciones, req.params.id]
        );
        res.json({ message: 'Activo actualizado con éxito' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/activos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM activos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Activo eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SERVIR FRONTEND EN PRODUCCIÓN
// ==========================================
// AHORA (Compatible con Express 5)
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendDist));
    
    app.get('(.*)', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});