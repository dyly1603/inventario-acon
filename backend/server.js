require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_por_defecto';

app.use(cors());
app.use(express.json());

const dbPath = path.resolve(__dirname, 'inventario.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error DB:', err.message);
    else console.log('Conectado a SQLite.');
});

// Configuración de Nodemailer para enviar correos
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiarlo a 'outlook' u otro
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. INICIALIZAR TABLAS
db.serialize(() => {
    // Tabla Activos (ya la teníamos)
    db.run(`
        CREATE TABLE IF NOT EXISTS activos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, placa TEXT UNIQUE NOT NULL, serie TEXT UNIQUE NOT NULL,
            producto TEXT, marca TEXT, modelo TEXT, tipo TEXT, finca_depto TEXT, ubicacion TEXT,
            empresa TEXT, asignado_a TEXT, prestam TEXT, status TEXT DEFAULT 'Bueno',
            observaciones TEXT, traza TEXT, especificaciones TEXT, creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // NUEVA: Tabla Usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT DEFAULT 'Operario', -- 'Admin' o 'Operario'
            reset_token TEXT,
            reset_token_expira DATETIME
        )
    `);

    // Crear un usuario Administrador por defecto si no existe ninguno
    db.get("SELECT COUNT(*) AS count FROM usuarios", (err, row) => {
        if (row.count === 0) {
            const adminPass = bcrypt.hashSync('123456', 8); // Clave por defecto
            db.run(`INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)`, 
                ['Administrador Principal', 'admin@grupoacon.com', adminPass, 'Admin']);
            console.log('Usuario admin@grupoacon.com creado con contraseña: "123456".');
        }
    });
});

// ==========================================
// RUTAS DE AUTENTICACIÓN Y USUARIOS
// ==========================================

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Usuario no encontrado' });
        
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
    });
});

// Recuperar Contraseña (Generar Token y Enviar Correo)
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'No existe una cuenta con este correo' });

        // Generar token de 64 caracteres
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpira = Date.now() + 3600000; // 1 hora de validez

        db.run("UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE id = ?", [resetToken, tokenExpira, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error de BD' });

            // Enviar el correo
            const resetLink = `http://localhost:5173/reset-password/${resetToken}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Recuperación de Contraseña - Inventario Grupo Acón',
                html: `<p>Hola ${user.nombre},</p>
                       <p>Solicitaste restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
                       <a href="${resetLink}">Restablecer mi Contraseña</a>
                       <p>Si no fuiste tú, ignora este correo. El enlace expira en 1 hora.</p>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error enviando correo (revisar credenciales .env):", error);
                    return res.status(500).json({ error: 'Error enviando el correo. Verifica tu configuración .env' });
                }
                res.json({ message: 'Correo enviado con éxito' });
            });
        });
    });
});

// Cambiar contraseña con el Token
app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    db.get("SELECT * FROM usuarios WHERE reset_token = ? AND reset_token_expira > ?", [token, Date.now()], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });

        const hashPassword = bcrypt.hashSync(newPassword, 8);
        db.run("UPDATE usuarios SET password = ?, reset_token = NULL, reset_token_expira = NULL WHERE id = ?", [hashPassword, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar contraseña' });
            res.json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
        });
    });
});

// ==========================================
// RUTAS DE INVENTARIO (Las mismas que ya tenías)
// ==========================================

app.get('/api/activos', (req, res) => {
    db.all('SELECT * FROM activos ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/activos', (req, res) => {
    const { placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, prestam, status, observaciones, traza, especificaciones } = req.body;
    const query = `INSERT INTO activos (placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, prestam, status, observaciones, traza, especificaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, prestam, status || 'Bueno', observaciones, traza, especificaciones], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Activo creado con éxito' });
    });
});

app.put('/api/activos/:id', (req, res) => {
    const { placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, prestam, status, observaciones, traza, especificaciones } = req.body;
    const query = `UPDATE activos SET placa=?, serie=?, producto=?, marca=?, modelo=?, tipo=?, finca_depto=?, ubicacion=?, empresa=?, asignado_a=?, prestam=?, status=?, observaciones=?, traza=?, especificaciones=? WHERE id=?`;
    db.run(query, [placa, serie, producto, marca, modelo, tipo, finca_depto, ubicacion, empresa, asignado_a, prestam, status, observaciones, traza, especificaciones, req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Activo actualizado con éxito' });
    });
});

app.delete('/api/activos/:id', (req, res) => {
    db.run('DELETE FROM activos WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Activo eliminado' });
    });
});
// ==========================================
// RUTAS DE GESTIÓN DE USUARIOS (Admin)
// ==========================================

// Obtener todos los usuarios
app.get('/api/usuarios', (req, res) => {
    db.all('SELECT id, nombre, email, rol FROM usuarios ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear usuario nuevo (operario o admin)
app.post('/api/usuarios', (req, res) => {
    const { nombre, email, password, rol } = req.body;
    const hash = bcrypt.hashSync(password, 8);
    db.run('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', 
        [nombre, email, hash, rol || 'Operario'], function (err) {
        if (err) return res.status(400).json({ error: 'El correo ya está registrado o hay un error.' });
        res.json({ id: this.lastID, message: 'Usuario creado con éxito' });
    });
});

// Actualizar usuario (y cambiar contraseña si se escribe una nueva)
app.put('/api/usuarios/:id', (req, res) => {
    const { nombre, email, password, rol } = req.body;
    if (password && password.trim() !== '') {
        const hash = bcrypt.hashSync(password, 8);
        db.run('UPDATE usuarios SET nombre=?, email=?, password=?, rol=? WHERE id=?', 
            [nombre, email, hash, rol, req.params.id], err => {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Usuario y contraseña actualizados' });
        });
    } else {
        db.run('UPDATE usuarios SET nombre=?, email=?, rol=? WHERE id=?', 
            [nombre, email, rol, req.params.id], err => {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Usuario actualizado' });
        });
    }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', (req, res) => {
    db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuario eliminado' });
    });
});
app.listen(PORT, () => {
    console.log(`Servidor API corriendo en http://localhost:${PORT}`);
});