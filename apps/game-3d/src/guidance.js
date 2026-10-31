import { getTask } from './story.js';
import { routeTo } from './routes.js';
import { SCENE_BY_ID } from './scenes.js';

// 提示描述可见位置与具体动作；空间细节改变时，只更新这份引导数据。
const GUIDES = {
  meetRed: ['找到长椅右侧、收音机旁的瑞德，和他交谈。', '借到挖掘用的石锤。'],
  repairRadio: ['操作瑞德旁边的收音机：复位齿轮，再把频率调到73。', '用修理收音机换取石锤，并获得图书馆的帮助。'],
  sortBooks: ['走到图书馆中央的整理桌，把书按高、中、矮排列。', '老布会把圣经作为谢礼，便于藏好石锤。'],
  hideHammer: ['回到牢房右侧的书桌，把石锤放入圣经的书页凹槽。', '藏好石锤后会自动通过例行检查。'],
  askPoster: ['找到院子里收音机旁的瑞德，向他要一张海报。', '用海报遮住牢房墙上的挖掘入口。'],
  hangPoster: ['走到牢房后墙中央的海报位置，挂好海报。', '遮住墙面痕迹，开放墙后通道。'],
  firstDig: ['进入海报后的通道，到前方碎石处挖掘并收好碎土。', '碎土需要带到院子处理，不能留在牢房。'],
  dumpSoil1: ['走到院子左侧、海伍德旁的碎石堆，把碎土倒完。', '完成第一次掩护；后续准备岁月会自动衔接。'],
  drawMap: ['在牢房右侧书桌整理地图，按左、右、右排列转弯。', '二十年后，记住逃离当晚要走的维修通道。'],
  meetWarden: ['进入办公室，和书桌旁的典狱长交谈，等他离开。', '寻找拿到账本的机会。'],
  hideOffice: ['走到办公室右后方的窗帘处，藏好等巡查离开。', '避开巡查，再调查墙后的保险柜。'],
  openSafe: ['到办公室左后方，掀开墙上的刺绣。', '找到刺绣后面的保险柜。'],
  swapLedger: ['操作刺绣后方的保险柜，用圣经换出账本。', '带走高墙内的关键记录。'],
  finalDig: ['返回牢房，进入海报后的通道，在碎石处完成挖掘。', '贯通前往排水管的最后一段路。'],
  smashPipe: ['靠近前方排水管，等“雷声响起”提示时挥锤，共三次。', '利用雷声掩护，打开逃离通路。'],
  pipeExit: ['沿管网找到金色标记的“高墙外的雨夜”出口，进入出口。', '离开地下管道。'],
  breathe: ['走到雨中的排水口金色标记处，完成逃离。', '此前收集的线索将决定接下来的故事。'],
  sideStone: ['调查禁闭室右后方地上的石板。读完后会自动等到开门。', '禁闭结束后，去图书馆找老布。'],
  sideBrooks: ['找到图书馆整理桌右侧的老布，问他怎样取回石锤。', '取得圣经和办公室巡视的消息。'],
  sideSearch: ['进入办公室，检查房间中间的书桌。', '寻找被没收的石锤和转运记录。'],
  sideHide: ['走到办公室右后方的窗帘处，等巡查离开。', '避开巡查后再返回书桌搜查。'],
  sideRecover: ['回到办公室中间的书桌，找回石锤并带走记录。', '恢复逃离计划，自动衔接到最后一夜。'],
  oneBox: ['到石墙尽头的橡树根旁，打开深色石头旁的铁盒。', '读安迪留下的信，找到赴约的方向。'],
  oneBus: ['找到公路上的巴士，靠近后出发。', '去海岸寻找安迪。'],
  oneMeet: ['走向海滩左侧正在修整的旧船。', '赴安迪的约，与老友重逢。'],
  twoCompare: ['走到房间左后方的证据板，核对名单与记录。', '让证言、编号和日期相互印证。'],
  twoMail: ['将整理好的证据放入房间右侧的邮筒。', '让调查人员和报社看到证据。'],
  twoInvestigate: ['找到医疗机构院子里、典狱长旁的调查人员。', '确认转运车辆的去向。'],
  twoMedical: ['进入手术室，检查右后方的医疗推车记录。', '补全失踪名单的最后一环。'],
  twoArrest: ['返回医疗机构院子，走到典狱长旁交出证据。', '见证抓捕，完成调查。'],
  twoClose: ['回到证据房间，阅读桌上的结语信。', '为高墙下的名单留下结语。'],
  threeBank: ['走到银行右侧柜台前，和职员办理取款。', '安迪以新身份开始生活。'],
  threeDrive: ['走到公路中段的轿车旁，出发前往海岸。', '沿海岸驶向新的生活。'],
  threeBoat: ['走到海滩左侧的旧船旁，开始修整。', '安迪安顿下来；随后切换到瑞德的超市生活。'],
  threeCollect: ['在超市右侧柜台旁取齐面粉、罐头、面包和鸡蛋。', '按经理交代的清单准备商品。'],
  threeBag: ['到右侧柜台的纸袋旁，按面粉、罐头、面包、鸡蛋装袋。', '重物在下，易碎品在上。'],
  threeAsk: ['回到超市左侧，向经理请示下一步。', '听听经理怎样回应瑞德的习惯。'],
  threeDecide: ['回到超市右侧柜台，自主完成今天的工作。', '离开高墙后，试着自己做决定。']
};

export function guidanceFor(game) {
  const task = getTask(game);
  if (game.finished) return { title: '旅程结束 · ' + game.finished, purpose: '可以返回菜单，或自由查看场景。', place: '', action: '', target: null };
  const [local, purpose] = GUIDES[task.id] || [];
  if (!local) throw new Error('当前任务缺少明确的行动指引。');
  const route = routeTo(game, task.scene);
  if (!route) throw new Error('当前任务缺少可通行的路线。');
  const here = route.length === 1;
  const nextName = here ? null : SCENE_BY_ID.get(route[1]).name;
  return {
    title: task.label, purpose,
    place: here ? '目标就在这里：' + local : '路线：' + route.map(id => SCENE_BY_ID.get(id).name).join(' → '),
    action: here ? '靠近金色标记，按空格或点击下方按钮互动。' : '现在先到金色标记“' + nextName + '”，靠近后按空格进入。到达目的地后：' + local,
    target: here ? task.target : 'exit:' + route[1],
    marker: here ? task.label : '下一步：进入' + nextName
  };
}
