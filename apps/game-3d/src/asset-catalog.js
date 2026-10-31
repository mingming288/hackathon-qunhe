import { SCENES } from './scenes.js';
import { CHARACTER_NAMES } from './kit.js';
import { sceneUsage } from './scene-usage.js';

const ENVIRONMENTS = {
  livingRoom: '客厅空间、门窗、电视柜与起居陈设。',
  cell: '牢房结构、铁门铁窗、床铺、书桌与隐藏洞口。',
  cellCorridor: '连续牢门、走廊墙体、门牌与照明。',
  yard: '高墙、瞭望塔、监狱大门、建筑外立面与院内道路。',
  library: '图书馆空间、书架、阅读桌与图书整理区。',
  office: '办公室结构、办公桌、窗帘、刺绣与保险柜。',
  solitary: '禁闭室墙体、铁门、草席与角落石板。',
  dig: '墙后洞口、土壁、支撑结构与挖掘面。',
  pipe: '维护通道、管道接口、可破损管段与碎石。',
  pipeNetwork: '直管、弯管、岔路、死路与排水出口。',
  rain: '高墙外地面、排水口、水洼与雨幕。',
  operatingRoom: '手术室空间、手术台、设备车与灯具。',
  oak: '田野、石墙、橡树、树根与藏物位置。',
  road: '公路、路口、路牌、小镇外立面与沿路植被。',
  beach: '海面、沙滩、旧船、修船区与岸边植被。',
  supermarket: '超市空间、货架、冰柜、收银台与装袋台。',
  bank: '银行大厅、业务柜台与柜台陈设。',
  evidence: '证据整理空间、书桌、档案板与寄信位置。',
  medicalExterior: '医疗机构外立面、入口、街道与抓捕演出布景。'
};

export const PROP_NAMES = {
  sofa: '旧沙发', television: '电视与电视柜', table: '木桌', lamp: '灯具',
  bed: '铁床与床铺', desk: '书桌与办公桌', chair: '椅子', poster: '海报',
  hammer: '石锤', bible: '圣经', bench: '长椅', radio: '收音机',
  shelf: '书架与货架', books: '整理用图书', safe: '保险柜', embroidery: '墙面刺绣',
  curtain: '窗帘', ledger: '账本与档案', mat: '草席', stone: '石板与石块',
  rubble: '碎土与碎石', pipeTarget: '可破损管段', drain: '排水口',
  operatingTable: '手术台', medicalCart: '医疗设备车', oak: '橡树', box: '藏信铁盒',
  bus: '巴士', car: '汽车', roadSign: '路牌', boat: '旧船', toolbox: '修船工具箱',
  freezer: '冰柜', counter: '业务柜台与装袋台', bag: '装袋纸袋', groceries: '商品组合',
  evidenceBoard: '证据板', letter: '信件与信封', postbox: '邮筒', policeCar: '警车', gate: '监狱大门'
};

const INTERACTIVE = new Set(['poster', 'hammer', 'bible', 'radio', 'books', 'safe', 'embroidery', 'curtain', 'ledger', 'stone', 'rubble', 'pipeTarget', 'box', 'toolbox', 'bag', 'groceries', 'letter', 'postbox', 'gate']);
const PARTS = {
  bible: '书封、书页与藏锤凹槽需要分别制作。',
  radio: '外壳、检修面板、齿轮、旋钮与指针需要分别制作。',
  safe: '柜体、柜门与旋钮需要分别制作，柜门转轴保持准确。',
  box: '盒体、盒盖与内部信件需要分别制作。',
  poster: '海报与墙面分离，保留掀开与挂起的位置。',
  curtain: '窗帘与窗框分离，预留藏身空间。',
  books: '书本可独立拿取，通过尺寸与封面形成多种外观。',
  pipeTarget: '保留完整与破损状态，破口尺寸要能支持后续通行。',
  groceries: '不同商品分别制作，适合拿取、排序和装袋。',
  bag: '纸袋与商品分离，保留物品放置空间。',
  gate: '门扇与门框分离，检查开合范围。'
};

export const DEDICATED_CHARACTERS = [
  { id: 'andy', name: '安迪', group: '核心人物', description: '主角与主要可操控人物；需要持物、挖掘、倒土与爬行。', note: '已接入骨骼模型，并配置待机与行走动画。' },
  { id: 'red', name: '瑞德', group: '核心人物', description: '主要对话人物与结局可操控人物；需要交谈、递物与工作动作。', note: '已接入骨骼模型，并配置待机与行走动画。' },
  { id: 'warden', name: '典狱长', group: '核心人物', description: '检查、办公室与调查结局中的重点人物。', note: '独立制作外观，统一基础骨骼规范。' },
  { id: 'brooks', name: '老布', group: '独立配角', description: '图书馆与情感叙事中的重要人物，突出年龄和体态差异。', note: '已接入骨骼模型，并配置待机与行走动画。' },
  { id: 'tommy', name: '汤米', group: '独立配角', description: '关键证言人物，使用有辨识度的青年造型。', note: '已接入骨骼模型与共享待机动作。' }
];

export const CHARACTER_TEMPLATES = [
  { id: 'prisoner-template', name: '通用囚犯', group: '通用模板', description: '用于海伍德、弗洛伊德与背景囚犯。', note: '共用基础身体与动作，通过发型、肤色、服装细节区分；姓名、对白与证据各自保留。' },
  { id: 'uniform-template', name: '通用制服人员', group: '通用模板', description: '用于狱警、警员与押送人员。', note: '共用身体与动作，分别配置制服、帽子与装备。' },
  { id: 'civilian-template', name: '通用市民', group: '通用模板', description: '用于超市经理、银行职员、顾客及部分结局人物。', note: '通过工作服、外套、年龄和发型形成不同身份。' }
];

export function environmentDescription(scene) { return ENVIRONMENTS[scene.id]; }

export function scenePropKeys(scene) {
  const keys = scene.props.map(([key]) => key).filter(key => !Object.hasOwn(CHARACTER_NAMES, key));
  if (scene.id === 'yard') keys.push('gate', 'rubble');
  if (['road', 'beach'].includes(scene.kind)) keys.push('oak');
  return [...new Set(keys)];
}

export function propCatalog() {
  const records = new Map();
  for (const scene of SCENES) {
    for (const id of scenePropKeys(scene)) {
      if (!records.has(id)) records.set(id, { id, name: PROP_NAMES[id], group: INTERACTIVE.has(id) ? '交互道具' : '陈设与环境物件', scenes: [] });
      records.get(id).scenes.push(scene);
    }
  }
  return [...records.values()];
}

export function assetState(id, catalog, sceneId) {
  if (catalog[id] || (sceneId && catalog[sceneId + ':' + id])) return '已配置模型';
  if (!sceneId && Object.keys(catalog).some(key => key.endsWith(':' + id))) return '部分场景已配置';
  return '待接入模型';
}

export function assetDetails(asset, catalog) {
  const state = assetState(asset.id, catalog);
  if (asset.scenes) return [
    asset.group + ' · ' + state,
    '使用场景：' + asset.scenes.map(scene => scene.name).join('、') + '。',
    PARTS[asset.id] || '保持统一漫画风格，校准尺寸、朝向与落地位置，制作后在使用场景中检查。',
    '同一款资产可在多个场景复用，无需为每个摆放位置重复制作。'
  ];
  return [asset.group + ' · ' + state, asset.description, asset.note,
    '人物单独制作与检查，正式游玩时按剧情加入场景；环境查看不显示人物。',
    '准备清晰的正侧背参考与绑骨专用展开站姿，逐一检查骨骼、蒙皮与动作。'];
}

export function sceneAssetDetails(scene, catalog) {
  const props = scenePropKeys(scene);
  return [
    environmentDescription(scene),
    '使用分类：' + sceneUsage(scene).name + '。' + sceneUsage(scene).reason,
    '需准备的状态：' + sceneUsage(scene).states,
    '建筑主体：' + assetState(scene.id + '-architecture', catalog) + '。校准门洞、地面、原点与整体比例。',
    ...props.map(id => PROP_NAMES[id] + ' · ' + assetState(id, catalog, scene.id)),
    '人物在独立分类中管理，正式剧情保留人物身份、站位和任务关系。'
  ];
}
