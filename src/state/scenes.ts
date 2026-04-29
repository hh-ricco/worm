export type ChapterId =
  | 'observe'
  | 'food'
  | 'danger'
  | 'temperature'
  | 'light'
  | 'sandbox'
  | 'reveal';

export interface ChapterMeta {
  id: ChapterId;
  index: number;
  name: string;
  unlocks: { tools: string[]; neurons: string[] };
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'observe',
    index: 1,
    name: '观察',
    unlocks: { tools: [], neurons: ['AVB'] },
  },
  {
    id: 'food',
    index: 2,
    name: '食物',
    unlocks: { tools: ['food'], neurons: ['AWC'] },
  },
  {
    id: 'danger',
    index: 3,
    name: '危险',
    unlocks: { tools: ['danger'], neurons: ['ASH'] },
  },
  {
    id: 'temperature',
    index: 4,
    name: '温度',
    unlocks: { tools: ['temperature'], neurons: ['AFD'] },
  },
  {
    id: 'light',
    index: 5,
    name: '光照',
    unlocks: { tools: ['light'], neurons: ['ASJ'] },
  },
  {
    id: 'sandbox',
    index: 6,
    name: '自由实验',
    unlocks: { tools: [], neurons: [] },
  },
  {
    id: 'reveal',
    index: 7,
    name: 'AI 连接',
    unlocks: { tools: [], neurons: [] },
  },
];
