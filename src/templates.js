export const PLANTILLAS_DEV = [
  {
    id: "frontend_angular",
    nombre: "1. Desarrollo de Componentes Web Frontend (Angular / TypeScript)",
    tarea: "Diseño, maquetación y consumo de servicios HTTP en componentes modulares con Angular",
    proceso: `1. Análisis de los requerimientos de la interfaz y estructura del componente.
2. Generación del componente y servicios mediante Angular CLI (ng generate component / service).
3. Maquetación responsive con HTML5 semántico y estilos CSS/Tailwind, respetando diseño adaptable a dispositivos móviles.
4. Implementación de reactividad mediante Signals / Observables (RxJS) para el manejo de estado local.
5. Inyección del servicio HTTP y conexión con los endpoints del backend para renderizar datos dinámicos.
6. Manejo de estados de carga (loading) y captura de errores con toasts y alertas amigables al usuario.
7. Ejecución de pruebas funcionales en navegador y verificación en Chrome DevTools.`,
    seguridad: `• Aplicación de principios de ergonomía informática: postura con espalda recta a 90°, monitor a la altura de los ojos.
• Realización de pausas activas de 5 minutos cada hora para prevenir fatiga visual y síndrome del túnel carpiano.
• Mantenimiento del puesto de trabajo limpio y cables eléctricos debidamente organizados y canalizados.`,
    herramientas: "Visual Studio Code, Node.js, Angular CLI, Chrome DevTools, Git, Postman, Windows 11 PC."
  },
  {
    id: "api_node",
    nombre: "2. Construcción de API RESTful (Node.js / Express / TypeScript)",
    tarea: "Desarrollo de arquitectura backend de microservicios con rutas, controladores y middleware",
    proceso: `1. Inicialización del entorno de backend y configuración de TypeScript (tsconfig.json, nodemon/tsx).
2. Instalación y configuración del servidor web con Express, CORS y gestión de variables de entorno con dotenv.
3. Definición de la estructura de carpetas modular: /routes, /controllers, /services, /models y /middlewares.
4. Creación de rutas HTTP estandarizadas (GET, POST, PUT, DELETE) siguiendo la especificación RESTful.
5. Implementación de controladores para procesar las solicitudes y validar el cuerpo (body) de las peticiones.
6. Integración de middleware para validación de datos de entrada y manejo global de excepciones.
7. Documentación y pruebas de endpoints mediante colecciones en Postman y verificación de códigos de estado HTTP (200, 201, 400, 404, 500).`,
    seguridad: `• Configuración de rate limiting y cabeceras de seguridad Helmet para prevenir ataques de denegación de servicio.
• Almacenamiento estricto de secretos y credenciales de base de datos en archivos .env excluidos de Git (.gitignore).
• Iluminación ambiental adecuada en la sala de desarrollo para evitar deslumbramiento en pantallas.`,
    herramientas: "VS Code, Node.js, Express, Postman, Git, Terminal PowerShell, TypeScript."
  },
  {
    id: "db_sql",
    nombre: "3. Modelado y Gestión de Base de Datos (PostgreSQL / MySQL)",
    tarea: "Diseño del diagrama entidad-relación, normalización y ejecución de consultas relacionales optimizadas",
    proceso: `1. Relevamiento de entidades, atributos y relaciones del modelo de negocio del software.
2. Elaboración del Diagrama Entidad-Relación (DER) en herramienta de modelado (Draw.io / MySQL Workbench).
3. Aplicación de las tres primeras Formas Normales (1FN, 2FN, 3FN) para eliminar redundancias e inconsistencias.
4. Creación de la base de datos y tablas con llaves primarias (PK), foráneas (FK), tipos de datos y restricciones (NOT NULL, UNIQUE).
5. Creación de índices en columnas de búsqueda frecuente para acelerar tiempos de respuesta.
6. Elaboración de consultas complejas con cláusulas JOIN, GROUP BY, subconsultas y funciones agregadas.
7. Generación de respaldos automatizados (pg_dump / mysqldump) para garantizar la integridad de los datos.`,
    seguridad: `• Prevención de inyección SQL mediante el uso mandatorio de sentencias preparadas y consultas parametrizadas.
• Respaldo periódico de las bases de datos en almacenamiento seguro y cifrado.
• Ergonomía en teclado y mouse ergonómico para reducir tensión en articulaciones.`,
    herramientas: "PostgreSQL, pgAdmin, MySQL Workbench, DBeaver, VS Code, Git."
  },
  {
    id: "auth_jwt",
    nombre: "4. Implementación de Autenticación Segura y JWT",
    tarea: "Desarrollo del módulo de autenticación con cifrado de contraseñas y tokens de sesión JWT",
    proceso: `1. Diseño de la tabla de usuarios y roles con campos de control (email, password_hash, rol, created_at).
2. Implementación de función de registro con validación de fortaleza de contraseñas y unicidad de correo.
3. Hashing irreversible de credenciales utilizando la librería bcrypt con un costo (salt rounds) de 10.
4. Creación del endpoint de inicio de sesión (/login) con verificación de hash y generación de JSON Web Token (JWT).
5. Configuración de tiempo de expiración y payload seguro en el token sin exponer información sensible.
6. Creación de middleware de autenticación (authMiddleware) para proteger rutas privadas del sistema.
7. Verificación del token Bearer en cabeceras HTTP Authorization y manejo de expiración de sesión.`,
    seguridad: `• Uso de protocolos HTTPS para evitar intercepción de tokens y credenciales en tránsito (MitM).
• Política de contraseñas seguras (mínimo 8 caracteres, números, símbolos y mayúsculas).
• Uso de descanso visual (regla 20-20-20: mirar a 20 pies de distancia por 20 segundos cada 20 minutos).`,
    herramientas: "Node.js, bcrypt, jsonwebtoken, Postman, VS Code, Supabase Auth."
  },
  {
    id: "git_deploy",
    nombre: "5. Control de Versiones con Git y Despliegue en la Nube (Vercel / Supabase)",
    tarea: "Gestión de flujo de trabajo colaborativo Git y despliegue continuo de aplicación web a producción",
    proceso: `1. Inicialización de repositorio local Git y configuración de usuario y correo de desarrollador.
2. Definición del archivo .gitignore para omitir /node_modules, /dist y archivos sensibles .env.
3. Creación de ramas de características (feature branches) según la metodología Git Flow.
4. Confirmación de cambios con mensajes de commit descriptivos y estructurados según Conventional Commits.
5. Sincronización con repositorio remoto en GitHub mediante comandos git push y creación de Pull Requests.
6. Conexión del repositorio de GitHub con la plataforma de despliegue en la nube (Vercel / Supabase).
7. Configuración de variables de entorno de producción y verificación de build exitoso en el entorno cloud.`,
    seguridad: `• Doble factor de autenticación (2FA) activado en las cuentas de GitHub y Vercel.
• Verificación de que ninguna clave de API privada se filtre al historial de commits públicos.
• Limpieza y organización de cables y equipos al finalizar la jornada laboral en el taller/empresa.`,
    herramientas: "Git, GitHub, Vercel, Supabase, Terminal Bash/PowerShell, Chrome Browser."
  }
];
