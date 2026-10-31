import './atlas.css';
import { SCENES, CHAPTERS } from './scenes.js';
import { propCatalog, scenePropKeys, environmentDescription, assetState, DEDICATED_CHARACTERS, CHARACTER_TEMPLATES } from './asset-catalog.js';
import { SCENE_USAGE_GROUPS, sceneUsage } from './scene-usage.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createAtlas({ getCatalog, getScene, onScene, onAsset }) {
  const panel = document.getElementById('atlas-panel');
  const summary = document.getElementById('atlas-summary');
  const tabs = [...document.querySelectorAll('[data-atlas-category]')];
  const props = propCatalog();
  let category = 'environments', usageFilter = 'all';
  const filters = element('div', 'atlas-filters');
  filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', '场景使用分类'); panel.before(filters);
  const filterOptions = [{ id: 'all', name: '全部场景' }, ...SCENE_USAGE_GROUPS];
  for (const option of filterOptions) {
    const count = SCENES.filter(scene => option.id === 'all' || sceneUsage(scene).groupId === option.id).length;
    const button = element('button', '', option.name + ' · ' + count); button.type = 'button';
    button.dataset.usage = option.id;
    button.addEventListener('click', () => { usageFilter = option.id; render(); }); filters.append(button);
  }

  function section(title, note) {
    const root = element('section', 'atlas-section');
    root.append(element('h3', '', title));
    if (note) root.append(element('p', 'atlas-section-note', note));
    const grid = element('div', 'atlas-grid'); root.append(grid); panel.append(root);
    return grid;
  }

  function card({ number, name, description, group, state, foot, action }) {
    const button = element('button', 'atlas-card'); button.type = 'button';
    const heading = element('span', 'atlas-card-heading');
    heading.append(element('span', 'atlas-number', number), element('strong', '', name));
    button.append(heading, element('span', 'atlas-card-description', description));
    const meta = element('span', 'atlas-card-meta');
    if (group) meta.append(element('span', 'atlas-kind', group));
    meta.append(element('span', 'atlas-model-state' + (state === '已配置模型' ? ' configured' : ''), state));
    button.append(meta, element('span', 'atlas-card-foot', foot));
    button.addEventListener('click', action);
    return button;
  }

  function render() {
    const catalog = getCatalog(); panel.replaceChildren();
    filters.hidden = category !== 'environments';
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.usage === usageFilter));
    const scenes = SCENES.filter(scene => usageFilter === 'all' || sceneUsage(scene).groupId === usageFilter);
    const usageNote = usageFilter === 'all' ? '按当前剧情路线分组，常用程度与剧情重要性分别考虑。'
      : SCENE_USAGE_GROUPS.find(group => group.id === usageFilter).note;
    for (const tab of tabs) {
      const selected = tab.dataset.atlasCategory === category;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', tab.id);
    }
    summary.textContent = category === 'environments'
      ? scenes.length + ' 组环境 · ' + usageNote
      : category === 'props' ? props.length + ' 类共享资产 · 同款物件可跨场景复用'
        : '5 位独立人物 · 3 类通用模板 · 单独制作与检查';
    if (category === 'environments') {
      for (const chapter of CHAPTERS) {
        const chapterScenes = scenes.filter(item => item.chapter === chapter);
        if (!chapterScenes.length) continue;
        const grid = section(chapter);
        for (const scene of chapterScenes) {
          const button = card({ number: String(SCENES.indexOf(scene) + 1).padStart(2, '0'), name: scene.name,
            description: environmentDescription(scene) + ' ' + sceneUsage(scene).reason,
            group: sceneUsage(scene).name, state: assetState(scene.id + '-architecture', catalog),
            foot: scenePropKeys(scene).length + ' 类陈设与道具 · 查看环境 ↗', action: () => onScene(scene.id) });
          button.dataset.scene = scene.id;
          button.classList.toggle('active', scene.id === getScene()); grid.append(button);
        }
      }
    } else if (category === 'props') {
      for (const group of ['陈设与环境物件', '交互道具']) {
        const grid = section(group, group === '交互道具' ? '需要拿取、开合或旋转的部件分别制作。' : '先确定共享外观，再在各场景中检查比例。');
        for (const asset of props.filter(item => item.group === group)) grid.append(card({
          number: String(props.indexOf(asset) + 1).padStart(2, '0'), name: asset.name,
          description: asset.scenes.map(scene => scene.name).join(' · '), state: assetState(asset.id, catalog),
          foot: asset.scenes.length + ' 处场景复用 · 查看建模要求 ↗', action: () => onAsset(asset)
        }));
      }
    } else {
      for (const [title, records, note] of [
        ['核心人物', DEDICATED_CHARACTERS.filter(item => item.group === '核心人物'), '安迪、瑞德与典狱长优先确定独立造型。'],
        ['独立配角', DEDICATED_CHARACTERS.filter(item => item.group === '独立配角'), '老布与汤米保留独立外观，复用统一的骨骼与动作规范。'],
        ['通用模板', CHARACTER_TEMPLATES, '共享外观和动作基础；不同人物仍保留各自姓名、对白与任务。']
      ]) {
        const grid = section(title, note);
        records.forEach((asset, index) => grid.append(card({ number: String(index + 1).padStart(2, '0'),
          name: asset.name, description: asset.description, state: assetState(asset.id, catalog),
          foot: (asset.group === '通用模板' ? '共享人物模板' : '独立角色资产') + ' · 查看制作要求 ↗', action: () => onAsset(asset) })));
      }
    }
  }

  for (const tab of tabs) tab.addEventListener('click', () => { category = tab.dataset.atlasCategory; render(); });
  tabs[0].parentElement.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  render();
  return { render };
}
