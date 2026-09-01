import { createServer } from 'node:http';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const mediaDir = join(contentDir, 'media');
const tempDir = join(root, '.manager-temp');
const adminFile = join(root, 'manager', 'admin.html');
const distDir = join(root, 'dist');
const projectsFile = join(contentDir, 'projects.json');
const siteFile = join(contentDir, 'site.json');
const maxBody = 160 * 1024 * 1024;
const port = Number(process.env.PORT || 4310);
const startedAt = new Date().toISOString();

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' };
const json = (response, status, value) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); };
const safeSlug = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const bilingual = (value = {}) => ({ zh: String(value.zh || '').trim(), en: String(value.en || '').trim() });
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const orderModes = new Set(['manual', 'date-asc', 'date-desc']);

function ensureInside(base, candidate) {
  const resolved = normalize(join(base, candidate));
  if (!resolved.startsWith(normalize(base))) throw new Error('Unsafe file path.');
  return resolved;
}

async function bodyOf(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBody) throw new Error('The upload is too large. Add fewer images at one time.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function moveImage(upload, destination) {
  if (!upload?.dataUrl) return '';
  const matched = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/.exec(upload.dataUrl);
  if (!matched) throw new Error('Invalid image upload.');
  await mkdir(dirname(destination), { recursive: true });
  await mkdir(tempDir, { recursive: true });
  const temp = join(tempDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(upload.name || '.img') || '.img'}`);
  await writeFile(temp, Buffer.from(matched[2], 'base64'));
  try {
    await execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'optimize-image.ps1'), '-Source', temp, '-Destination', destination], { cwd: root, maxBuffer: 1024 * 1024 });
  } catch {
    await writeFile(destination, await readFile(temp));
  } finally {
    await rm(temp, { force: true });
  }
  return relative(contentDir, destination).replaceAll('\\', '/');
}

async function removeMedia(relativePath) {
  if (!relativePath || !relativePath.startsWith('media/')) return;
  await rm(ensureInside(contentDir, relativePath), { force: true });
}

function projectFrom(payload, existing = {}) {
  const slug = safeSlug(payload.slug || existing.slug);
  if (!slug) throw new Error('Please enter an English slug.');
  return {
    ...existing,
    slug,
    status: payload.status === 'draft' ? 'draft' : 'public',
    sortDate: String(payload.sortDate || '').trim(),
    year: String(payload.year || '').trim(),
    title: bilingual(payload.title),
    type: bilingual(payload.type),
    summary: bilingual(payload.summary),
    role: bilingual(payload.role),
    client: bilingual(payload.client),
    tools: Array.isArray(payload.tools) ? payload.tools.map(String).map((entry) => entry.trim()).filter(Boolean) : [],
    tags: Array.isArray(payload.tags) ? payload.tags.map(String).map((entry) => entry.trim()).filter(Boolean) : [],
    cover: existing.cover || '',
    gallery: existing.gallery || []
  };
}

async function upsertProject(payload) {
  const projects = await readJson(projectsFile);
  const originalSlug = safeSlug(payload.originalSlug);
  const index = originalSlug ? projects.findIndex((project) => project.slug === originalSlug) : -1;
  if (originalSlug && index < 0) throw new Error('Project not found. Refresh and try again.');
  const existing = index >= 0 ? projects[index] : {};
  const next = projectFrom(payload, existing);
  if (projects.some((project, projectIndex) => project.slug === next.slug && projectIndex !== index)) throw new Error('This slug is already in use.');
  if (!next.title.zh || !next.title.en || !next.type.zh || !next.type.en) throw new Error('Chinese and English titles and types are required.');

  if (next.slug !== existing.slug && existing.slug) {
    const oldDir = join(mediaDir, existing.slug); const newDir = join(mediaDir, next.slug);
    try { await mkdir(dirname(newDir), { recursive: true }); await execFile('powershell.exe', ['-NoProfile', '-Command', `Move-Item -LiteralPath '${oldDir.replace(/'/g, "''")}' -Destination '${newDir.replace(/'/g, "''")}'`]); } catch { /* There may be no media yet. */ }
    next.cover = next.cover.replace(`media/${existing.slug}/`, `media/${next.slug}/`);
    next.gallery = next.gallery.map((entry) => entry.replace(`media/${existing.slug}/`, `media/${next.slug}/`));
  }

  if (payload.removeCover && next.cover) { await removeMedia(next.cover); next.cover = ''; }
  if (payload.coverNew?.dataUrl) next.cover = await moveImage(payload.coverNew, join(mediaDir, next.slug, 'cover.jpg'));
  const keep = Array.isArray(payload.galleryKeep) ? payload.galleryKeep.filter((entry) => entry.startsWith(`media/${next.slug}/`)) : next.gallery;
  for (const oldImage of next.gallery.filter((image) => !keep.includes(image))) await removeMedia(oldImage);
  next.gallery = keep;
  for (let index = 0; index < (payload.galleryNew || []).length; index += 1) {
    const saved = await moveImage(payload.galleryNew[index], join(mediaDir, next.slug, `gallery-${Date.now()}-${index + 1}.jpg`));
    if (saved) next.gallery.push(saved);
  }
  if (index >= 0) projects[index] = next; else projects.push(next);
  await writeJson(projectsFile, projects);
  return next;
}

async function deleteProject(slug) {
  const projects = await readJson(projectsFile);
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) throw new Error('Project not found.');
  projects.splice(index, 1);
  await writeJson(projectsFile, projects);
  await rm(join(mediaDir, slug), { recursive: true, force: true });
}

async function saveWorksOrder(payload) {
  const mode = orderModes.has(payload?.mode) ? payload.mode : 'date-desc';
  const site = await readJson(siteFile);
  site.worksOrder = { ...(site.worksOrder || {}), mode };
  await writeJson(siteFile, site);
  return site.worksOrder;
}

async function reorderProjects(payload) {
  const projects = await readJson(projectsFile);
  const slugs = Array.isArray(payload?.slugs) ? payload.slugs.map(safeSlug) : [];
  if (slugs.length !== projects.length || new Set(slugs).size !== projects.length) throw new Error('Project order is incomplete. Refresh and try again.');
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  if (slugs.some((slug) => !bySlug.has(slug))) throw new Error('Project order contains an unknown project. Refresh and try again.');
  const next = slugs.map((slug) => bySlug.get(slug));
  await writeJson(projectsFile, next);
  return next;
}

async function saveResume(upload) {
  if (!upload?.dataUrl?.startsWith('data:application/pdf;base64,')) throw new Error('Please choose a PDF.');
  const target = join(root, 'assets', 'resume.pdf');
  await writeFile(target, Buffer.from(upload.dataUrl.split(',')[1], 'base64'));
}

async function runBuild() { return execFile(process.execPath, [join(root, 'scripts', 'build.mjs')], { cwd: root, maxBuffer: 2 * 1024 * 1024 }); }
async function publish(message) {
  await runBuild();
  const files = ['content', 'src', 'scripts', 'manager', 'package.json', 'README.md', '.github'];
  await execFile('git', ['add', '--', ...files], { cwd: root, maxBuffer: 2 * 1024 * 1024 });
  try { await execFile('git', ['commit', '-m', String(message || 'Update portfolio content')], { cwd: root, maxBuffer: 2 * 1024 * 1024 }); } catch (error) {
    if (!String(error.stderr || error.message).includes('nothing to commit')) throw error;
  }
  return execFile('git', ['push', 'origin', 'main'], { cwd: root, maxBuffer: 2 * 1024 * 1024 });
}

async function sendFile(response, base, requested) {
  const file = ensureInside(base, requested || 'index.html');
  try {
    const fileStat = await stat(file);
    if (fileStat.isDirectory()) return sendFile(response, base, join(requested, 'index.html'));
    response.writeHead(200, { 'content-type': mime[extname(file).toLowerCase()] || 'application/octet-stream', ...(file === adminFile ? { 'cache-control': 'no-store' } : {}) });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === 'GET' && url.pathname === '/') return sendFile(response, dirname(adminFile), basename(adminFile));
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, service: 'portfolio-manager', pid: process.pid, startedAt });
    if (request.method === 'GET' && url.pathname === '/api/projects') return json(response, 200, await readJson(projectsFile));
    if (request.method === 'GET' && url.pathname === '/api/site') return json(response, 200, await readJson(siteFile));
    if (request.method === 'GET' && url.pathname.startsWith('/site/')) return sendFile(response, distDir, decodeURIComponent(url.pathname.slice(6)) || 'index.html');
    if (request.method === 'POST' && url.pathname === '/api/projects') return json(response, 200, { project: await upsertProject(await bodyOf(request)) });
    if (request.method === 'POST' && url.pathname === '/api/projects/reorder') return json(response, 200, { projects: await reorderProjects(await bodyOf(request)) });
    if (request.method === 'POST' && url.pathname === '/api/works-order') return json(response, 200, { worksOrder: await saveWorksOrder(await bodyOf(request)) });
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/projects/')) { await deleteProject(safeSlug(decodeURIComponent(url.pathname.slice(14)))); return json(response, 200, { ok: true }); }
    if (request.method === 'POST' && url.pathname === '/api/resume') { await saveResume((await bodyOf(request)).resume); return json(response, 200, { ok: true }); }
    if (request.method === 'POST' && url.pathname === '/api/build') { const output = await runBuild(); return json(response, 200, { ok: true, output: output.stdout }); }
    if (request.method === 'POST' && url.pathname === '/api/publish') { const payload = await bodyOf(request); const output = await publish(payload.message); return json(response, 200, { ok: true, output: `${output.stdout}\n${output.stderr}` }); }
    json(response, 404, { error: 'Not found.' });
  } catch (error) { json(response, 400, { error: error.message || 'Request failed.' }); }
});

process.on('uncaughtException', (error) => console.error('Uncaught manager error:', error));
process.on('unhandledRejection', (error) => console.error('Unhandled manager rejection:', error));
server.on('clientError', (error, socket) => { console.error('Manager client error:', error.message); socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
server.on('error', (error) => { console.error('Manager server error:', error.message); process.exitCode = 1; });
try { await runBuild(); } catch (error) { console.error('Initial preview build failed:', error.message); }
server.listen(port, '127.0.0.1', () => console.log(`Portfolio Manager: http://127.0.0.1:${port}`));
