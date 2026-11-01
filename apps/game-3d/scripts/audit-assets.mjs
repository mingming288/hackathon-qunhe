import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { inspectGlb } from './inspect-glb.mjs';
import { SCENES } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { validateModelEntry } from '../src/assets.js';
import { PROP_NAMES } from '../src/asset-catalog.js';
import { CHARACTER_NAMES } from '../src/kit.js';

const app = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(process.argv[2] || resolve(app, '../../docs/models/asset-audit/measurements.json'));
const catalog = JSON.parse(await readFile(resolve(app, 'public/assets/models.json'), 'utf8'));
if (catalog.version !== 1 || !catalog.models || Array.isArray(catalog.models)) throw new Error('模型清单无效');
const files = {}, entries = {}, errors = [];
for (const [key, entry] of Object.entries(catalog.models)) {
  try {
    validateModelEntry(entry);
    if (!files[entry.url]) files[entry.url] = inspectGlb(await readFile(resolve(app, 'public' + entry.url)));
    entries[key] = { ...entry };
  } catch (error) { errors.push({ key, message: error.message }); }
}

const scenes = SCENES.map(config => {
  const world = createWorld(config), downloads = new Set();
  let triangles = 0;
  const slots = world.anchors.map(anchor => {
    const id = anchor.userData.assetKey;
    const key = catalog.models[config.id + ':' + id] ? config.id + ':' + id : id;
    const entry = entries[key], file = entry && files[entry.url];
    const result = { id, name: PROP_NAMES[id] || CHARACTER_NAMES[id] || (id.endsWith('-architecture') ? config.name + '建筑' : id),
      position: anchor.position.toArray(), source: file ? entry.url : null };
    if (file) {
      downloads.add(entry.url); triangles += file.triangles;
      result.triangles = file.triangles;
      const size = file.bounds?.size;
      // 高度归一化是等比缩放；场景坐标使用游戏单位，不能直接称为现实米数。
      if (size && entry.normalize !== false && size[1] > 0) {
        result.localSizeAfterNormalization = size.map(value => value * (entry.height || anchor.userData.targetHeight) / size[1]);
      } else if (size) result.localSizeAfterNormalization = size;
    }
    return result;
  });
  disposeWorld(world);
  return { id: config.id, name: config.name, size: config.size, slots,
    configuredFileBytes: [...downloads].reduce((sum, url) => sum + files[url].bytes, 0),
    configuredInstanceTriangles: triangles };
});
const result = {
  schemaVersion: 1, generatedAt: new Date().toISOString(),
  notes: [
    '只读统计当前清单和模型文件，配置成功不代表视觉验收通过。',
    '场景统计包含配置的全部道具，含剧情隐藏物件；不包含程序基础几何和主角，也不是每帧实测面数。',
    '文件字节为模型下载体积，不代表显存；重复引用按场景去重计算下载、按实例计算三角面。',
    '尺寸为默认场景静止姿态包围盒；缺少边界或存在骨骼时见单项警告。贴图尺寸仅解析内嵌的便携式网络图形格式。'
  ],
  summary: { configuredSlots: Object.keys(entries).length, uniqueFiles: Object.keys(files).length,
    totalBytes: Object.values(files).reduce((sum, file) => sum + file.bytes, 0),
    totalFileTriangles: Object.values(files).reduce((sum, file) => sum + file.triangles, 0) },
  entries, files, scenes, errors
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: destination, ...result.summary, errors }, null, 2));
if (errors.length) process.exitCode = 1;
