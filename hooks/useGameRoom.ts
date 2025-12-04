import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Room, Question, Player, RoomStatus, PlayerAnswer } from '../types';
import { playSound } from '../services/audioService';

type QuestionResultData = {
    answerStats: { a: number; b: number; c: number; d: number; };
    leaderboard: Player[];
};

export const useGameRoom = (roomId: string | undefined) => {
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [questionResults, setQuestionResults] = useState<QuestionResultData | null>(null);
  const [previousQuestionLeaderboard, setPreviousQuestionLeaderboard] = useState<Player[]>([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Real-time tracking stats
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  const roomRef = useRef<Room | null>(null);
  const questionsRef = useRef<Question[]>([]);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQuestionRef = useRef<Question | null>(null);

  // Sync refs with state to avoid stale closures in callbacks
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  const updateRoomStatus = useCallback(async (status: RoomStatus, additionalUpdates: object = {}) => {
    if (!roomId) return;
    const payload = { status, ...additionalUpdates };
    await supabase.from('rooms').update(payload).eq('id', roomId);
  }, [roomId]);

  const handleTimeUp = useCallback(async () => {
    if (!roomRef.current || roomRef.current.status !== 'running') return;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null; // Ensure timer is cleared
    await updateRoomStatus('question_result');
  }, [updateRoomStatus]);
  
  const fetchLeaderboard = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase.from('players').select('*').eq('room_id', roomId).order('skor', { ascending: false });
    if (data) setLeaderboard(data);
  }, [roomId]);

  // 1. Init Room & Questions
  useEffect(() => {
    if (!roomId) {
        navigate('/host/dashboard');
        return;
    }
    const init = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        if (roomError || !roomData) { navigate('/host/dashboard'); return; }

        const { data: qData, error: qError } = await supabase.from('questions').select('*').eq('quiz_id', roomData.quiz_id).order('order_index');
        if (qError) throw qError;

        setQuestions(qData);
        questionsRef.current = qData;
        
        setRoom(roomData);
        roomRef.current = roomData;

      } catch (error: any) {
        console.error("Game Host Init Error:", error);
        navigate('/host/dashboard');
      }
    };
    init();

    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    }
  }, [roomId, navigate]);
  
  // 2. Realtime Room Updates
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
        .channel(`room-host-${roomId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
            (payload) => {
                const newRoom = payload.new as Room;
                setRoom(newRoom);
                roomRef.current = newRoom;
            }
        )
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // 3. Track Players
  useEffect(() => {
    if (!roomId) return;

    const fetchPlayers = async () => {
        const { data } = await supabase.from('players').select('*').eq('room_id', roomId);
        if (data) {
            setAllPlayers(data);
        }
    };
    fetchPlayers();

    const channel = supabase.channel(`room-players-tracking-${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, 
        (payload) => {
            if (payload.eventType === 'INSERT') {
                setAllPlayers(prev => {
                    if (prev.find(p => p.id === (payload.new as Player).id)) return prev;
                    return [...prev, payload.new as Player];
                });
            } else if (payload.eventType === 'DELETE') {
                setAllPlayers(prev => prev.filter(p => p.id !== payload.old.id));
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // 4. Robust Auto-Advance Logic
  const checkAllAnswered = useCallback(async () => {
    const currentRoom = roomRef.current;
    const currentQ = currentQuestionRef.current;

    if (!currentRoom || currentRoom.status !== 'running' || !currentQ) {
      return;
    }

    const { count: playersCount, error: pError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', currentRoom.id);

    if (pError || playersCount === null) {
      console.error('Auto-advance failed to count players:', pError);
      return;
    }

    const { count: answersCount, error: aError } = await supabase
      .from('player_answers')
      .select('id, players!inner(room_id)', { count: 'exact', head: true })
      .eq('question_id', currentQ.id)
      .eq('players.room_id', currentRoom.id);

    if (aError || answersCount === null) {
      console.error('Auto-advance failed to count answers:', aError);
      return;
    }

    if (playersCount > 0 && answersCount >= playersCount) {
      handleTimeUp();
    }
  }, [handleTimeUp]);
  
  useEffect(() => {
    if (!roomId) return;

    const playersChannel = supabase
      .channel(`players-auto-advance-listener-${roomId}`)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        checkAllAnswered
      )
      .subscribe();

    const answersChannel = supabase
      .channel(`answers-auto-advance-listener-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_answers' },
        (payload) => {
          if ((payload.new as PlayerAnswer).question_id === currentQuestionRef.current?.id) {
            checkAllAnswered();
          }
        }
      )
      .subscribe();
            
    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(answersChannel);
    };
  }, [roomId, checkAllAnswered]);


  // 5. Game Loop Logic
  useEffect(() => {
    if (!room || questions.length === 0) return;

    if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
    }

    const currentQ = questions[room.current_question_index];
    setCurrentQuestion(currentQ);

    switch(room.status) {
      case 'question_intro':
        if (questionResults) {
            setPreviousQuestionLeaderboard(questionResults.leaderboard);
        }
        setQuestionResults(null); 
        
        transitionTimerRef.current = setTimeout(() => {
            updateRoomStatus('running', { question_start_time: new Date().toISOString() });
        }, 5000);
        break;
      
      case 'running':
        if (room.question_start_time && currentQ) {
          const start = new Date(room.question_start_time).getTime();
          const elapsed = Math.floor((Date.now() - start) / 1000);
          setTimeLeft(Math.max(0, currentQ.timer_detik - elapsed));
        }
        break;

      case 'question_result':
        const fetchResults = async () => {
            if (!roomId || !currentQ) return;
            const { data: answers } = await supabase
                .from('player_answers')
                .select('jawaban, players!inner(room_id)')
                .eq('question_id', currentQ.id)
                .eq('players.room_id', roomId);
                
            const { data: leaderboardData } = await supabase.from('players').select('*').eq('room_id', roomId).order('skor', { ascending: false }).limit(5);

            const stats = { a: 0, b: 0, c: 0, d: 0 };
            if (answers) {
                for (const ans of answers) {
                    const individualAnswers = ans.jawaban.split(',');
                    individualAnswers.forEach(key => {
                        if (key in stats) {
                             // @ts-ignore
                            stats[key]++;
                        }
                    });
                }
            }
            setQuestionResults({ answerStats: stats, leaderboard: leaderboardData || [] });
        };
        fetchResults();

        transitionTimerRef.current = setTimeout(() => {
            if (!roomRef.current) return;
            const nextIdx = roomRef.current.current_question_index + 1;
            if (nextIdx >= questionsRef.current.length) {
                updateRoomStatus('podium');
            } else {
                updateRoomStatus('question_intro', { current_question_index: nextIdx });
            }
        }, 8000);
        break;
      
      case 'final_leaderboard':
        fetchLeaderboard();
        break;

      case 'podium':
        playSound('win');
        fetchLeaderboard(); 
        break;
    }

    return () => { 
        if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
            transitionTimerRef.current = null;
        }
    }

  }, [room, questions, roomId, updateRoomStatus, fetchLeaderboard]);

  // Timer Countdown
  useEffect(() => {
    if (room?.status !== 'running' || !currentQuestion) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
         if (prev <= 1) {
           clearInterval(timer);
           handleTimeUp();
           return 0;
         }
         return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room?.status, currentQuestion, handleTimeUp]);

  const handleCancelQuiz = async () => {
    if (!roomId) return;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    await supabase.from('rooms').delete().eq('id', roomId);
    navigate('/host/dashboard');
  };

  const handleFinishAndExit = async () => {
    if (!roomId) return;
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
    navigate('/host/dashboard');
  };

  const kickPlayer = useCallback(async (playerIdToKick: string) => {
    if (!roomId) return;
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerIdToKick);

    if (error) {
      console.error("Error kicking player:", error.message);
      alert(`Gagal mengeluarkan pemain: ${error.message}`);
    } else {
      // If successful, immediately update the local state for a snappy UI response
      setAllPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerIdToKick));
    }
  }, [roomId]);

  return {
    room,
    questions,
    currentQuestion,
    timeLeft,
    leaderboard,
    questionResults,
    previousQuestionLeaderboard,
    allPlayers,
    isCancelModalOpen,
    setIsCancelModalOpen,
    handleCancelQuiz,
    handleFinishAndExit,
    updateRoomStatus,
    kickPlayer,
  };
};