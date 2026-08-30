# Liu Bingzhang — Portfolio

A bilingual, content-driven personal portfolio that publishes to GitHub Pages.

## Daily workflow

1. Install [Node.js 20 LTS](https://nodejs.org/) once on this computer.
2. Double-click `start-manager.cmd`.
3. Open `http://127.0.0.1:4310` in a browser.
4. Create or edit a project, including Chinese/English text, cover, gallery, tags and optional project information.
5. Click **Generate preview** to rebuild the static website, then **Publish to GitHub** to commit, push and trigger GitHub Pages.

The local manager is intentionally bound to this computer only; it has no login or public editing route.

## Project content

Project data lives in `content/projects.json`. Each item has one stable `slug` and supplies:

- Chinese and English title, type, summary and optional role/client
- year and sort date
- cover and gallery image paths
- tags and tools

The manager writes this data for you. Uploaded project images are optimized to a web-sized JPEG and stored under `content/media/<slug>/`.

Images are not copied from the top-level `作品` folder automatically. That folder remains your source archive; choose only the images you want to show through the manager.

## First deployment

In the GitHub repository, open **Settings → Pages** and choose **GitHub Actions** as the source. The included workflow builds `dist/` and publishes it whenever `main` receives a push.
