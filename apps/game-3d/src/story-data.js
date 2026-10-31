// 保留旧事件标识以兼容存档，把醒来、领物和时间流逝等过程合并进相邻剧情。
const AUTOMATIC = {
  watchTv: {}, arrival: {}, wakeMedical: {}, wakeCell: {},
  meetBrooks: { result: '瑞德已替你联系老布。图书馆入口已开放，去里面整理图书。' },
  getBible: { result: '图书已整理，老布把圣经交给了你。回牢房把石锤藏进书里。' },
  inspection: { result: '检查通过，石锤没有被发现。去院子找瑞德要海报。' },
  dumpSoil2: {}, dumpSoil3: {}, restYears: {},
  redAfterYears: { autoScene: 'cell', result: '二十年后，最后一夜。瑞德送来维修记录，安迪回到牢房整理逃离路线。' },
  sideReprimand: { result: '石锤被没收，安迪被送进禁闭室。调查角落里的石板。' },
  sideWait: { result: '禁闭结束，铁门打开。去图书馆向老布打听取回石锤的办法。' },
  sideRest: { result: '第二天，巡视开始。前往典狱长办公室寻找被没收的石锤。' },
  sideYears: {}, oneOak: {},
  threeManager: { result: '经理交代了工作：取面粉、罐头、面包和鸡蛋，再到装袋台打包。' }
};
const CONFIRM_LABELS = {
  meetRed: '答应帮瑞德修收音机', askPoster: '收好海报，返回牢房', hangPoster: '挂好海报，露出挖掘入口',
  firstDig: '挖下碎土，带去院子', dumpSoil1: '趁巡逻离开，把碎土倒完',
  meetWarden: '等待典狱长离开', hideOffice: '藏好，等巡查过去', openSafe: '掀开刺绣', swapLedger: '收好账本，返回通道',
  finalDig: '挖通最后一段', pipeExit: '走出管网', breathe: '离开高墙，走向新的生活',
  sideStone: '读完字迹，等到禁闭结束', sideBrooks: '收好圣经，按老布的建议行动',
  sideSearch: '记下异常，先躲起来', sideHide: '等巡查离开', sideRecover: '收好石锤和记录',
  oneBox: '收好信，去公路乘车', oneBus: '乘车前往海岸', oneMeet: '走向老友',
  twoCompare: '核对完成，准备寄信', twoMail: '寄出证据', twoInvestigate: '进入医疗机构核实',
  twoMedical: '保存记录，交给调查人员', twoArrest: '交出证据', twoClose: '查看结局',
  threeBank: '办妥手续，前往公路', threeDrive: '驾车前往海岸', threeBoat: '开始新的生活',
  threeCollect: '取齐商品，前往装袋台', threeAsk: '听完经理的回答', threeDecide: '自己决定，完成工作'
};
const task = (id, scene, target, label, next, lines, extra = {}) => ({
  id, scene, target, label, next, lines, confirmLabel: CONFIRM_LABELS[id],
  automatic: Object.hasOwn(AUTOMATIC, id), ...AUTOMATIC[id], ...extra
});
export const TASKS = [
  task('watchTv', 'livingRoom', 'television', '打开电视，进入故事', 'arrival', ['电视里的高墙越来越近。你听见的脚步声，已经不属于这个房间。'], { autoScene: 'yard' }),
  task('arrival', 'yard', 'gate', '调查监狱大门', 'wakeMedical', ['你试着靠近大门。警哨响起，眼前的光突然熄灭。'], { autoScene: 'operatingRoom' }),
  task('wakeMedical', 'operatingRoom', 'operatingTable', '辨认陌生的房间', 'wakeCell', ['冷光照着一张陌生的手术台。再次醒来时，你已躺在牢房里。'], { autoScene: 'cell' }),
  task('wakeCell', 'cell', 'bed', '起身，想清楚下一步', 'meetRed', ['安迪：我要先出去找瑞德。穿过走廊，看看院子里的人。']),
  task('meetRed', 'yard', 'red', '去院子找瑞德，借一把石锤', 'repairRadio', ['安迪：我想要一把打磨石头的小锤。', '瑞德：先替我修好身旁的收音机，我就替你找。']),
  task('repairRadio', 'yard', 'radio', '修好瑞德的收音机', 'meetBrooks', ['传动恢复了。慢慢调整频率，让信号稳定下来。'], { challenge: 'radio', grant: ['hammer'], result: '瑞德：手艺不错。石锤收好，图书馆的老布那边，我也打过招呼了。' }),
  task('meetBrooks', 'yard', 'brooks', '请老布带你去图书馆', 'sortBooks', ['老布：瑞德说你会来。来图书馆帮我整理一下书架。']),
  task('sortBooks', 'library', 'books', '去图书馆整理书，换取圣经', 'getBible', ['老布：瑞德已经和我说过了。把中央桌上的书从高到矮排好，这本圣经就送给你。'], { challenge: 'books' }),
  task('getBible', 'library', 'brooks', '领取老布答应的圣经', 'hideHammer', ['老布：答应你的圣经，它归你，不用还。', '安迪：谢谢您，布鲁克斯先生。'], { grant: ['bible'] }),
  task('hideHammer', 'cell', 'desk', '把石锤藏进圣经', 'inspection', ['门外响起脚步声。得让这把石锤消失在检查者的视线里。'], { challenge: 'hide' }),
  task('inspection', 'cell', 'bed', '站到床边，接受检查', 'askPoster', ['典狱长：例行检查，站到床边。', '狱警：一本圣经，没有发现违禁物品。', '脚步声渐远，石锤安然留在书中。']),
  task('askPoster', 'yard', 'red', '向瑞德要一张海报', 'hangPoster', ['安迪：我还想要一张大海报。这间屋子，总得有一点像人住的地方。', '瑞德：卷紧藏好，别让狱警看见。'], { grant: ['poster'] }),
  task('hangPoster', 'cell', 'poster', '挂好海报，检查墙面', 'firstDig', ['海报遮住了墙面的痕迹。你记住了入口的位置。']),
  task('firstDig', 'dig', 'rubble', '挖掘并收好碎土', 'dumpSoil1', ['石锤敲下一小片土。身上的土不能留在这里，得带去院子处理。'], { grant: ['soil'] }),
  task('dumpSoil1', 'yard', 'soilSpot', '到院子碎石旁倒掉碎土', 'dumpSoil2', ['巡逻的人走远了。安迪把碎土分散倒入碎石间，没有留下痕迹。', '这样的夜晚持续了很多年。二十年后，瑞德送来最后一份维修记录，安迪回牢房画出逃离路线。']),
  task('dumpSoil2', 'yard', 'soilSpot', '在院子谨慎倒土 · 二', 'dumpSoil3', ['停一停，确认没有人看过来，再继续。']),
  task('dumpSoil3', 'yard', 'soilSpot', '在院子谨慎倒土 · 三', 'restYears', ['最后一点碎土混入地面。今晚可以回牢房休息了。'], { consume: ['soil'] }),
  task('restYears', 'cell', 'bed', '回床上休息，让岁月向前', 'redAfterYears', ['一晚又一晚。墙后的路逐渐延伸，熟悉的物件也留下了岁月的痕迹。', '二十年后。']),
  task('redAfterYears', 'yard', 'red', '二十年后，再与瑞德交谈', 'drawMap', ['瑞德：二十年了，安迪。', '安迪：有些路不会自己出现，但我可以把它画出来。', '瑞德：回去，把维修通道的转弯记下来。']),
  task('drawMap', 'cell', 'desk', '整理管线路线，画出地图', 'meetWarden', ['按维修记录排列三个关键转弯：左、右、右。'], { challenge: 'map', grant: ['map'] }),
  task('meetWarden', 'office', 'warden', '与典狱长交谈，等待机会', 'hideOffice', ['典狱长合上桌上的文件。门外有人叫他，他暂时离开了办公室。', '新的脚步声又近了。先躲进窗帘后。']),
  task('hideOffice', 'office', 'curtain', '躲到窗帘后，等巡查离开', 'openSafe', ['你屏住呼吸。窗帘外的脚步停了一下，随后渐渐远去。']),
  task('openSafe', 'office', 'embroidery', '掀开刺绣，寻找保险柜', 'swapLedger', ['刺绣后露出一扇保险柜。账本就放在里面。']),
  task('swapLedger', 'office', 'safe', '用圣经调包账本', 'finalDig', ['你用圣经替换账本，把真正的记录带走。现在回牢房，完成最后的准备。'], { grant: ['ledger'], consume: ['bible'] }),
  task('finalDig', 'dig', 'rubble', '完成最后的挖掘', 'smashPipe', ['路终于贯通了。前方是排水管，也传来了雷雨的声音。']),
  task('smashPipe', 'pipe', 'pipeTarget', '借雷声掩护，敲开管道', 'pipeExit', ['等待雷声响起时挥锤，连续完成三次。'], { challenge: 'thunder' }),
  task('pipeExit', 'pipeNetwork', 'exit:rain', '穿过管网，走到雨夜出口', 'breathe', ['黑暗中，出口的雨声越来越近。'], { autoScene: 'rain' }),
  task('breathe', 'rain', 'drain', '在雨中停下，走向下一段人生', null, ['终于走出来了。还有一些名字、一些约定，留在你心里。'], { resolveEnding: true }),
  task('sideReprimand', 'yard', 'warden', '接受训诫，等待押送', 'sideStone', ['典狱长：发现违禁石锤。把他送进禁闭室。'], { autoScene: 'solitary' }),
  task('sideStone', 'solitary', 'stone', '调查角落里的石板', 'sideWait', ['石板上留下了一个没能等到自由的人的字迹。']),
  task('sideWait', 'solitary', 'mat', '熬过禁闭，等待开门', 'sideBrooks', ['铁门终于打开。穿过走廊，去图书馆找老布。']),
  task('sideBrooks', 'library', 'brooks', '听老布说说另一条路', 'sideRest', ['老布：石锤若藏在书里，也许就躲过检查了。这本给你。', '明天有人巡视，办公室会忙起来，也许有机会。'], { grant: ['bible'] }),
  task('sideRest', 'cell', 'bed', '回牢房休息，等到巡视日', 'sideSearch', ['你记住老布的话，等待第二天的机会。']),
  task('sideSearch', 'office', 'desk', '翻找办公室的转运记录', 'sideHide', ['记录中的姓名对不上监狱名册。门外响起了脚步声，快躲到窗帘后。']),
  task('sideHide', 'office', 'curtain', '躲过办公室巡查', 'sideRecover', ['你等到典狱长和狱警离开。再把书桌翻一遍。']),
  task('sideRecover', 'office', 'desk', '找回石锤，带走转运记录', 'sideYears', ['文件夹底下，是被没收的石锤和伪造的名单。你终于重新握住了自己的计划。'], { grant: ['hammer', 'ledger'] }),
  task('sideYears', 'cell', 'bed', '继续准备，等待最后一夜', 'redAfterYears', ['你把证据收好。多年准备，终于走到了最后一夜。']),
  task('oneOak', 'oak', 'oak', '瑞德：寻找石墙尽头的橡树', 'oneBox', ['就是这棵树。树根旁有一块深色石头。']),
  task('oneBox', 'oak', 'box', '打开铁盒，读安迪留下的信', 'oneBus', ['铁盒里有安迪留下的指引。你决定去赴这个约。'], { grant: ['letter'] }),
  task('oneBus', 'road', 'bus', '踏上前往海岸的旅程', 'oneMeet', ['小镇和树影从车窗外退去。前方是那片约定中的海。'], { autoScene: 'beach' }),
  task('oneMeet', 'beach', 'boat', '走向旧船，与老友重逢', null, ['在海边，安迪等到了瑞德。你们终于可以把未来交还给自己。'], { finish: '相逢的海滩' }),
  task('twoCompare', 'evidence', 'evidenceBoard', '核对名单、证言和转运记录', 'twoMail', ['编号、日期和车辆记录彼此印证。消失的人并没有被正常转移。']),
  task('twoMail', 'evidence', 'postbox', '寄出证据与举报信', 'twoInvestigate', ['你把证据分别寄给报社和调查部门。请查清他们究竟去了哪里。']),
  task('twoInvestigate', 'medicalExterior', 'guard', '协助调查人员核实去向', 'twoMedical', ['车辆路线指向这所医疗机构。调查继续向里面推进。']),
  task('twoMedical', 'operatingRoom', 'medicalCart', '核对医疗机构内的记录', 'twoArrest', ['记录补全了最后一环。那些被抹去的名字，终于重新进入调查视线。']),
  task('twoArrest', 'medicalExterior', 'warden', '见证抓捕，交出最后的证据', 'twoClose', ['典狱长和温顿被带走。', '安迪：因为还有人的名字，被留在了高墙里面。']),
  task('twoClose', 'evidence', 'letter', '为高墙下的名单留下结语', null, ['真相得以揭露，失踪者重新得到公正。安迪和瑞德，最终没能在海边重逢。'], { finish: '高墙下的名单' }),
  task('threeBank', 'bank', 'clerk', '以新身份取出资金', 'threeDrive', ['安迪用新的身份完成最后一笔手续。高墙里的账，终于翻过这一页。']),
  task('threeDrive', 'road', 'car', '沿海岸公路驶向新生活', 'threeBoat', ['摇下车窗，让风吹进来。你继续驶向海边。'], { autoScene: 'beach' }),
  task('threeBoat', 'beach', 'boat', '修整旧船，开始新的生活', 'threeManager', ['安迪在海边修整旧船。另一边，瑞德离开监狱，在超市找到了工作。'], { autoScene: 'supermarket' }),
  task('threeManager', 'supermarket', 'manager', '瑞德：听经理交代工作', 'threeCollect', ['经理：到货架拿面粉、罐头、面包和鸡蛋，带到装袋台。']),
  task('threeCollect', 'supermarket', 'groceries', '收齐四件商品', 'threeBag', ['你按清单收好商品，走向装袋台。'], { grant: ['groceries'] }),
  task('threeBag', 'supermarket', 'bag', '按重量装好商品', 'threeAsk', ['重物在下，易碎品在上。依次放入面粉、罐头、面包、鸡蛋。'], { challenge: 'bag', consume: ['groceries'] }),
  task('threeAsk', 'supermarket', 'manager', '向经理请示下一步', 'threeDecide', ['瑞德：先生，我能离开一下吗？', '经理：你不需要每次都请示。你可以自己决定。']),
  task('threeDecide', 'supermarket', 'counter', '自己决定，完成今天的工作', null, ['高墙已经在身后，习惯却仍然留在心里。安迪和瑞德，各自走向了不同的生活。'], { finish: '形同陌路' })
];

export const TASK_BY_ID = new Map(TASKS.map(item => [item.id, item]));
export const ITEM_NAMES = { hammer: '石锤', bible: '圣经', poster: '海报', soil: '碎土', map: '管网地图', ledger: '账本与记录', letter: '安迪的信', groceries: '四件商品' };
export const EVIDENCE = {
  red: ['yard', '瑞德', '空壳公司与结算日期', ['瑞德：三家公司的结算日期，和后门夜车出入的日期完全重合。']],
  brooks: ['library', '老布', '转送登记页', ['老布：借阅证被划掉的人，没有归还记录，也没有出狱记录。把这页登记收好。']],
  tommy: ['yard', '汤米', '失踪者转移证言', ['汤米：转移档案没有接收方盖章。那晚被带走的人，再也没有回来。']],
  haywood: ['yard', '海伍德', '夜车车牌与日期', ['海伍德：夜车尾牌是417。六月十二日、七月三日、七月十九日，我都见过它。']],
  floyd: ['yard', '弗洛伊德', '铜质转送牌', ['弗洛伊德：这块牌刻着D-17和后门的夜间时刻。拿走，别让人发现。']]
};
