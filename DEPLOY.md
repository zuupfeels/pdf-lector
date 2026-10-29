# Guía de Despliegue de VozDoc (Netlify y GitHub Pages)

Este proyecto está configurado para generar una carpeta `dist/` estática, autónoma y lista para producción al ejecutar:

```bash
npm run build
```

Gracias a la configuración de rutas relativas (`base: './'`), el proyecto funciona sin errores 404 ni rutas rotas tanto en dominios raíz como en subcarpetas de GitHub Pages.

---

## Opción 1: Despliegue en Netlify (La más rápida y recomendada)

### Método A: Arrastrar y soltar la carpeta `dist` (Sin configurar comandos)
1. Ejecuta en tu terminal:
   ```bash
   npm run build
   ```
2. Entra a [app.netlify.com](https://app.netlify.com/) e inicia sesión.
3. Ve a la sección **"Sites"** y arrastra la carpeta `dist/` generada directamente al área de subida.
4. ¡Listo! Netlify publicará tu sitio en segundos con HTTPS y soporte PWA. El archivo `_redirects` ya incluido en `public/` asegura que no haya errores al refrescar la página.

### Método B: Conectar con repositorio de GitHub
1. Sube tu código a un repositorio en GitHub.
2. En Netlify, haz clic en **"Add new site" > "Import an existing project"** y selecciona tu repositorio.
3. Configuración de Build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Haz clic en **"Deploy"**. Cada vez que hagas `git push`, Netlify compilará y actualizará el sitio automáticamente.

---

## Opción 2: Despliegue en GitHub Pages

1. Sube el proyecto a tu repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy VozDoc"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```
2. En tu repositorio de GitHub, ve a **Settings > Pages**.
3. En **Source**, selecciona:
   - **Opción simple:** Desplegar desde una rama (`gh-pages` o `main`) seleccionando la carpeta con los archivos de `dist/`.
   - **Opción con GitHub Actions (Automática):** En **Source**, elige **"GitHub Actions"** y selecciona la plantilla estándar de **Static HTML** o **Node.js** con comando `npm run build` y directorio `dist`.
4. El archivo `.nojekyll` y `404.html` ya incluidos garantizan que las rutas relativas y los assets no sean bloqueados por el servidor de GitHub.

---

## Características de la versión estática
- **Procesamiento de PDF 100% en el cliente:** Utiliza PDF.js en el navegador para extraer texto de PDFs de hasta 100 MB sin necesidad de un servidor backend.
- **Modo Pantalla Bloqueada:** Utiliza la Media Session API para mantener la lectura activa con la pantalla apagada o en el bolsillo.
- **Autenticación y Base de Datos Firebase:** Se conecta directamente a Firebase Authentication (Google Login) y Cloud Firestore desde el navegador, por lo que cada usuario tiene su propia biblioteca sincronizada en la nube aun alojado en Netlify o GitHub Pages.
