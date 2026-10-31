// 按当前任务路线评估使用方式，不代表玩家统计；出现次数与剧情重要性分开考虑。
export const SCENE_USAGE_GROUPS = [
  { id: 'frequent', name: '常用往返', note: '准备阶段反复经过，优先统一尺度、路线与共享陈设。' },
  { id: 'core', name: '主线关键', note: '所有结局前都要经过；即使只出现一次，也要完成关键交互与情绪演出。' },
  { id: 'conditional', name: '分支与结局', note: '按玩家选择或结局进入，按所需路线安排制作；低频不代表不重要。' },
  { id: 'archive', name: '档案展示', note: '当前新游戏自动跳过，仍可自由查看，可在核心玩法完成后精修。' }
];

const USAGE = {
  cell: ['frequent', '藏锤、海报、地图与挖掘入口，多次返回。', '空手、持有石锤、藏锤、检查通过、挂海报、最后一夜；墙面与洞口必须对应。'],
  cellCorridor: ['frequent', '牢房、院子和禁闭室之间的交通空间。', '门口与返回位置准确，任务指引清晰；预留押送与巡查路线。'],
  yard: ['frequent', '找瑞德、修收音机、拿海报、倒土与可选调查。', '收音机修理前后、碎土处理、人物阶段站位和巡逻空间；两栋建筑门口保持通行。'],
  library: ['core', '换取圣经、老布线索及备用路线的求助。', '可整理图书独立制作，书架与整理桌分开；预留递交圣经的位置。'],
  office: ['core', '主线调包账本；备用路线找回石锤与记录。', '典狱长在场和离开、窗帘藏身、刺绣揭开、保险柜与账本取走；活动部件分离。'],
  dig: ['core', '首次挖掘与最后贯通会重复使用。', '初始、部分挖掘、贯通三个阶段，碎土与通路分别管理。'],
  pipe: ['core', '配合雷声砸管，决定逃离段落的紧张感。', '完整与破损管段独立，预留挥锤位置与破口通行尺寸。'],
  pipeNetwork: ['core', '最后一段寻路，连接雨夜出口。', '直管、弯管、岔路和死路模块；碰撞、爬行高度与地图路线一致。'],
  rain: ['core', '所有结局前的逃离收束，低频但情绪重要。', '排水口、地面、水面与天空留出演出视野；雨声、雨幕和抬头演出另行接入。'],
  solitary: ['conditional', '只在石锤没收后的备用路线进入。', '石板字迹可阅读，门缝与开门状态清楚。'],
  operatingRoom: ['conditional', '当前主要在调查结局核对记录；开场记录会自动跳过。', '手术台与记录独立，保留调查目标和回程入口。'],
  oak: ['conditional', '重逢结局中寻找铁盒和安迪的信。', '橡树、石板、盒盖与信件分开，给寻找与挖取留出空间。'],
  road: ['conditional', '重逢结局乘车与各自生活结局驾车共用。', '道路布景复用，巴士与轿车分别制作；实际驾驶与乘车演出另行接入。'],
  beach: ['conditional', '重逢与各自生活两种结局共用。', '旧船、工具与人物独立；区分安迪等候、瑞德到达和安迪独自修船。'],
  supermarket: ['conditional', '各自生活结局中的瑞德工作与自主选择。', '四种商品、纸袋与装袋台分开，保留寻找和摆放空间。'],
  bank: ['conditional', '各自生活结局中的一次取款。', '柜台和职员交互位置准确，可采用紧凑空间。'],
  evidence: ['conditional', '调查结局反复核对、寄信与收束。', '名单、证言、转运记录与信件可独立展示，便于后续证据关联。'],
  medicalExterior: ['conditional', '调查结局进入医疗机构并见证抓捕。', '机构门口、调查人员与抓捕站位明确；警车可复用。'],
  livingRoom: ['archive', '原版电视开场，当前不要求新玩家在这里操作。', '保留电视、沙发与起居陈设；若恢复开场，再补声音与转场。']
};

export function sceneUsage(scene) {
  const record = USAGE[scene.id];
  if (!record) throw new Error('场景缺少使用分类：' + scene.id);
  const [groupId, reason, states] = record;
  const group = SCENE_USAGE_GROUPS.find(item => item.id === groupId);
  return { groupId, name: group.name, reason, states };
}
