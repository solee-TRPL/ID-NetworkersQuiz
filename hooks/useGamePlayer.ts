import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Question, Player, Room, RoomStatus } from '../types';
import { playSound } from '../services/audioService';

type AnswerResult = {
  isCorrect: boolean;
  scoreAwarded: number;
  currentRank: number;
  correctAnswer: string;
  correctCount: number;
  totalNeeded: number;
  speedBonus: number;
};

export const useGamePlayer = (playerId: string | undefined) => {
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [gameState, setGameState] = useState<RoomStatus>('waiting');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null);
  const [quizCancelled, setQuizCancelled] = useState(false);
  
  // New state for multi-select
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [requiredAnswersCount, setRequiredAnswersCount] = useState(1);
  
  // Refs to access latest state inside realtime callbacks
  const currentQuestionRef = useRef<Question | null>(null);
  const roomRef = useRef<Room | null>(null);
  const selectedAnswersRef = useRef<string[]>([]);
  const hasAnsweredRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    hasAnsweredRef.current = hasAnswered;
  }, [hasAnswered]);

  const loadQuestionAndCheckAnswer = useCallback(async (room: Room): Promise<void> => {
    if (!playerId) return;
    
    const { data: qData, error: qError } = await supabase.from('questions')
       .select('*')
       .eq('quiz_id', room.quiz_id)
       .eq('order_index', room.current_question_index)
       .single();

    if (qError || !qData) {
      setCurrentQuestion(null);
      currentQuestionRef.current = null;
      setHasAnswered(false);
      setSelectedAnswers([]);
      setIsMultiSelect(false);
      return;
    }
    
    const { data: answerData } = await supabase.from('player_answers')
        .select('id, jawaban')
        .eq('player_id', playerId)
        .eq('question_id', qData.id)
        .maybeSingle();
        
    setHasAnswered(!!answerData);
    if (answerData) {
        setSelectedAnswers(answerData.jawaban.split(','));
    } else {
        setSelectedAnswers([]);
    }

    currentQuestionRef.current = qData;
    setCurrentQuestion(qData);
    
    // Check if question allows multiple answers
    const correctAnswers = qData.jawaban_benar ? qData.jawaban_benar.split(',') : [];
    const count = correctAnswers.length;
    setRequiredAnswersCount(count);
    setIsMultiSelect(count > 1);

  }, [playerId]);
  
  useEffect(() => {
      if (quizCancelled) {
          const timer = setTimeout(() => navigate('/'), 3000);
          return () => clearTimeout(timer);
      }
  }, [quizCancelled, navigate]);

  // Modified submitAnswers to accept specific answers (for immediate submission)
  const submitAnswers = useCallback(async (answersOverride?: string[]) => {
    if (!playerId || !currentQuestionRef.current || hasAnsweredRef.current) return;
    
    const answersToSubmit = answersOverride || selectedAnswersRef.current;
    
    // Sort selection to match format "a,b"
    const finalAnswer = answersToSubmit.sort().join(',');
    
    if (!finalAnswer) return; // Don't submit empty

    setHasAnswered(true);
    // playSound('click'); // Already played on toggle

    const { data, error } = await supabase.rpc('submit_player_answer', {
      p_player_id: playerId,
      p_question_id: currentQuestionRef.current.id,
      p_submitted_answer: finalAnswer
    });
  }, [playerId]);

  useEffect(() => {
    if (!playerId) {
      navigate('/');
      return;
    }

    let channel: any;

    const fetchInitialData = async () => {
      const { data: playerData, error: playerError } = await supabase.from('players')
        .select('*, rooms!inner(*)')
        .eq('id', playerId)
        .single();

      if (playerError || !playerData || !playerData.rooms) {
        console.error("Failed to fetch initial player or room data:", playerError);
        setQuizCancelled(true);
        return;
      }
      
      const room = playerData.rooms as Room;
      setPlayer(playerData);
      setTotalScore(playerData.skor);
      setRoomIdAndSubscribe(room.id);

      roomRef.current = room;
      if (['question_intro', 'running', 'question_result', 'podium', 'finished'].includes(room.status)) {
        await loadQuestionAndCheckAnswer(room);
      }
      setGameState(room.status);
    };

    const setRoomIdAndSubscribe = (roomId: string) => {
        channel = supabase.channel(`player-room-${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          async (payload) => {
            if (payload.eventType === 'DELETE') {
              setQuizCancelled(true);
              return;
            }

            const newRoom = payload.new as Room;
            const oldRoom = roomRef.current; // Get state before this update
            roomRef.current = newRoom;       // Update ref immediately

            // Always keep UI state in sync with the room status
            setGameState(newRoom.status);

            // If question index has advanced, it's a new question. This is the most reliable
            // trigger, preventing getting stuck if a 'question_intro' message is missed.
            if (oldRoom && newRoom.current_question_index > oldRoom.current_question_index) {
              setHasAnswered(false);
              setLastAnswerResult(null);
              setSelectedAnswers([]);
              await loadQuestionAndCheckAnswer(newRoom);
            }

            // --- Handle logic specific to ENTERING a new state ---

            // When transitioning to the result screen for the first time
            if (newRoom.status === 'question_result' && oldRoom?.status !== 'question_result') {
              // Auto-submit if time runs out
              if (!hasAnsweredRef.current && selectedAnswersRef.current.length > 0) {
                await submitAnswers();
              }

              const q = currentQuestionRef.current;
              if (q) {
                const { data: players } = await supabase.from('players').select('id, skor').eq('room_id', newRoom.id).order('skor', { ascending: false });
                const myRank = players ? players.findIndex(p => p.id === playerId) + 1 : 0;
                
                const { data: lastAnswer } = await supabase.from('player_answers').select('*').eq('player_id', playerId).eq('question_id', q.id).maybeSingle();
                
                let correctCount = 0;
                const correctParts = q.jawaban_benar.split(',');
                const totalNeeded = correctParts.length;
                const scoreAwarded = lastAnswer?.score_awarded ?? 0;
                
                let baseScore = 0;
                if (lastAnswer) {
                     const playerParts = lastAnswer.jawaban.split(',');
                     const pointsPerItem = Math.floor(100 / totalNeeded);
                     playerParts.forEach(p => {
                         if (correctParts.includes(p)) baseScore += pointsPerItem;
                         else baseScore -= pointsPerItem;
                     });
                     correctCount = playerParts.filter(p => correctParts.includes(p)).length;
                }
                
                const inferredBonus = Math.max(0, scoreAwarded - baseScore);

                setLastAnswerResult({
                    isCorrect: lastAnswer?.is_correct ?? false,
                    scoreAwarded: scoreAwarded,
                    currentRank: myRank,
                    correctAnswer: q.jawaban_benar,
                    correctCount: correctCount,
                    totalNeeded: totalNeeded,
                    speedBonus: inferredBonus
                });
                
                const { data: updatedPlayer } = await supabase.from('players').select('skor').eq('id', playerId).single();
                if (updatedPlayer) setTotalScore(updatedPlayer.skor);
              }
            }
            
            // When game ends, fetch final score
            if (['podium', 'finished'].includes(newRoom.status) && oldRoom?.status !== newRoom.status) {
              const { data: finalPlayerData } = await supabase.from('players').select('skor').eq('id', playerId).single();
              if (finalPlayerData) setTotalScore(finalPlayerData.skor);
            }
          }
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` },
          () => {
            setQuizCancelled(true);
          }
        )
        .subscribe();
    };

    fetchInitialData();

    return () => { 
        if (channel) supabase.removeChannel(channel);
    };
  }, [playerId, navigate, loadQuestionAndCheckAnswer, submitAnswers]);

  const handleAnswer = async (answer: 'a' | 'b' | 'c' | 'd') => {
    if (!playerId || !currentQuestionRef.current || hasAnswered) return;
    
    playSound('click');

    let newSelectedAnswers: string[];

    if (isMultiSelect) {
        if (selectedAnswers.includes(answer)) {
            newSelectedAnswers = selectedAnswers.filter(a => a !== answer);
        } else {
            newSelectedAnswers = [...selectedAnswers, answer];
        }
    } else {
        // Single select behavior
        newSelectedAnswers = [answer];
    }

    // Update state
    setSelectedAnswers(newSelectedAnswers);

    // AUTO SUBMIT CHECK
    // If we have selected the required number of answers, submit immediately
    if (newSelectedAnswers.length === requiredAnswersCount) {
        // We pass the new selection directly to avoid waiting for state update
        await submitAnswers(newSelectedAnswers);
    }
  };

  return {
    player,
    currentQuestion,
    gameState,
    hasAnswered,
    totalScore,
    lastAnswerResult,
    quizCancelled,
    handleAnswer,
    selectedAnswers,
    isMultiSelect,
    requiredAnswersCount,
    submitAnswers
  };
};