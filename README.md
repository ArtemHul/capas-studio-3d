# Capas Studio 3D

Сайт-каталог портсигарів, напрям «Шари»: GSAP (ScrollTrigger, ScrollSmoother, SplitText, Flip, Draggable).

| Файл | Що в ньому |
|---|---|
| `index.html` | Розмітка. Тексти підставляються з `data-i="ключ"`. |
| `js/data.js` | `CONFIG` (WhatsApp, Instagram), `UI` (тексти 4 мовами), `MODELS` (товари; `id` = тека з фото). |
| `js/app.js` | Мова, картки, анімації, сторінка товару, звук. |
| `js/filament.js` | Декоративний фон першого екрана (canvas). |
| `css/main.css` | Стилі. |
| `photos/<id>/` | **Сюди класти фото** (див. `photos/ЯК ДОДАТИ ФОТО.txt`). |
| `tools/build_photos.py` | Стискає фото в `ph/` і пише `photos.json`. |
| `оновити сайт.bat` | Фото, збірка `dist/` і `wrangler deploy` на Cloudflare. |

Адреса: https://capas-studio-3d.art-gulenko.workers.dev
