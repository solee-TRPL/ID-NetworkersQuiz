export interface Host {
  id: string;
  email: string;
}

export type TingkatKesulitan = 'mudah' | 'sedang' | 'sulit';

export interface QuizCategory {
  id: string;
  host_id: string;
  nama: string;
}

export interface Quiz {
  id: string;
  host_id: string;
  judul: string;
  created_at: string;
  tingkat_kesulitan: TingkatKesulitan;
  category_id?: string | null;
  quiz_categories?: { nama: string } | null;
  questions?: Question[];
}

export interface Question {
  id: string;
  quiz_id: string;
  teks_soal: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  jawaban_benar: string; // Changed from union type to string to support "a,b" etc.
  timer_detik: number;
  order_index: number;
}

export type RoomStatus = 'waiting' | 'question_intro' | 'running' | 'question_result' | 'final_leaderboard' | 'podium' | 'finished';

export interface Room {
  id: string;
  quiz_id: string;
  host_id: string;
  kode_room: string;
  status: RoomStatus;
  current_question_index: number;
  question_start_time: string | null;
  // FIX: Add created_at property to Room interface. This is returned by Supabase and used in HistoryModal.
  created_at: string;
  quiz?: Quiz;
}

export interface Player {
  id: string;
  room_id: string;
  nama: string;
  skor: number;
  avatar: string;
}

export interface PlayerAnswer {
  id: string;
  player_id: string;
  question_id: string;
  jawaban: string;
  is_correct: boolean;
  score_awarded: number;
}