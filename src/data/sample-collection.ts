import type { ChordArrangement, Song } from "@/lib/domain/types";
import { DEMO_ARRANGEMENT, DEMO_SONG } from "./demo-song";
import {
  SAMPLE_ARTIST,
  SAMPLE_SOURCE,
  SAMPLE_STAMP,
  makeLineFactory,
} from "./sample-line";

/**
 * Extra original practice songs.
 *
 * Same idea as 巷口的晚風: words and chords written for ChordFlow, so they
 * can ship as complete sheets. These are not covers of commercial songs.
 */

function sampleSong(
  slug: string,
  fields: Omit<Song, "id" | "artist" | "artistZhHans" | "artistPinyin" | "origin" | "arrangementStatus" | "album">,
): Song {
  return {
    id: `demo_${slug}`,
    artist: SAMPLE_ARTIST.name,
    artistZhHans: SAMPLE_ARTIST.nameZhHans,
    artistPinyin: SAMPLE_ARTIST.pinyin,
    album: "ChordFlow Samples",
    arrangementStatus: "verified",
    origin: "seed",
    ...fields,
  };
}

/* ------------------------------------------------ 便利店的燈 · C */

const storeLine = makeLineFactory("demo_bian_li_dian");

const STORE_SONG = sampleSong("bian_li_dian_de_deng", {
  title: "便利店的燈",
  titleZhHans: "便利店的灯",
  titlePinyin: "Bian Li Dian De Deng",
  titleEn: "Convenience Store Lights",
  releaseYear: 2024,
  originalKey: "C",
  difficulty: "beginner",
  tags: ["demo", "original", "beginner", "pop"],
});

const STORE_ARR: ChordArrangement = {
  id: "arr_demo_bian_li_dian_de_deng",
  songId: STORE_SONG.id,
  title: "Open-chord arrangement",
  status: "verified",
  source: SAMPLE_SOURCE,
  originalKey: "C",
  capo: 0,
  tuning: ["E", "A", "D", "G", "B", "E"],
  tuningName: "Standard",
  bpm: 82,
  timeSignature: "4/4",
  difficulty: "beginner",
  notes: "C–G–Am–F loop. Down-down-up-up-down-up. Leave the Cadd9 ringing at the ends of lines.",
  lyricsRights: "original-sample",
  lyricsAttribution: "Original sample lyrics © ChordFlow demo content.",
  createdAt: SAMPLE_STAMP,
  updatedAt: SAMPLE_STAMP,
  sections: [
    {
      id: "store_intro",
      type: "intro",
      lines: [storeLine("[C]    [G]    [Am]    [F]", { note: "x2, count it in quietly" })],
    },
    {
      id: "store_verse1",
      type: "verse",
      label: "Verse 1",
      lines: [
        storeLine("[C]午夜的便[G]利店　燈還亮[Am]著", {
          pinyin: "wǔ yè de biàn lì diàn　dēng hái liàng zhe",
          translation: "The midnight convenience store still has its lights on",
        }),
        storeLine("[F]收銀機輕響　像一句沒說完的[C]話", {
          pinyin: "shōu yín jī qīng xiǎng　xiàng yí jù méi shuō wán de huà",
          translation: "The register clicks softly, like a sentence left unfinished",
        }),
        storeLine("[C]我選一瓶熱[G]茶　你選薄荷糖的[Am]盒", {
          pinyin: "wǒ xuǎn yì píng rè chá　nǐ xuǎn bò he táng de hé",
          translation: "I pick a bottle of hot tea, you pick a tin of mints",
        }),
        storeLine("[F]玻璃門外　雨還在慢慢地[C]下", {
          pinyin: "bō li mén wài　yǔ hái zài màn màn de xià",
          translation: "Outside the glass door the rain is still coming down slowly",
        }),
      ],
    },
    {
      id: "store_chorus",
      type: "chorus",
      lines: [
        storeLine("[Am]便利店的[F]燈　請再亮一[C]晚[G]", {
          pinyin: "biàn lì diàn de dēng　qǐng zài liàng yì wǎn",
          translation: "Lights of the convenience store, please stay on one more night",
        }),
        storeLine("[Am]讓這條回家的[F]路　沒那麼[C]暗[G]", {
          pinyin: "ràng zhè tiáo huí jiā de lù　méi nà me àn",
          translation: "So the walk home is not quite so dark",
        }),
        storeLine("[Am]如果明天還[F]早　我們就再站一[C]站[G]", {
          pinyin: "rú guǒ míng tiān hái zǎo　wǒ men jiù zài zhàn yí zhàn",
          translation: "If tomorrow is still far off, we'll stand here a little longer",
        }),
        storeLine("[F]把熱茶握緊　把夜色喝[C]完", {
          pinyin: "bǎ rè chá wò jǐn　bǎ yè sè hē wán",
          translation: "Hold the hot tea tight and drink the night down",
        }),
      ],
    },
    {
      id: "store_bridge",
      type: "bridge",
      lines: [
        storeLine("[Dm]店員換班的時[G]候", {
          pinyin: "diàn yuán huàn bān de shí hòu",
          translation: "When the clerk changes shift",
        }),
        storeLine("[C]我們剛好把歌寫[Am]完[F]", {
          pinyin: "wǒ men gāng hǎo bǎ gē xiě wán",
          translation: "We have just finished writing the song",
        }),
      ],
    },
    {
      id: "store_outro",
      type: "outro",
      lines: [storeLine("[C]    [G]    [Am]    [F]    [C]", { note: "End on C, let it ring" })],
    },
  ],
};

/* ---------------------------------------------- 最後一班捷運 · Am */

const mrtLine = makeLineFactory("demo_jie_yun");

const MRT_SONG = sampleSong("zui_hou_yi_ban_jie_yun", {
  title: "最後一班捷運",
  titleZhHans: "最后一班捷运",
  titlePinyin: "Zui Hou Yi Ban Jie Yun",
  titleEn: "The Last MRT",
  releaseYear: 2024,
  originalKey: "Am",
  difficulty: "easy",
  tags: ["demo", "original", "easy", "ballad"],
});

const MRT_ARR: ChordArrangement = {
  id: "arr_demo_zui_hou_yi_ban_jie_yun",
  songId: MRT_SONG.id,
  title: "Late-night acoustic",
  status: "verified",
  source: SAMPLE_SOURCE,
  originalKey: "Am",
  capo: 0,
  tuning: ["E", "A", "D", "G", "B", "E"],
  tuningName: "Standard",
  bpm: 70,
  timeSignature: "4/4",
  difficulty: "easy",
  notes: "Am–F–C–G. Soft fingerpicking 5-3-2-3 works well. Capo 3 if the vocal sits low.",
  lyricsRights: "original-sample",
  lyricsAttribution: "Original sample lyrics © ChordFlow demo content.",
  createdAt: SAMPLE_STAMP,
  updatedAt: SAMPLE_STAMP,
  sections: [
    {
      id: "mrt_intro",
      type: "intro",
      lines: [mrtLine("[Am]    [F]    [C]    [G]", { note: "x2, muted strings on beat 2 and 4" })],
    },
    {
      id: "mrt_verse1",
      type: "verse",
      label: "Verse 1",
      lines: [
        mrtLine("[Am]月台上只剩廣[F]告　和自己的倒[C]影", {
          pinyin: "yuè tái shàng zhǐ shèng guǎng gào　hé zì jǐ de dào yǐng",
          translation: "Only ads and my own reflection left on the platform",
        }),
        mrtLine("[G]最後一班捷[Am]運　車門還開著等[F]誰", {
          pinyin: "zuì hòu yì bān jié yùn　chē mén hái kāi zhe děng shéi",
          translation: "The last MRT, doors still open, waiting for someone",
        }),
        mrtLine("[C]我把背包放在身[G]旁　像放下一整[Am]年", {
          pinyin: "wǒ bǎ bèi bāo fàng zài shēn páng　xiàng fàng xià yì zhěng nián",
          translation: "I set my bag beside me as if setting down a whole year",
        }),
        mrtLine("[F]隧道裡的風　比白天更[C]涼[G]", {
          pinyin: "suì dào lǐ de fēng　bǐ bái tiān gèng liáng",
          translation: "The wind in the tunnel is colder than daytime",
        }),
      ],
    },
    {
      id: "mrt_chorus",
      type: "chorus",
      lines: [
        mrtLine("[F]如果這班車不停在[C]我站", {
          pinyin: "rú guǒ zhè bān chē bù tíng zài wǒ zhàn",
          translation: "If this train will not stop at my station",
        }),
        mrtLine("[G]請把窗留一條縫給晚[Am]風", {
          pinyin: "qǐng bǎ chuāng liú yì tiáo fèng gěi wǎn fēng",
          translation: "Leave a crack in the window for the evening wind",
        }),
        mrtLine("[F]把沒說的話　寫在車廂的玻[C]璃", {
          pinyin: "bǎ méi shuō de huà　xiě zài chē xiāng de bō li",
          translation: "Write the unsaid words on the carriage glass",
        }),
        mrtLine("[G]等下一站的燈　把它讀[Am]懂", {
          pinyin: "děng xià yí zhàn de dēng　bǎ tā dú dǒng",
          translation: "Wait for the next station lights to read them",
        }),
      ],
    },
    {
      id: "mrt_bridge",
      type: "bridge",
      lines: [
        mrtLine("[Dm]廣播說終點快到[Am]了", {
          pinyin: "guǎng bō shuō zhōng diǎn kuài dào le",
          translation: "The announcement says the last stop is near",
        }),
        mrtLine("[E7]我還坐在中間那一[Am]排[G]", {
          pinyin: "wǒ hái zuò zài zhōng jiān nà yì pái",
          translation: "I am still sitting in that middle row",
        }),
      ],
    },
    {
      id: "mrt_outro",
      type: "outro",
      lines: [mrtLine("[Am]    [F]    [C]    [G]    [Am]", { note: "Hold the last Am" })],
    },
  ],
};

/* ---------------------------------------------- 窗台上的貓 · D */

const catLine = makeLineFactory("demo_mao");

const CAT_SONG = sampleSong("chuang_tai_shang_de_mao", {
  title: "窗台上的貓",
  titleZhHans: "窗台上的猫",
  titlePinyin: "Chuang Tai Shang De Mao",
  titleEn: "Cat on the Windowsill",
  releaseYear: 2024,
  originalKey: "D",
  difficulty: "beginner",
  tags: ["demo", "original", "beginner", "folk"],
});

const CAT_ARR: ChordArrangement = {
  id: "arr_demo_chuang_tai_shang_de_mao",
  songId: CAT_SONG.id,
  title: "Folk strum",
  status: "verified",
  source: SAMPLE_SOURCE,
  originalKey: "D",
  capo: 0,
  tuning: ["E", "A", "D", "G", "B", "E"],
  tuningName: "Standard",
  bpm: 96,
  timeSignature: "4/4",
  difficulty: "beginner",
  notes: "D–A–Bm–G. Keep Dsus2 in the intro if you want more air. Light muted strum on the verses.",
  lyricsRights: "original-sample",
  lyricsAttribution: "Original sample lyrics © ChordFlow demo content.",
  createdAt: SAMPLE_STAMP,
  updatedAt: SAMPLE_STAMP,
  sections: [
    {
      id: "cat_intro",
      type: "intro",
      lines: [catLine("[D]    [A]    [Bm]    [G]", { note: "x2, bounce the wrist" })],
    },
    {
      id: "cat_verse1",
      type: "verse",
      label: "Verse 1",
      lines: [
        catLine("[D]窗台上的[A]貓　曬著午後的金[Bm]邊", {
          pinyin: "chuāng tái shàng de māo　shài zhe wǔ hòu de jīn biān",
          translation: "The cat on the windowsill suns itself in the gold of afternoon",
        }),
        catLine("[G]尾巴一擺　把灰塵寫成短[D]句", {
          pinyin: "wěi ba yì bǎi　bǎ huī chén xiě chéng duǎn jù",
          translation: "One flick of the tail turns dust into a short sentence",
        }),
        catLine("[D]我把吉他靠在沙[A]發　它看我一眼就不理[Bm]了", {
          pinyin: "wǒ bǎ jí tā kào zài shā fā　tā kàn wǒ yì yǎn jiù bù lǐ le",
          translation: "I lean the guitar on the sofa; it glances once and ignores me",
        }),
        catLine("[G]好像這首歌　早該自己會[D]唱", {
          pinyin: "hǎo xiàng zhè shǒu gē　zǎo gāi zì jǐ huì chàng",
          translation: "As if this song should already know how to sing itself",
        }),
      ],
    },
    {
      id: "cat_chorus",
      type: "chorus",
      lines: [
        catLine("[G]別急著跳下[A]來　陽光還有半[Bm]寸[D]", {
          pinyin: "bié jí zhe tiào xià lái　yáng guāng hái yǒu bàn cùn",
          translation: "Don't jump down yet — there is half an inch of sun left",
        }),
        catLine("[G]我把和弦彈慢[A]一點　陪你再睡一[D]輪", {
          pinyin: "wǒ bǎ hé xián tán màn yì diǎn　péi nǐ zài shuì yì lún",
          translation: "I'll play the chords a little slower and sit with you through another nap",
        }),
      ],
    },
    {
      id: "cat_verse2",
      type: "verse",
      label: "Verse 2",
      lines: [
        catLine("[D]電話在另一個房[A]間　震動得像遠方的[Bm]雷", {
          pinyin: "diàn huà zài lìng yí gè fáng jiān　zhèn dòng de xiàng yuǎn fāng de léi",
          translation: "A phone buzzes in the other room like distant thunder",
        }),
        catLine("[G]我們都不接　讓午後繼續[D]懶", {
          pinyin: "wǒ men dōu bù jiē　ràng wǔ hòu jì xù lǎn",
          translation: "Neither of us answers; let the afternoon stay lazy",
        }),
      ],
    },
    {
      id: "cat_outro",
      type: "outro",
      lines: [catLine("[D]    [A]    [Bm]    [G]    [D]", { note: "Ritardando" })],
    },
  ],
};

/* ------------------------------------------- 舊吉他的夏天 · E */

const summerLine = makeLineFactory("demo_xia_tian");

const SUMMER_SONG = sampleSong("jiu_ji_ta_de_xia_tian", {
  title: "舊吉他的夏天",
  titleZhHans: "旧吉他的夏天",
  titlePinyin: "Jiu Ji Ta De Xia Tian",
  titleEn: "Summer of the Old Guitar",
  releaseYear: 2024,
  originalKey: "E",
  difficulty: "easy",
  tags: ["demo", "original", "easy", "uptempo"],
});

const SUMMER_ARR: ChordArrangement = {
  id: "arr_demo_jiu_ji_ta_de_xia_tian",
  songId: SUMMER_SONG.id,
  title: "Open-E campfire",
  status: "verified",
  source: SAMPLE_SOURCE,
  originalKey: "E",
  capo: 0,
  tuning: ["E", "A", "D", "G", "B", "E"],
  tuningName: "Standard",
  bpm: 108,
  timeSignature: "4/4",
  difficulty: "easy",
  notes: "E–B–C#m–A. All open or first-position shapes. Drive the chorus with all downstrokes.",
  lyricsRights: "original-sample",
  lyricsAttribution: "Original sample lyrics © ChordFlow demo content.",
  createdAt: SAMPLE_STAMP,
  updatedAt: SAMPLE_STAMP,
  sections: [
    {
      id: "summer_intro",
      type: "intro",
      lines: [summerLine("[E]    [B]    [C#m]    [A]", { note: "x2, clap on 2 and 4" })],
    },
    {
      id: "summer_verse1",
      type: "verse",
      label: "Verse 1",
      lines: [
        summerLine("[E]舊吉他的漆掉了一小[B]塊", {
          pinyin: "jiù jí tā de qī diào le yì xiǎo kuài",
          translation: "The old guitar has lost a little patch of lacquer",
        }),
        summerLine("[C#m]像那年夏天　我們在海邊寫的[A]字", {
          pinyin: "xiàng nà nián xià tiān　wǒ men zài hǎi biān xiě de zì",
          translation: "Like the words we wrote by the sea that summer",
        }),
        summerLine("[E]潮水來過又退[B]去", {
          pinyin: "cháo shuǐ lái guò yòu tuì qù",
          translation: "The tide came in and went back out",
        }),
        summerLine("[C#m]只留下鹽　和走調的第[A]一句", {
          pinyin: "zhǐ liú xià yán　hé zǒu diào de dì yí jù",
          translation: "Leaving only salt and a first line that was out of tune",
        }),
      ],
    },
    {
      id: "summer_pre",
      type: "pre-chorus",
      lines: [
        summerLine("[F#m]把音準鈕轉回來一點[B]", {
          pinyin: "bǎ yīn zhǔn niǔ zhuǎn huí lái yì diǎn",
          translation: "Turn the tuning peg back a little",
        }),
        summerLine("[F#m]這首歌還能再大聲一[B]點", {
          pinyin: "zhè shǒu gē hái néng zài dà shēng yì diǎn",
          translation: "This song can still get a little louder",
        }),
      ],
    },
    {
      id: "summer_chorus",
      type: "chorus",
      lines: [
        summerLine("[E]夏天啊　別把吉他收進盒[B]子", {
          pinyin: "xià tiān a　bié bǎ jí tā shōu jìn hé zi",
          translation: "Summer, don't put the guitar back in its case",
        }),
        summerLine("[C#m]讓弦上的汗　變成海的味[A]道", {
          pinyin: "ràng xián shàng de hàn　biàn chéng hǎi de wèi dào",
          translation: "Let the sweat on the strings become the taste of the sea",
        }),
        summerLine("[E]夏天啊　等我把副歌記[B]住", {
          pinyin: "xià tiān a　děng wǒ bǎ fù gē jì zhù",
          translation: "Summer, wait until I have the chorus by heart",
        }),
        summerLine("[C#m]就在堤防上　唱到燈亮[A]起[B]　[E]", {
          pinyin: "jiù zài dī fáng shàng　chàng dào dēng liàng qǐ",
          translation: "Then I'll sing on the breakwater until the lights come on",
        }),
      ],
    },
    {
      id: "summer_outro",
      type: "outro",
      lines: [summerLine("[A]    [B]    [E]", { note: "Big last E" })],
    },
  ],
};

/* --------------------------------------------- 雨停的時候 · 3/4 */

const rainLine = makeLineFactory("demo_yu_ting");

const RAIN_SONG = sampleSong("yu_ting_de_shi_hou", {
  title: "雨停的時候",
  titleZhHans: "雨停的时候",
  titlePinyin: "Yu Ting De Shi Hou",
  titleEn: "When the Rain Stops",
  releaseYear: 2024,
  originalKey: "G",
  difficulty: "easy",
  tags: ["demo", "original", "easy", "waltz"],
});

const RAIN_ARR: ChordArrangement = {
  id: "arr_demo_yu_ting_de_shi_hou",
  songId: RAIN_SONG.id,
  title: "Waltz in G",
  status: "verified",
  source: SAMPLE_SOURCE,
  originalKey: "G",
  capo: 0,
  tuning: ["E", "A", "D", "G", "B", "E"],
  tuningName: "Standard",
  bpm: 88,
  timeSignature: "3/4",
  difficulty: "easy",
  notes: "Waltz feel: bass–chord–chord. G–Em–C–D. Accent beat 1 of every bar. Metronome on 3 works well.",
  lyricsRights: "original-sample",
  lyricsAttribution: "Original sample lyrics © ChordFlow demo content.",
  createdAt: SAMPLE_STAMP,
  updatedAt: SAMPLE_STAMP,
  sections: [
    {
      id: "rain_intro",
      type: "intro",
      lines: [rainLine("[G]    [Em]    [C]    [D]", { note: "x2, count 1-2-3" })],
    },
    {
      id: "rain_verse1",
      type: "verse",
      label: "Verse 1",
      lines: [
        rainLine("[G]雨停的時[Em]候　屋頂還在滴[C]水", {
          pinyin: "yǔ tíng de shí hòu　wū dǐng hái zài dī shuǐ",
          translation: "When the rain stops, the roof is still dripping",
        }),
        rainLine("[D]像有人用指尖　敲著舊節[G]拍", {
          pinyin: "xiàng yǒu rén yòng zhǐ jiān　qiāo zhe jiù jié pāi",
          translation: "As if someone is tapping an old meter with a fingertip",
        }),
        rainLine("[G]我把窗戶推[Em]開　讓潮濕的風進[C]來", {
          pinyin: "wǒ bǎ chuāng hù tuī kāi　ràng cháo shī de fēng jìn lái",
          translation: "I push the window open and let the damp wind in",
        }),
        rainLine("[D]把沒彈完的那小節　接回這把[G]琴", {
          pinyin: "bǎ méi tán wán de nà xiǎo jié　jiē huí zhè bǎ qín",
          translation: "And join the unfinished bar back to this guitar",
        }),
      ],
    },
    {
      id: "rain_chorus",
      type: "chorus",
      lines: [
        rainLine("[Em]雨停的時[C]候　請留給我三[G]拍[D]", {
          pinyin: "yǔ tíng de shí hòu　qǐng liú gěi wǒ sān pāi",
          translation: "When the rain stops, leave me three beats",
        }),
        rainLine("[Em]一步　一句　再一個和[C]弦[D]", {
          pinyin: "yí bù　yí jù　zài yí gè hé xián",
          translation: "One step, one line, then one more chord",
        }),
        rainLine("[G]如果天空肯亮[Em]一點", {
          pinyin: "rú guǒ tiān kōng kěn liàng yì diǎn",
          translation: "If the sky will brighten just a little",
        }),
        rainLine("[C]我就把這首歌　唱到你聽[D]見[G]", {
          pinyin: "wǒ jiù bǎ zhè shǒu gē　chàng dào nǐ tīng jiàn",
          translation: "I'll sing this song until you hear it",
        }),
      ],
    },
    {
      id: "rain_bridge",
      type: "bridge",
      lines: [
        rainLine("[Am]水窪裡有一整條街的燈[D]", {
          pinyin: "shuǐ wā lǐ yǒu yì zhěng tiáo jiē de dēng",
          translation: "A whole street of lights sits in the puddle",
        }),
        rainLine("[G]我踩過去　也不忍把它踩[Em]碎[C]　[D]", {
          pinyin: "wǒ cǎi guò qù　yě bù rěn bǎ tā cǎi suì",
          translation: "I step across and cannot bear to break it",
        }),
      ],
    },
    {
      id: "rain_outro",
      type: "outro",
      lines: [rainLine("[C]    [D]    [G]", { note: "Fermata on G" })],
    },
  ],
};

export const EXTRA_SAMPLE_SONGS: Song[] = [
  STORE_SONG,
  MRT_SONG,
  CAT_SONG,
  SUMMER_SONG,
  RAIN_SONG,
];

export const EXTRA_SAMPLE_ARRANGEMENTS: ChordArrangement[] = [
  STORE_ARR,
  MRT_ARR,
  CAT_ARR,
  SUMMER_ARR,
  RAIN_ARR,
];

export const SAMPLE_SONGS: Song[] = [DEMO_SONG, ...EXTRA_SAMPLE_SONGS];
export const SAMPLE_ARRANGEMENTS: ChordArrangement[] = [
  DEMO_ARRANGEMENT,
  ...EXTRA_SAMPLE_ARRANGEMENTS,
];
