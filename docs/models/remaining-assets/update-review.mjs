import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { SCENES } from '../../../apps/game-3d/src/scenes.js';
import { propCatalog } from '../../../apps/game-3d/src/asset-catalog.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const recordFile = path.join(root, 'review-v1.json');
const record = JSON.parse(fs.readFileSync(recordFile, 'utf8'));
assert.equal(new Set(record.items.map(item => item.id)).size, record.items.length, '资产标识不能重复');

function inspect(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', '输出必须为真实图片');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.ok(width >= 512 && height >= 512, '参考图分辨率不足');
  return { width, height, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

function preserveCopy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const facts = inspect(source);
  if (fs.existsSync(target)) assert.equal(inspect(target).sha256, facts.sha256, '不覆盖已有不同版本');
  else fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  return facts;
}

// 旧图复用只做本地归档，不提交新的图像或建模任务。
for (const item of record.items.filter(item => item.status === '已有图片复用')) {
  const target = path.resolve(root, item.file);
  const facts = fs.existsSync(target) ? inspect(target) : preserveCopy(item.source, target);
  if (item.sha256) assert.equal(facts.sha256, item.sha256, '复用图片内容不得改变');
  Object.assign(item, facts);
}

if (process.argv[2]) {
  const receipt = JSON.parse(fs.readFileSync(path.resolve(root, process.argv[2]), 'utf8'));
  for (const entry of receipt.items) {
    const item = record.items.find(item => item.id === entry.id);
    assert.ok(item && item.status !== '已有图片复用', '回执必须对应新增资产');
    if (entry.error) { item.status = '生成失败'; item.error = entry.error; continue; }
    assert.ok(entry.source.startsWith('/Users/lijiawei/.codex/generated_images/'), '只归档图像工具返回的本地输出');
    Object.assign(item, preserveCopy(entry.source, path.join(root, item.file)), { source: entry.source, status: '已生成，待审核' });
    delete item.error;
  }
}

// 所有当前审阅稿及保留的旧版都必须能在仓库中独立读取。
for (const item of record.items.filter(item => ['已生成，待审核', '已有图片复用'].includes(item.status))) {
  for (const version of [item, ...(item.previousVersions || [])]) {
    assert.equal(inspect(path.resolve(root, version.file)).sha256, version.sha256, '图片校验不一致');
  }
}

const sceneIds = new Set(record.items.filter(item => item.kind === 'scene').map(item => item.id.slice(6)));
assert.deepEqual([...sceneIds].sort(), SCENES.map(scene => scene.id).sort(), '全部十九处场景都需有生成项或复用项');
const propKeys = record.items.filter(item => item.kind === 'prop').flatMap(item => item.covers || []);
const missing = propCatalog().filter(prop => !propKeys.some(key => key === prop.id || key.startsWith(prop.id + '-')));
assert.deepEqual(missing.map(item => item.id), [], '游戏物品不得漏项');

const fresh = record.items.filter(item => item.status !== '已有图片复用');
record.summary = {
  generated: fresh.filter(item => item.status === '已生成，待审核').length,
  pending: fresh.filter(item => item.status === '待生成').length,
  failed: fresh.filter(item => item.status === '生成失败').length,
  reused: record.items.length - fresh.length,
  scenesCovered: sceneIds.size,
  gamePropTypesCovered: propCatalog().length
};
record.updatedAt = new Date().toISOString();
fs.writeFileSync(recordFile, JSON.stringify(record, null, 2) + '\n');

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const cards = record.items.map(item => {
  const ready = ['已生成，待审核', '已有图片复用'].includes(item.status);
  const file = encodeURI(item.file), kind = { scene:'场景', prop:'物品', material:'材质' }[item.kind];
  return `<article data-phase="${item.phase}" data-kind="${item.kind}" data-existing="${item.status === '已有图片复用'}" data-name="${escape(item.name)}"><div class="image">${ready ? `<a href="${file}" target="_blank"><img src="${file}" alt="${escape(item.name)}" loading="lazy" width="${item.width}" height="${item.height}"></a>` : `<span>${escape(item.status)}</span>`}</div><div class="caption"><b>${escape(item.name)}</b><small>${kind} · ${escape(item.phaseName)} · ${escape(item.status)}</small>${ready ? `<a href="${file}" target="_blank">打开高清原图 ↗</a>` : ''}</div></article>`;
}).join('\n');
const summary = record.summary;
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>高墙之外 · 场景与物品图片审核总览</title>
<style>*{box-sizing:border-box}body{margin:0;background:#eae7df;color:#28332f;font:15px/1.7 system-ui,"PingFang SC",sans-serif}header{padding:32px 4vw 20px;background:#24372f;color:#f5eedc}h1{font-size:28px;margin:0 0 10px}header p{margin:6px 0;max-width:1050px}nav{position:sticky;top:0;z-index:2;display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:15px 4vw;background:#f5f1e7;border-bottom:1px solid #b5b9a5}select,input{font:inherit;border:1px solid #98a58f;border-radius:5px;background:#fffdf5;padding:7px}#grid{padding:24px 4vw;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{background:#fffdf5;border:1px solid #c1c6b3;border-radius:7px;overflow:hidden}article[hidden]{display:none}.image{aspect-ratio:3/2;background:#d2d5cb;display:grid;place-items:center}.image a{width:100%;height:100%;display:block}.image img{width:100%;height:100%;object-fit:contain;display:block}.caption{padding:14px}.caption b{display:block;font-size:17px}.caption small{display:block;color:#637563}.caption a{display:inline-block;color:#385c47;margin-top:7px}footer{padding:0 4vw 30px;color:#5c6c5b}footer a{color:#355b45}@media(max-width:1000px){#grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){#grid{grid-template-columns:1fr}h1{font-size:22px}nav{position:static}}</style>
<header><h1>高墙之外 · 场景与物品图片审核总览</h1><p>新增图片：已生成 ${summary.generated} / ${fresh.length}，待生成 ${summary.pending}，失败 ${summary.failed}；已有图片复用 ${summary.reused} 份。覆盖十九处场景和 ${summary.gamePropTypesCovered} 类游戏物品，并拆分不同用途的变体与十类商品。</p><p>按当前游戏流程优先制作前期准备。默认展示前期新增内容；可切换阶段、类型或显示已有参考。所有图片均待审核，未提交新的三维模型，也未接入游戏。</p><p>设定板是视觉与结构参考，正式建模前仍需校核视角一致性、尺寸、活动部件、碰撞与路线。标注布局单位不等于米制施工尺寸。</p></header>
<nav><label>流程 <select id="phase"><option value="1">前期准备</option><option value="2">挖掘与逃离</option><option value="3">分支与结局</option><option value="4">序章档案</option><option value="all">全部阶段</option></select></label><label>类型 <select id="kind"><option value="all">全部类型</option><option value="scene">场景</option><option value="prop">物品</option><option value="material">材质</option></select></label><input id="search" type="search" placeholder="搜索场景或物品" aria-label="搜索场景或物品"><label><input id="existing" type="checkbox"> 显示已有参考</label><span id="count"></span></nav>
<main id="grid">${cards}</main><footer><a href="prompts-v1.json">完整提示词</a> · <a href="review-v1.json">来源、校验与审阅清单</a></footer>
<script>const phase=document.getElementById('phase'),kind=document.getElementById('kind'),search=document.getElementById('search'),existing=document.getElementById('existing'),cards=[...document.querySelectorAll('article')];function filter(){let count=0;for(const card of cards){const visible=(phase.value==='all'||card.dataset.phase===phase.value)&&(kind.value==='all'||card.dataset.kind===kind.value)&&(existing.checked||card.dataset.existing!=='true')&&card.dataset.name.includes(search.value.trim());card.hidden=!visible;if(visible)count++;}document.getElementById('count').textContent='当前显示 '+count+' 项';}for(const el of [phase,kind,search,existing])el.addEventListener('input',filter);filter();</script></html>`;
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(JSON.stringify(record.summary));
