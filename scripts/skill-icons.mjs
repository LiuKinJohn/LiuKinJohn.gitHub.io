export const skillIconChoices = [
  { id: 'none', label: '无图标', body: '' },
  { id: 'sparkles', label: '灵感', body: '<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>' },
  { id: 'palette', label: '视觉', body: '<path d="M12 3a9 9 0 1 0 0 18h1.4a1.6 1.6 0 0 0 0-3.2h-.6a1.8 1.8 0 0 1 0-3.6H16a5 5 0 0 0 5-5C21 5.8 17 3 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.8" r="1"/><circle cx="14.2" cy="6.5" r="1"/><circle cx="17.3" cy="9" r="1"/>' },
  { id: 'pen', label: '设计', body: '<path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m13.8 7.4 2.8 2.8M4.8 16.4l2.8 2.8"/>' },
  { id: 'type', label: '文字', body: '<path d="M4 5h16M8 5v14M16 5v14M6 19h4M14 19h4"/>' },
  { id: 'layers', label: '图层', body: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>' },
  { id: 'code', label: '代码', body: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>' },
  { id: 'monitor', label: '界面', body: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>' },
  { id: 'cube', label: '三维', body: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.4 7.7 7.6 4.4 7.6-4.4M12 12v9"/>' },
  { id: 'camera', label: '影像', body: '<path d="M5 7h3l1.4-2h5.2L16 7h3a2 2 0 0 1 2 2v9H3V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="3.5"/>' },
  { id: 'globe', label: '空间', body: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3Z"/>' },
  { id: 'nodes', label: '交互', body: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="9" cy="18" r="2"/><path d="m7.8 6.3 8.3 1.4M7 7.8l1.4 8.3M10.7 16.8l5.8-7"/>' },
  { id: 'box', label: '产品', body: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 9v11"/>' },
  { id: 'play', label: '动态', body: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>' },
  { id: 'sound', label: '声音', body: '<path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' },
  { id: 'tool', label: '工具', body: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.3 2.3-3-3 2.3-2.3Z"/>' }
];

export const skillIconIds = new Set(skillIconChoices.map((icon) => icon.id));

export function skillIconSvg(id, className = 'skill-icon') {
  const icon = skillIconChoices.find((choice) => choice.id === id);
  if (!icon?.body) return '';
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon.body}</svg>`;
}
