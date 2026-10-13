import type { ChordArrangement, LyricLine, Song } from "@/lib/domain/types";
import { parseInlineChords } from "@/lib/music/chordsheet";

/**
 * The demo song.
 *
 * 巷口的晚風 ("Evening Breeze at the Alley") is an ORIGINAL song written for
 * ChordFlow. Both the lyrics and the chord arrangement were authored here, so
 * they can ship with the app and be used freely as a worked example of what a
 * complete arrangement looks like. No commercial song's words or chords are
 * reproduced anywhere in this repository.
 */

export const DEMO_SONG_ID = "demo_xiang_kou_de_wan_feng";
export const DEMO_ARRANGEMENT_ID = "arr_demo_xiang_kou_de_wan_feng";

export const DEMO_SONG: Song = {
  id: DEMO_SONG_ID,
  title: "巷口的晚風",
  titleZhHans: "巷口的晚风",
  titlePinyin: "Xiang Kou De Wan Feng",
  titleEn: "Evening Breeze at the Alley",
  artist: "ChordFlow 原創示範",
  artistZhHans: "ChordFlow 原创示范",
  artistPinyin: "ChordFlow Yuan Chuang Shi Fan",
  album: "ChordFlow Samples",
  releaseYear: 2024,
  originalKey: "G",
  difficulty: "beginner",
  arrangementStatus: "verified",
  tags: ["demo", "original", "beginner", "acoustic"],
  origin: "seed",
};

/** Deterministic ids keep server and client renders identical. */
let lineCounter = 0;
function line(
  inline: string,
  extras?: Pick<LyricLine, "pinyin" | "translation" | "note">,
): LyricLine {
  lineCounter += 1;
  const parsed = parseInlineChords(inline);
  return {
    ...parsed,
    ...extras,
    id: `demo_line_${lineCounter}`,
    chords: parsed.chords.map((chord, index) => ({
      ...chord,
      id: `demo_line_${lineCounter}_c${index}`,
    })),
  };
}

export const DEMO_ARRANGEMENT: ChordArrangement = {
  id: DEMO_ARRANGEMENT_ID,
  songId: DEMO_SONG_ID,
  title: "Acoustic demo arrangement",
  status: "verified",
  source: {
    kind: "demo",
    name: "ChordFlow original",
    attribution: "Original words and chords written for ChordFlow.",
  },
  originalKey: "G",
  capo: 0,
  tuning: ["E", "A", "D", "G", "B", "E"],
  tuningName: "Standard",
  bpm: 76,
  timeSignature: "4/4",
  difficulty: "beginner",
  notes:
    "Four-chord loop in G. Try a simple down-down-up-up-down-up strum, or fingerpick 6-3-2-3-1-3. Capo 2 keeps the same shapes a tone higher if the key feels low.",
  lyricsRights: "original-sample",
  lyricsAttribution: "Original sample lyrics © ChordFlow demo content.",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  sections: [
    {
      id: "demo_sec_intro",
      type: "intro",
      lines: [
        line("[G]    [D/F#]    [Em7]    [Cadd9]", {
          note: "x2, let each chord ring for a full bar",
        }),
      ],
    },
    {
      id: "demo_sec_verse1",
      type: "verse",
      label: "Verse 1",
      lines: [
        line("[G]巷口的晚[D/F#]風　吹過舊書[Em7]包", {
          pinyin: "xiàng kǒu de wǎn fēng　chuī guò jiù shū bāo",
          translation: "The evening breeze at the alley brushes my old school bag",
        }),
        line("[Cadd9]路燈剛亮起　影子拉得好[G]長", {
          pinyin: "lù dēng gāng liàng qǐ　yǐng zi lā de hǎo cháng",
          translation: "The street lamp just flickered on and my shadow stretches long",
        }),
        line("[G]你說夏天還[D/F#]長　吉他再彈一[Em7]遍", {
          pinyin: "nǐ shuō xià tiān hái cháng　jí tā zài tán yí biàn",
          translation: "You said summer is still long, so play the guitar once more",
        }),
        line("[Cadd9]我把和弦寫在　車票的背[G]面", {
          pinyin: "wǒ bǎ hé xián xiě zài　chē piào de bèi miàn",
          translation: "I wrote the chords down on the back of a bus ticket",
        }),
      ],
    },
    {
      id: "demo_sec_prechorus",
      type: "pre-chorus",
      lines: [
        line("[Am7]如果時間肯慢一[D]點", {
          pinyin: "rú guǒ shí jiān kěn màn yì diǎn",
          translation: "If only time would slow down a little",
        }),
        line("[Am7]我想多留一個[D]夏天", {
          pinyin: "wǒ xiǎng duō liú yí gè xià tiān",
          translation: "I'd like to keep one more summer",
        }),
      ],
    },
    {
      id: "demo_sec_chorus",
      type: "chorus",
      lines: [
        line("[G]晚風啊　請你再[D]吹久一些", {
          pinyin: "wǎn fēng a　qǐng nǐ zài chuī jiǔ yì xiē",
          translation: "Evening breeze, please blow a little longer",
        }),
        line("[Em7]讓這條巷子　記得我們的[Cadd9]歌", {
          pinyin: "ràng zhè tiáo xiàng zi　jì de wǒ men de gē",
          translation: "Let this alley remember our song",
        }),
        line("[G]晚風啊　等我把[D]和弦練熟", {
          pinyin: "wǎn fēng a　děng wǒ bǎ hé xián liàn shú",
          translation: "Evening breeze, wait until I know these chords by heart",
        }),
        line("[Em7]就回來這裡　唱給你[Cadd9]聽[D]　[G]", {
          pinyin: "jiù huí lái zhè lǐ　chàng gěi nǐ tīng",
          translation: "Then I'll come back here and sing it to you",
        }),
      ],
    },
    {
      id: "demo_sec_verse2",
      type: "verse",
      label: "Verse 2",
      lines: [
        line("[G]公車走得很[D/F#]慢　像那年的我[Em7]們", {
          pinyin: "gōng chē zǒu de hěn màn　xiàng nà nián de wǒ men",
          translation: "The bus moves slowly, just like we did that year",
        }),
        line("[Cadd9]把心事折成紙船　放進雨[G]裡", {
          pinyin: "bǎ xīn shì zhé chéng zhǐ chuán　fàng jìn yǔ lǐ",
          translation: "Folding our worries into paper boats and setting them in the rain",
        }),
      ],
    },
    {
      id: "demo_sec_bridge",
      type: "bridge",
      lines: [
        line("[Em7]一個和弦　一句歌[Cadd9]詞", {
          pinyin: "yí gè hé xián　yí jù gē cí",
          translation: "One chord, one line of lyrics",
        }),
        line("[G]慢慢把夜晚　走成[D]詩", {
          pinyin: "màn màn bǎ yè wǎn　zǒu chéng shī",
          translation: "Slowly walking the night into a poem",
        }),
      ],
    },
    {
      id: "demo_sec_outro",
      type: "outro",
      lines: [
        line("[Cadd9]    [D]    [Em7]    [G]", {
          note: "Ritardando, let the last G ring",
        }),
      ],
    },
  ],
};
