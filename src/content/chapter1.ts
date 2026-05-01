export interface NarrativeBeat {
  t: number;
  text: string;
  action?: string;
}

export const chapter1Beats: NarrativeBeat[] = [
  {
    t: 0,
    text: '第一次突破——转向（steering）',
  },
  {
    t: 5,
    text: '这是一只秀丽隐杆线虫（C. elegans），它的神经系统只有 302 个神经元。',
  },
  {
    t: 14,
    text: '1986 年，研究者用电子显微镜首次绘出了它的连接组——\n地球上第一张完整的神经「电路图」。',
  },
  {
    t: 26,
    text: 'Max Bennett 在《智能简史》里说，所有智能的起点都是一种能力：\n转向（steering），决定朝哪里走。',
  },
  {
    t: 38,
    text: '我们正在看的就是这个能力的最简形态。',
  },
  {
    t: 44,
    text: '看屏幕右下方——AVB 是控制它前进的运动神经元。',
  },
  {
    t: 51,
    text: '每一根竖线，是一次「尖峰」（spike）。',
  },
  {
    t: 56,
    text: '尖峰的密度，就是信号的强度——\n这叫「频率编码」（rate coding）。',
  },
  {
    t: 64,
    text: '1926 年由 Edgar Adrian 发现，他因此拿了诺贝尔奖。',
  },
  {
    t: 71,
    text: '试着盯着线虫的速度——\n它跑得快时 AVB 密集，慢时 AVB 稀疏。',
  },
  {
    t: 80,
    text: '你正在偷听一种活着的、模拟的神经语言。',
  },
  {
    t: 86,
    text: '看够了？接下来，让我们给它一点刺激。',
    action: 'unlock-food',
  },
];
