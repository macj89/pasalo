# Pásalo

Un uploader privado y sencillo que crea enlaces públicos de descarga. Los archivos van directamente del navegador a un bucket S3-compatible; el servidor nunca tiene que recibir ni almacenar el archivo completo.

## Qué incluye

- Acceso para subir protegido por contraseña.
- Varios archivos por tanda, con progreso real.
- Un enlace público por archivo.
- Caducidad elegible: 1, 3, 7, 14 o 30 días.
- Envío opcional del enlace al destinatario por email.
- Aviso por email cuando se inicia la primera descarga.
- Límite predeterminado de 5 GB por archivo.
- Regla de borrado automático para el almacenamiento.

## Puesta en marcha

1. Crea un bucket privado en Cloudflare R2, Backblaze B2, MinIO o un servicio S3-compatible.
2. Copia `.env.example` a `.env.local` y completa las variables.
3. Cambia el dominio de `cors.json` y aplica esa política CORS al bucket.
4. Instala y arranca:

   ```bash
   npm install
   npm run dev
   ```

5. Configura las variables SMTP y `NOTIFICATION_EMAIL` si quieres enviar enlaces y recibir avisos.
6. Para configurar el borrado automático, exporta las variables del `.env.local` en tu terminal y ejecuta:

   ```bash
   npm run storage:lifecycle
   ```

## Generar secretos

Ejecuta dos veces y usa un resultado distinto para `AUTH_SECRET` y `SHARE_SECRET`:

```bash
openssl rand -base64 48
```

## Despliegue

Funciona en cualquier alojamiento compatible con Next.js (un VPS con Docker, Vercel, Railway, Render, etc.). `APP_URL` debe coincidir con el dominio público y el mismo dominio debe figurar en la política CORS del bucket.

El bucket debe permanecer privado. Las subidas y descargas usan URLs temporales firmadas. El aviso indica el momento en que se inicia la descarga; los archivos siguen descargándose directamente desde el almacenamiento para no consumir ancho de banda del servidor web.

## MinIO en este servidor

La configuración preparada en `deploy/` usa MinIO sobre el disco local y divide automáticamente los archivos de más de 50 MB en partes para atravesar un proxy de Cloudflare sin superar el límite por petición.

1. Copia `.env.minio.example` a `.env.minio` y `.env.production.example` a `.env.production`; rellena secretos distintos y la contraseña de subida.
2. Inicia MinIO: `docker compose -f deploy/docker-compose.minio.yml up -d`.
3. Crea el bucket privado `pasalo`, aplica `cors.json` y ejecuta `npm run storage:lifecycle` con las variables del archivo de producción cargadas.
4. Instala `deploy/pasalo.service` en systemd y añade las dos rutas de `deploy/cloudflared-ingress.yml` a tu túnel de Cloudflare (o usa cualquier otro reverse proxy).

## Licencia

MIT — ver [LICENSE](LICENSE).
