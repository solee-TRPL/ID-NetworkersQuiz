// services/audioService.ts

type SoundType = 'click' | 'win';

const soundLibrary: Record<SoundType, string> = {
  click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2491a91439.mp3', // Tombol klik
  win: 'https://cdn.pixabay.com/audio/2022/11/11/audio_165a257451.mp3',   // Jingle kemenangan
};

// Objek untuk melacak instance audio yang sedang diputar
const playingSounds: { [key: string]: HTMLAudioElement } = {};

export const playSound = (sound: SoundType) => {
  try {
    const url = soundLibrary[sound];
    if (url) {
      // Hentikan suara sebelumnya jika ada untuk jenis yang sama, agar tidak tumpang tindih
      if (playingSounds[sound]) {
        playingSounds[sound].pause();
        playingSounds[sound].currentTime = 0;
      }

      const audio = new Audio(url);
      audio.volume = 0.5; // Atur volume agar tidak terlalu keras
      audio.play().catch(error => {
        // Tangani error jika pemutaran otomatis diblokir oleh browser
        console.warn(`Gagal memutar suara '${sound}':`, error);
      });
      playingSounds[sound] = audio;
    }
  } catch (error) {
    console.error(`Error saat memutar suara '${sound}':`, error);
  }
};
