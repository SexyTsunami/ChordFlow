import type { Song } from "@/lib/domain/types";

/**
 * ChordFlow's starter collection: 50 well known Jay Chou (周杰倫) songs.
 *
 * This is a curated personal starting point, NOT a definitive or objectively
 * ranked chart. Reorder, add or delete entries freely — `JAY_CHOU_TOP_50`
 * order is the display order.
 *
 * Deliberate omissions:
 *  - `originalKey` is null everywhere. Published keys vary by recording,
 *    transcription and vocal register, so inventing one would be worse than
 *    saying nothing. Set it yourself once you have verified it by ear.
 *  - `difficulty` is null for the same reason; it is meaningful only against a
 *    specific arrangement.
 *  - No lyrics and no chords ship with these records. Jay Chou's catalogue is
 *    under copyright. Each song gets a detail page, search links to authorised
 *    sources, and a blank editor so you can enter an arrangement you have the
 *    right to use.
 */

export const JAY_CHOU_ARTIST = {
  id: "artist_jay_chou",
  name: "周杰倫",
  nameZhHans: "周杰伦",
  pinyin: "Zhou Jie Lun",
  nameEn: "Jay Chou",
} as const;

type SeedInput = {
  slug: string;
  title: string;
  titleZhHans: string;
  titlePinyin: string;
  titleEn: string;
  album: string;
  albumZhHans: string;
  albumEn: string;
  releaseYear: number;
  tags?: string[];
};

const SEEDS: SeedInput[] = [
  { slug: "qing-tian", title: "晴天", titleZhHans: "晴天", titlePinyin: "Qing Tian", titleEn: "Sunny Day", album: "葉惠美", albumZhHans: "叶惠美", albumEn: "Yeh Hui-Mei", releaseYear: 2003, tags: ["classic", "ballad"] },
  { slug: "qi-li-xiang", title: "七里香", titleZhHans: "七里香", titlePinyin: "Qi Li Xiang", titleEn: "Common Jasmine Orange", album: "七里香", albumZhHans: "七里香", albumEn: "Common Jasmine Orange", releaseYear: 2004, tags: ["classic", "ballad"] },
  { slug: "dao-xiang", title: "稻香", titleZhHans: "稻香", titlePinyin: "Dao Xiang", titleEn: "Rice Fragrance", album: "魔杰座", albumZhHans: "魔杰座", albumEn: "Capricorn", releaseYear: 2008, tags: ["classic", "uplifting"] },
  { slug: "gao-bai-qi-qiu", title: "告白氣球", titleZhHans: "告白气球", titlePinyin: "Gao Bai Qi Qiu", titleEn: "Confession Balloon", album: "周杰倫的床邊故事", albumZhHans: "周杰伦的床边故事", albumEn: "Jay Chou's Bedtime Stories", releaseYear: 2016, tags: ["modern", "pop"] },
  { slug: "jian-dan-ai", title: "簡單愛", titleZhHans: "简单爱", titlePinyin: "Jian Dan Ai", titleEn: "Simple Love", album: "范特西", albumZhHans: "范特西", albumEn: "Fantasy", releaseYear: 2001, tags: ["classic", "pop"] },
  { slug: "cai-hong", title: "彩虹", titleZhHans: "彩虹", titlePinyin: "Cai Hong", titleEn: "Rainbow", album: "我很忙", albumZhHans: "我很忙", albumEn: "On the Run!", releaseYear: 2007, tags: ["ballad"] },
  { slug: "ye-qu", title: "夜曲", titleZhHans: "夜曲", titlePinyin: "Ye Qu", titleEn: "Nocturne", album: "十一月的蕭邦", albumZhHans: "十一月的萧邦", albumEn: "November's Chopin", releaseYear: 2005, tags: ["classic", "r&b"] },
  { slug: "qing-hua-ci", title: "青花瓷", titleZhHans: "青花瓷", titlePinyin: "Qing Hua Ci", titleEn: "Blue and White Porcelain", album: "我很忙", albumZhHans: "我很忙", albumEn: "On the Run!", releaseYear: 2007, tags: ["zhongguofeng", "classic"] },
  { slug: "ju-hua-tai", title: "菊花台", titleZhHans: "菊花台", titlePinyin: "Ju Hua Tai", titleEn: "Chrysanthemum Terrace", album: "依然范特西", albumZhHans: "依然范特西", albumEn: "Still Fantasy", releaseYear: 2006, tags: ["zhongguofeng", "film"] },
  { slug: "an-jing", title: "安靜", titleZhHans: "安静", titlePinyin: "An Jing", titleEn: "Silence", album: "范特西", albumZhHans: "范特西", albumEn: "Fantasy", releaseYear: 2001, tags: ["ballad"] },
  { slug: "hei-se-mao-yi", title: "黑色毛衣", titleZhHans: "黑色毛衣", titlePinyin: "Hei Se Mao Yi", titleEn: "Black Sweater", album: "十一月的蕭邦", albumZhHans: "十一月的萧邦", albumEn: "November's Chopin", releaseYear: 2005, tags: ["ballad"] },
  { slug: "feng", title: "楓", titleZhHans: "枫", titlePinyin: "Feng", titleEn: "Maple", album: "十一月的蕭邦", albumZhHans: "十一月的萧邦", albumEn: "November's Chopin", releaseYear: 2005, tags: ["ballad"] },
  { slug: "shuo-hao-de-xing-fu-ne", title: "說好的幸福呢", titleZhHans: "说好的幸福呢", titlePinyin: "Shuo Hao De Xing Fu Ne", titleEn: "What About the Promised Happiness?", album: "魔杰座", albumZhHans: "魔杰座", albumEn: "Capricorn", releaseYear: 2008, tags: ["ballad", "piano"] },
  { slug: "ge-qian", title: "擱淺", titleZhHans: "搁浅", titlePinyin: "Ge Qian", titleEn: "Run Aground", album: "七里香", albumZhHans: "七里香", albumEn: "Common Jasmine Orange", releaseYear: 2004, tags: ["ballad"] },
  { slug: "tui-hou", title: "退後", titleZhHans: "退后", titlePinyin: "Tui Hou", titleEn: "Step Back", album: "依然范特西", albumZhHans: "依然范特西", albumEn: "Still Fantasy", releaseYear: 2006, tags: ["ballad"] },
  { slug: "ting-mama-de-hua", title: "聽媽媽的話", titleZhHans: "听妈妈的话", titlePinyin: "Ting Mama De Hua", titleEn: "Listen to Mother", album: "依然范特西", albumZhHans: "依然范特西", albumEn: "Still Fantasy", releaseYear: 2006, tags: ["rap"] },
  { slug: "ben-cao-gang-mu", title: "本草綱目", titleZhHans: "本草纲目", titlePinyin: "Ben Cao Gang Mu", titleEn: "Compendium of Materia Medica", album: "依然范特西", albumZhHans: "依然范特西", albumEn: "Still Fantasy", releaseYear: 2006, tags: ["zhongguofeng", "uptempo"] },
  { slug: "bu-neng-shuo-de-mi-mi", title: "不能說的秘密", titleZhHans: "不能说的秘密", titlePinyin: "Bu Neng Shuo De Mi Mi", titleEn: "Secret That Cannot Be Told", album: "不能說的．秘密 電影原聲帶", albumZhHans: "不能说的．秘密 电影原声带", albumEn: "Secret (Original Soundtrack)", releaseYear: 2007, tags: ["film", "piano"] },
  { slug: "zui-chang-de-dian-ying", title: "最長的電影", titleZhHans: "最长的电影", titlePinyin: "Zui Chang De Dian Ying", titleEn: "The Longest Movie", album: "我很忙", albumZhHans: "我很忙", albumEn: "On the Run!", releaseYear: 2007, tags: ["ballad"] },
  { slug: "pu-gong-ying-de-yue-ding", title: "蒲公英的約定", titleZhHans: "蒲公英的约定", titlePinyin: "Pu Gong Ying De Yue Ding", titleEn: "Dandelion's Promise", album: "我很忙", albumZhHans: "我很忙", albumEn: "On the Run!", releaseYear: 2007, tags: ["ballad"] },
  { slug: "yuan-you-hui", title: "園遊會", titleZhHans: "园游会", titlePinyin: "Yuan You Hui", titleEn: "Garden Party", album: "七里香", albumZhHans: "七里香", albumEn: "Common Jasmine Orange", releaseYear: 2004, tags: ["pop"] },
  { slug: "xing-qing", title: "星晴", titleZhHans: "星晴", titlePinyin: "Xing Qing", titleEn: "Starry Mood", album: "Jay", albumZhHans: "Jay", albumEn: "Jay", releaseYear: 2000, tags: ["debut", "pop"] },
  { slug: "ai-zai-xi-yuan-qian", title: "愛在西元前", titleZhHans: "爱在西元前", titlePinyin: "Ai Zai Xi Yuan Qian", titleEn: "Love Before Common Era", album: "范特西", albumZhHans: "范特西", albumEn: "Fantasy", releaseYear: 2001, tags: ["uptempo"] },
  { slug: "long-juan-feng", title: "龍捲風", titleZhHans: "龙卷风", titlePinyin: "Long Juan Feng", titleEn: "Tornado", album: "Jay", albumZhHans: "Jay", albumEn: "Jay", releaseYear: 2000, tags: ["debut", "r&b"] },
  { slug: "kai-bu-liao-kou", title: "開不了口", titleZhHans: "开不了口", titlePinyin: "Kai Bu Liao Kou", titleEn: "Can't Speak Up", album: "范特西", albumZhHans: "范特西", albumEn: "Fantasy", releaseYear: 2001, tags: ["ballad"] },
  { slug: "ban-dao-tie-he", title: "半島鐵盒", titleZhHans: "半岛铁盒", titlePinyin: "Ban Dao Tie He", titleEn: "Peninsula Ironbox", album: "八度空間", albumZhHans: "八度空间", albumEn: "The Eight Dimensions", releaseYear: 2002, tags: ["r&b"] },
  { slug: "yi-fu-zhi-ming", title: "以父之名", titleZhHans: "以父之名", titlePinyin: "Yi Fu Zhi Ming", titleEn: "In the Name of the Father", album: "葉惠美", albumZhHans: "叶惠美", albumEn: "Yeh Hui-Mei", releaseYear: 2003, tags: ["rap", "cinematic"] },
  { slug: "zhi-zhan-zhi-shang", title: "止戰之殤", titleZhHans: "止战之殇", titlePinyin: "Zhi Zhan Zhi Shang", titleEn: "Wounds of War", album: "七里香", albumZhHans: "七里香", albumEn: "Common Jasmine Orange", releaseYear: 2004, tags: ["cinematic"] },
  { slug: "duan-le-de-xian", title: "斷了的弦", titleZhHans: "断了的弦", titlePinyin: "Duan Le De Xian", titleEn: "Broken String", album: "尋找周杰倫", albumZhHans: "寻找周杰伦", albumEn: "Hidden Track (EP)", releaseYear: 2003, tags: ["ballad"] },
  { slug: "gui-ji", title: "軌跡", titleZhHans: "轨迹", titlePinyin: "Gui Ji", titleEn: "Trajectory", album: "尋找周杰倫", albumZhHans: "寻找周杰伦", albumEn: "Hidden Track (EP)", releaseYear: 2003, tags: ["ballad"] },
  { slug: "hui-dao-guo-qu", title: "回到過去", titleZhHans: "回到过去", titlePinyin: "Hui Dao Guo Qu", titleEn: "Back to the Past", album: "八度空間", albumZhHans: "八度空间", albumEn: "The Eight Dimensions", releaseYear: 2002, tags: ["r&b"] },
  { slug: "dong-feng-po", title: "東風破", titleZhHans: "东风破", titlePinyin: "Dong Feng Po", titleEn: "East Wind Breaks", album: "葉惠美", albumZhHans: "叶惠美", albumEn: "Yeh Hui-Mei", releaseYear: 2003, tags: ["zhongguofeng", "classic"] },
  { slug: "wei-lian-gu-bao", title: "威廉古堡", titleZhHans: "威廉古堡", titlePinyin: "Wei Lian Gu Bao", titleEn: "William Castle", album: "范特西", albumZhHans: "范特西", albumEn: "Fantasy", releaseYear: 2001, tags: ["uptempo"] },
  { slug: "ye-de-di-qi-zhang", title: "夜的第七章", titleZhHans: "夜的第七章", titlePinyin: "Ye De Di Qi Zhang", titleEn: "Chapter Seven of the Night", album: "依然范特西", albumZhHans: "依然范特西", albumEn: "Still Fantasy", releaseYear: 2006, tags: ["cinematic", "rap"] },
  { slug: "mi-die-xiang", title: "迷迭香", titleZhHans: "迷迭香", titlePinyin: "Mi Die Xiang", titleEn: "Rosemary", album: "依然范特西", albumZhHans: "依然范特西", albumEn: "Still Fantasy", releaseYear: 2006, tags: ["r&b"] },
  { slug: "wo-bu-pei", title: "我不配", titleZhHans: "我不配", titlePinyin: "Wo Bu Pei", titleEn: "I'm Not Worthy", album: "我很忙", albumZhHans: "我很忙", albumEn: "On the Run!", releaseYear: 2007, tags: ["ballad"] },
  { slug: "lan-ting-xu", title: "蘭亭序", titleZhHans: "兰亭序", titlePinyin: "Lan Ting Xu", titleEn: "Orchid Pavilion Preface", album: "魔杰座", albumZhHans: "魔杰座", albumEn: "Capricorn", releaseYear: 2008, tags: ["zhongguofeng"] },
  { slug: "gei-wo-yi-shou-ge-de-shi-jian", title: "給我一首歌的時間", titleZhHans: "给我一首歌的时间", titlePinyin: "Gei Wo Yi Shou Ge De Shi Jian", titleEn: "Give Me the Time of a Song", album: "魔杰座", albumZhHans: "魔杰座", albumEn: "Capricorn", releaseYear: 2008, tags: ["ballad"] },
  { slug: "chao-ren-bu-hui-fei", title: "超人不會飛", titleZhHans: "超人不会飞", titlePinyin: "Chao Ren Bu Hui Fei", titleEn: "Superman Can't Fly", album: "跨時代", albumZhHans: "跨时代", albumEn: "The Era", releaseYear: 2010, tags: ["ballad"] },
  { slug: "yu-xia-yi-zheng-wan", title: "雨下一整晚", titleZhHans: "雨下一整晚", titlePinyin: "Yu Xia Yi Zheng Wan", titleEn: "Raining All Night", album: "跨時代", albumZhHans: "跨时代", albumEn: "The Era", releaseYear: 2010, tags: ["zhongguofeng"] },
  { slug: "yan-hua-yi-leng", title: "煙花易冷", titleZhHans: "烟花易冷", titlePinyin: "Yan Hua Yi Leng", titleEn: "Fireworks Cool Easily", album: "跨時代", albumZhHans: "跨时代", albumEn: "The Era", releaseYear: 2010, tags: ["zhongguofeng", "classic"] },
  { slug: "shui-shou-pa-shui", title: "水手怕水", titleZhHans: "水手怕水", titlePinyin: "Shui Shou Pa Shui", titleEn: "The Sailor Who Fears Water", album: "驚嘆號", albumZhHans: "惊叹号", albumEn: "Exclamation Mark", releaseYear: 2011, tags: ["uptempo"] },
  { slug: "gong-gong-pian-tou-tong", title: "公公偏頭痛", titleZhHans: "公公偏头痛", titlePinyin: "Gong Gong Pian Tou Tong", titleEn: "The Eunuch's Migraine", album: "驚嘆號", albumZhHans: "惊叹号", albumEn: "Exclamation Mark", releaseYear: 2011, tags: ["zhongguofeng", "uptempo"] },
  { slug: "ming-ming-jiu", title: "明明就", titleZhHans: "明明就", titlePinyin: "Ming Ming Jiu", titleEn: "Obviously", album: "十二新作", albumZhHans: "十二新作", albumEn: "Opus 12", releaseYear: 2012, tags: ["ballad"] },
  { slug: "hong-chen-ke-zhan", title: "紅塵客棧", titleZhHans: "红尘客栈", titlePinyin: "Hong Chen Ke Zhan", titleEn: "Mortal World Inn", album: "十二新作", albumZhHans: "十二新作", albumEn: "Opus 12", releaseYear: 2012, tags: ["zhongguofeng"] },
  { slug: "shou-xie-de-cong-qian", title: "手寫的從前", titleZhHans: "手写的从前", titlePinyin: "Shou Xie De Cong Qian", titleEn: "Handwritten Past", album: "哎呦，不錯哦", albumZhHans: "哎呦，不错哦", albumEn: "Aiyo, Not Bad", releaseYear: 2014, tags: ["ballad", "piano"] },
  { slug: "suan-shen-me-nan-ren", title: "算什麼男人", titleZhHans: "算什么男人", titlePinyin: "Suan Shen Me Nan Ren", titleEn: "What Kind of Man", album: "哎呦，不錯哦", albumZhHans: "哎呦，不错哦", albumEn: "Aiyo, Not Bad", releaseYear: 2014, tags: ["ballad"] },
  { slug: "bu-gai", title: "不該", titleZhHans: "不该", titlePinyin: "Bu Gai", titleEn: "Shouldn't Be", album: "周杰倫的床邊故事", albumZhHans: "周杰伦的床边故事", albumEn: "Jay Chou's Bedtime Stories", releaseYear: 2016, tags: ["duet", "ballad"] },
  { slug: "deng-ni-xia-ke", title: "等你下課", titleZhHans: "等你下课", titlePinyin: "Deng Ni Xia Ke", titleEn: "Waiting For You", album: "Single", albumZhHans: "Single", albumEn: "Single", releaseYear: 2018, tags: ["acoustic", "single"] },
  { slug: "mojito", title: "Mojito", titleZhHans: "Mojito", titlePinyin: "Mojito", titleEn: "Mojito", album: "Single", albumZhHans: "Single", albumEn: "Single", releaseYear: 2020, tags: ["latin", "single"] },
];

function toSong(seed: SeedInput): Song {
  return {
    id: `jc_${seed.slug.replace(/-/g, "_")}`,
    title: seed.title,
    titleZhHans: seed.titleZhHans,
    titlePinyin: seed.titlePinyin,
    titleEn: seed.titleEn,
    artist: JAY_CHOU_ARTIST.name,
    artistZhHans: JAY_CHOU_ARTIST.nameZhHans,
    artistPinyin: JAY_CHOU_ARTIST.pinyin,
    album: seed.album,
    albumZhHans: seed.albumZhHans,
    releaseYear: seed.releaseYear,
    // Intentionally unset: see the file header.
    originalKey: null,
    difficulty: null,
    arrangementStatus: "unavailable",
    tags: ["jay-chou", ...(seed.tags ?? [])],
    origin: "seed",
  };
}

export const JAY_CHOU_TOP_50: Song[] = SEEDS.map(toSong);

/** Album display names, used by the collection page's grouping control. */
export const JAY_CHOU_ALBUMS: Array<{
  title: string;
  titleZhHans: string;
  titleEn: string;
  releaseYear: number;
}> = Array.from(
  new Map(
    SEEDS.map((s) => [
      s.album,
      {
        title: s.album,
        titleZhHans: s.albumZhHans,
        titleEn: s.albumEn,
        releaseYear: s.releaseYear,
      },
    ]),
  ).values(),
).sort((a, b) => a.releaseYear - b.releaseYear);
