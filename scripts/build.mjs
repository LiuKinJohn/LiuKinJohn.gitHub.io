import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const content = join(root, 'content');
const readJson = async (file) => JSON.parse(await readFile(join(content, file), 'utf8'));
const site = await readJson('site.json');
const allProjects = await readJson('projects.json');
const projects = allProjects.filter((project) => project.status !== 'draft')
  .sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || ''));
const fileExists = async (file) => access(file).then(() => true).catch(() => false);
const hasResume = await fileExists(join(root, site.resume));

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));
const lang = (value = {}) => `<span class="lang lang-zh">${esc(value.zh || '')}</span><span class="lang lang-en">${esc(value.en || '')}</span>`;
const linkFor = (from, to) => relative(from, join(dist, to)).replaceAll('\\', '/') || '.';
const dateLabel = (project) => project.year === 'YEAR TBC'
  ? lang({ zh: '年份待确认', en: 'Year to be confirmed' })
  : esc(project.year || '—');

function nav(from) {
  const viewToggle = from === dist
    ? `<button class="view-toggle" type="button" aria-label="Switch works view" aria-pressed="true" data-view-toggle><span data-view-label>GRID</span></button>`
    : '';
  return `<header class="site-header"><a class="wordmark" href="${linkFor(from, 'index.html')}">LIU BINGZHANG</a>
  <nav aria-label="Primary navigation">
    <a href="${linkFor(from, 'index.html')}">WORKS</a>
    <a href="${linkFor(from, 'about/index.html')}">ABOUT</a>
    <a href="${linkFor(from, 'contact/index.html')}">CONTACT</a>
  </nav>
  <div class="site-tools">${viewToggle}<button class="language-toggle" type="button" aria-label="Switch language" aria-pressed="false">中 / EN</button></div></header>`;
}

function shell({ title, from, body }) {
  const css = linkFor(from, 'assets/site.css');
  const js = linkFor(from, 'assets/site.js');
  const controlsCss = linkFor(from, 'assets/site-tools.css');
  const shelfCss = from === dist ? `<link rel="stylesheet" href="${linkFor(from, 'assets/works-shelf.css')}">` : '';
  return `<!doctype html><html lang="zh-CN" data-lang="zh" data-works-view="shelf"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(site.name.en)} — portfolio"><title>${esc(title)} — ${esc(site.name.en)}</title><link rel="stylesheet" href="${css}"><link rel="stylesheet" href="${controlsCss}">${shelfCss}</head><body>${nav(from)}<main>${body}</main><footer class="site-footer"><span>© ${new Date().getFullYear()} ${esc(site.name.en)}</span><a href="${linkFor(from, 'contact/index.html')}">CONTACT</a></footer><script src="${js}"></script></body></html>`;
}

function workCard(project, from) {
  const href = linkFor(from, `works/${project.slug}/index.html`);
  const content = `<div class="work-card-meta"><span>${dateLabel(project)}</span><span>${lang(project.type)}</span></div><h2>${lang(project.title)}</h2><p>${lang(project.summary)}</p><span class="work-card-open">${lang({ zh: '查看项目', en: 'View project' })}</span>`;
  if (!project.cover) return `<a class="work-card work-card--text" href="${href}">${content}</a>`;
  return `<a class="work-card" href="${href}"><figure><img src="${linkFor(from, project.cover)}" alt="${esc(project.title.en || project.title.zh)}"></figure>${content}</a>`;
}

function shelfItem(project, from) {
  const href = linkFor(from, `works/${project.slug}/index.html`);
  const year = project.year === 'YEAR TBC'
    ? { zh: '年份待确认', en: 'Year to be confirmed' }
    : { zh: project.year || '—', en: project.year || '—' };
  const media = project.cover
    ? `<img src="${linkFor(from, project.cover)}" alt="${esc(project.title.en || project.title.zh)}">`
    : `<span class="shelf-placeholder" aria-hidden="true"></span>`;
  return `<a class="shelf-item" href="${href}" data-shelf-item data-title-zh="${esc(project.title.zh)}" data-title-en="${esc(project.title.en)}" data-type-zh="${esc(project.type.zh)}" data-type-en="${esc(project.type.en)}" data-year-zh="${esc(year.zh)}" data-year-en="${esc(year.en)}" aria-label="${esc(project.title.en || project.title.zh)}">${media}</a>`;
}

function worksPage() {
  const from = dist;
  return shell({
    title: 'Works', from,
    body: `<section class="works-shelf-view" data-works-shelf aria-label="Works shelf"><div class="shelf-layout"><aside class="shelf-info" aria-live="polite"><div class="shelf-info-content" data-shelf-info><p class="shelf-info-type" data-shelf-type></p><h1 data-shelf-title></h1><p class="shelf-info-year" data-shelf-year></p></div></aside><div class="shelf-viewport" data-shelf-viewport><div class="shelf-track" data-shelf-track>${projects.map((project) => shelfItem(project, from)).join('')}</div><div class="shelf-rail" aria-hidden="true"></div></div></div></section><section class="works-grid-view"><section class="works-intro"><p class="eyebrow">${lang({ zh: '作品索引', en: 'Selected works' })}</p><h1>${lang({ zh: '设计、空间与技术之间的实践。', en: 'Practice across design, space, and technology.' })}</h1><p class="intro-copy">${lang(site.intro)}</p></section><section class="works-grid" aria-label="Works">${projects.map((project) => workCard(project, from)).join('')}</section></section>`
  });
}

function detailPage(project) {
  const from = join(dist, 'works', project.slug);
  const info = [
    (project.role?.zh || project.role?.en) && `<div><dt>${lang({ zh: '职责', en: 'Role' })}</dt><dd>${lang(project.role)}</dd></div>`,
    (project.client?.zh || project.client?.en) && `<div><dt>${lang({ zh: '合作方', en: 'Client' })}</dt><dd>${lang(project.client)}</dd></div>`,
    project.tools?.length && `<div><dt>${lang({ zh: '工具', en: 'Tools' })}</dt><dd>${project.tools.map(esc).join(', ')}</dd></div>`
  ].filter(Boolean).join('');
  const cover = project.cover ? `<figure class="project-cover"><img src="${linkFor(from, project.cover)}" alt="${esc(project.title.en || project.title.zh)}"></figure>` : '';
  const gallery = project.gallery?.length ? `<section class="project-gallery">${project.gallery.map((image, index) => `<img src="${linkFor(from, image)}" alt="${esc(project.title.en || project.title.zh)} ${index + 1}" loading="lazy">`).join('')}</section>` : '';
  return shell({
    title: project.title.en || project.title.zh, from,
    body: `<article class="project-page"><a class="back-link" href="${linkFor(from, 'index.html')}">← <span>${lang({ zh: '所有作品', en: 'All works' })}</span></a><header class="project-header"><p class="eyebrow">${dateLabel(project)} · ${lang(project.type)}</p><h1>${lang(project.title)}</h1><p class="project-summary">${lang(project.summary)}</p>${project.tags?.length ? `<ul class="tag-list">${project.tags.map((tag) => `<li>${esc(tag)}</li>`).join('')}</ul>` : ''}</header>${cover}${info ? `<dl class="project-info">${info}</dl>` : ''}${gallery}</article>`
  });
}

function aboutPage() {
  const from = join(dist, 'about');
  const section = (title, body) => `<section class="about-section"><h2>${lang(title)}</h2>${body}</section>`;
  const education = `<ul class="detail-list">${site.education.map((item) => `<li><div>${lang(item.title)}<small>${lang(item.detail)}</small></div><time>${esc(item.date)}</time></li>`).join('')}</ul>`;
  const experience = `<ul class="detail-list">${site.experience.map((item) => `<li><div>${lang(item.title)}<small>${lang(item.role)}</small></div><time>${esc(item.date)}</time></li>`).join('')}</ul>`;
  const honors = `<ul class="detail-list">${site.honors.map((item) => `<li><div>${lang(item)} </div><time>${esc(item.date)}</time></li>`).join('')}</ul>`;
  const resume = hasResume
    ? `<p class="resume-note">${lang({ zh: '可下载最新版本的个人简历。', en: 'Download the current version of my CV.' })}</p><a class="text-button" href="${linkFor(from, site.resume)}" download>${lang({ zh: '下载 CV / Resume', en: 'Download CV / Resume' })}</a>`
    : `<p class="resume-note">${lang({ zh: '简历即将更新。', en: 'CV coming soon.' })}</p>`;
  return shell({ title: 'About', from, body: `<section class="about-hero"><p class="eyebrow">ABOUT</p><h1>${lang(site.name)}</h1><p>${lang(site.role)}</p><p class="intro-copy">${lang(site.intro)}</p></section><div class="about-layout">${section({ zh: '教育背景', en: 'Education' }, education)}${section({ zh: '技能', en: 'Capabilities' }, `<ul class="skill-list">${site.skills.map((skill) => `<li>${esc(skill)}</li>`).join('')}</ul>`)}${section({ zh: '经历', en: 'Experience' }, experience)}${section({ zh: '荣誉', en: 'Selected honors' }, honors)}${section({ zh: '简历', en: 'CV / Resume' }, resume)}</div>` });
}

function contactPage() {
  const from = join(dist, 'contact');
  return shell({ title: 'Contact', from, body: `<section class="contact-page"><p class="eyebrow">CONTACT</p><h1>${lang({ zh: '欢迎联系。', en: 'Let’s work together.' })}</h1><div class="contact-list"><a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a><a href="tel:${esc(site.contact.phone)}">${esc(site.contact.phone)}</a><p>${lang(site.contact.location)}</p></div><a class="text-button" href="mailto:${esc(site.contact.email)}">${lang({ zh: '发送邮件', en: 'Send an email' })}</a></section>` });
}

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'works'), { recursive: true });
await mkdir(join(dist, 'about'), { recursive: true });
await mkdir(join(dist, 'contact'), { recursive: true });
await mkdir(join(dist, 'assets'), { recursive: true });
await writeFile(join(dist, 'index.html'), worksPage());
await writeFile(join(dist, 'about', 'index.html'), aboutPage());
await writeFile(join(dist, 'contact', 'index.html'), contactPage());
for (const project of projects) {
  const folder = join(dist, 'works', project.slug);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'index.html'), detailPage(project));
}
await cp(join(root, 'src', 'site.css'), join(dist, 'assets', 'site.css'));
await writeFile(join(dist, 'assets', 'site.css'), `${await readFile(join(root, 'src', 'site.css'), 'utf8')}\n.eyebrow{margin:0 0 20px}\n`);
await cp(join(root, 'src', 'site-tools.css'), join(dist, 'assets', 'site-tools.css'));
await cp(join(root, 'src', 'works-shelf.css'), join(dist, 'assets', 'works-shelf.css'));
await cp(join(root, 'src', 'site.js'), join(dist, 'assets', 'site.js'));
try { await cp(join(content, 'media'), join(dist, 'media'), { recursive: true }); } catch { /* Media is created by the local manager when assets are uploaded. */ }
try { await cp(join(root, 'assets', 'resume.pdf'), join(dist, 'assets', 'resume.pdf')); } catch { /* The CV is optional until uploaded via the manager. */ }
await writeFile(join(dist, '.nojekyll'), '');
console.log(`Built ${projects.length} projects in ${dist}`);
