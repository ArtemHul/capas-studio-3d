# Capas Studio 3D

Сайт-каталог портсигарів. Одна сторінка `index.html`, без збірки.

**Що де міняти:**
- **Номер WhatsApp і Instagram** — в об'єкті `CONFIG` угорі `<script>`.
- **Моделі, ціни, опис** — у масиві `MODELS`.
- **Фото** — у теці `img/`. Зараз там 3D-рендери, справжні фото кладіть з тими ж іменами файлів.

Публікується через GitHub Pages з гілки `main`, з кореня репозиторію.

## Cloudflare

Основна адреса: https://capas-studio-3d.art-gulenko.workers.dev (Cloudflare Workers, статичні файли з `dist/`).

Як оновити сайт після змін:

```bash
rm -rf dist && mkdir dist && cp -r index.html img fonts dist/
```

```bash
npx wrangler@4 deploy
```
