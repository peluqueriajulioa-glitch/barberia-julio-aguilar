# Barbería Julio Aguilar

## Instalación
1. Copia `.env.example` a `.env`
2. Llena tus credenciales de admin y Telegram
3. Ejecuta:

```bash
npm install
npm start
```

4. Abre `http://localhost:3000`

## Incluye
- Sitio multipágina
- Agenda global por horarios
- Bloqueo global de espacios entre servicios
- Reserva de 1 a 5 espacios
- Productos recomendados en el paso final
- Cupones
- Carrito flotante
- Compra de productos
- Notificación por Telegram
- Cancelación desde Telegram
- Panel admin
- Edición de servicios, productos, cupones, citas, horarios y bloqueos
- PWA básica para acceso directo a admin

## Importante
- El botón de cancelar en Telegram funciona con `PUBLIC_BASE_URL`
- El proyecto guarda datos en `database.sqlite`
- Las imágenes cargadas desde admin se guardan en `/uploads`
