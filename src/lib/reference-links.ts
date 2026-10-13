/**
 * Places a person can legitimately look up lyrics or chord sheets.
 * These are search links, not scraped content.
 */
export function arrangementSearchLinks(title: string, artist: string) {
  const query = encodeURIComponent(`${artist} ${title}`.trim());
  return [
    {
      label: "Ultimate Guitar",
      url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`,
    },
    {
      label: "Chordify",
      url: `https://chordify.net/search/${query}`,
    },
    {
      label: "Google (吉他譜 / chords)",
      url: `https://www.google.com/search?q=${encodeURIComponent(`${artist} ${title} 吉他譜 chords`)}`,
    },
  ];
}

export function lyricsSearchLinks(title: string, artist: string) {
  const query = encodeURIComponent(`${artist} ${title}`.trim());
  return [
    {
      label: "YouTube (official uploads)",
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
    {
      label: "Musixmatch",
      url: `https://www.musixmatch.com/search/${query}`,
    },
    {
      label: "KKBOX",
      url: `https://www.kkbox.com/tw/tc/search.php?word=${query}`,
    },
    {
      label: "Apple Music",
      url: `https://music.apple.com/search?term=${query}`,
    },
  ];
}
