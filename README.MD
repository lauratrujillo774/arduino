# 🌊 HidroTec - Sistema de Monitoreo Hidráulico

Sistema web fullstack para el monitoreo en tiempo real de sensores hidráulicos y datos de sistemas de agua. Desarrollado con Node.js/Express en el backend y HTML/CSS/Bootstrap en el frontend.

## 📋 Descripción del Proyecto

**HidroTec** es una aplicación web diseñada para:
- ✅ Autenticación segura de usuarios (login/logout)
- ✅ Monitoreo en tiempo real de sensores
- ✅ Visualización de datos hidráulicos
- ✅ Gestión de información de sistemas de agua
- ✅ Panel informativo para docentes

## 🏗️ Arquitectura del Proyecto

```
Arduino/
├── backend/
│   ├── app.js                 # Servidor Express principal
│   ├── config/               # Configuración de base de datos
│   ├── routes/               # Rutas de API (login, sensores, etc.)
│   └── uploads/              # Almacenamiento de archivos
├── frontend/
│   ├── index.html            # Página de login
│   ├── index.css             # Estilos principales
│   ├── informativo.html      # Panel informativo
│   ├── informativo.css       # Estilos informativos
│   ├── docente/              # Sección para docentes
│   └── img/                  # Imágenes y assets
├── package.json              # Dependencias del proyecto
└── README.md                 # Este archivo
```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web (v5.1.0)
- **MySQL** - Base de datos (mysql2 v3.15.1)
- **Cors** - Manejo de peticiones CORS
- **Morgan** - Logger de HTTP
- **Multer** - Carga de archivos (v2.0.2)
- **Nodemon** - Reinicio automático en desarrollo

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos personalizados
- **Bootstrap 5.3** - Framework CSS responsivo
- **Vanilla JavaScript** - Lógica del cliente

## 📦 Instalación y Configuración

### Requisitos Previos
- Node.js (v14 o superior)
- MySQL Server
- npm (gestor de paquetes)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/lauratrujillo774/arduino.git
   cd arduino
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar base de datos**
   - Editar el archivo `backend/config/db.js` con tus credenciales de MySQL
   - Crear la base de datos necesaria

4. **Variables de entorno** (opcional)
   ```bash
   # Crear archivo .env
   PORT=8000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_NAME=hidrotec
   ```

## 🚀 Cómo Ejecutar

### Modo Desarrollo (con recarga automática)
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor estará disponible en: `http://localhost:8000`

## 📡 Rutas Principales

### Rutas Públicas
- `GET /` - Página de login (index.html)
- `GET /test` - Test del servidor
- `GET /frontend/*` - Archivos estáticos del frontend
- `GET /uploads/*` - Archivos subidos

### Rutas de API
- `POST /api/login` - Autenticación de usuarios
- `GET /api/sensores` - Obtener datos de sensores
- `GET /informativo.html` - Panel informativo

## 🔐 Autenticación

El sistema incluye un formulario de login que valida:
- Email
- Contraseña

Las credenciales se envían al backend para verificación en la base de datos.

## 📊 Funcionalidades Principales

1. **Login y Autenticación**
   - Formulario de inicio de sesión
   - Validación de credenciales
   - Manejo de errores

2. **Dashboard de Sensores**
   - Visualización de datos en tiempo real
   - Monitoreo de sistemas hidráulicos
   - Histórico de mediciones

3. **Panel Informativo**
   - Información general del sistema
   - Sección dedicada para docentes

## 🎨 Interfaz de Usuario

- Diseño moderno y responsive
- Navbar con logo de HidroTec
- Formularios con validación
- Indicadores de carga
- Alertas de error

## 📁 Estructura de Archivos Frontend

| Archivo | Propósito |
|---------|-----------|
| `index.html` | Login y punto de entrada |
| `index.css` | Estilos principales |
| `informativo.html` | Panel informativo |
| `informativo.css` | Estilos del panel |
| `img/` | Imágenes y assets (logo, etc.) |
| `docente/` | Sección de docentes |

## 🐛 Desarrollo y Debugging

El servidor incluye logging automático:
```javascript
// Logs de todas las peticiones HTTP
${timestamp} - ${METHOD} ${URL}
```

## 📞 Contacto y Soporte

Desarrollado para: **IE Santa Elena 2025 - Grado 11**

Repositorio: [github.com/lauratrujillo774/arduino](https://github.com/lauratrujillo774/arduino)

## 📄 Licencia

ISC

---

**Última actualización**: Mayo 2026
