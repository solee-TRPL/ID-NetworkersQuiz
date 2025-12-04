import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Player } from '../types';
import { Button } from '../components/Button';
import { Users, Star, Loader2, X, Trophy, CheckCircle, ChevronRight, BarChart2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useGameRoom } from '../hooks/useGameRoom';
import { PlayerManagementModal } from './PlayerManagementModal';

// Custom hook for animating numbers
const useAnimatedNumber = (target: number, duration: number = 500) => {
    const [current, setCurrent] = useState(target);
    const frameRef = React.useRef<number | null>(null);
    const startTimeRef = React.useRef<number | null>(null);

    useEffect(() => {
        const start = current;
        startTimeRef.current = performance.now();

        const animate = (time: number) => {
            const elapsed = time - (startTimeRef.current || time);
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.floor(start + (target - start) * progress);
            setCurrent(value);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [target, duration]); // FIX: Removed `current` from dependency array to prevent infinite loop

    return current;
};

// Custom hook for FLIP animation (First, Last, Invert, Play)
const useFlipAnimation = (dependencies: any[]) => {
    const refs = useRef<Record<string, HTMLElement | null>>({});
    const prevRects = useRef<Record<string, DOMRect>>({});
  
    useLayoutEffect(() => {
      const newRects: Record<string, DOMRect> = {};
  
      // Get NEW positions and apply animations
      Object.keys(refs.current).forEach(id => {
        const node = refs.current[id];
        if (!node) return;
        
        newRects[id] = node.getBoundingClientRect();
        const prevRect = prevRects.current[id];
  
        if (prevRect) {
          const dx = prevRect.left - newRects[id].left;
          const dy = prevRect.top - newRects[id].top;
  
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            requestAnimationFrame(() => {
              node.style.transform = `translate(${dx}px, ${dy}px)`;
              node.style.transition = 'transform 0s';
              requestAnimationFrame(() => {
                node.style.transform = '';
                node.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
              });
            });
          }
        }
      });
  
      // Store the NEW positions for the NEXT render.
      prevRects.current = newRects;
  
    }, dependencies);
  
    const register = useCallback((id: string) => (node: HTMLElement | null) => {
      if (node) {
        refs.current[id] = node;
      } else {
        delete refs.current[id];
      }
    }, []);
  
    return register;
  };

interface LeaderboardRowProps {
    player: Player;
    rank: number;
    rankChange: 'up' | 'down' | 'new' | 'none';
}

const LeaderboardRow = React.memo(React.forwardRef<HTMLDivElement, LeaderboardRowProps>(({ player, rank, rankChange }, ref) => {
    const animatedScore = useAnimatedNumber(player.skor);
    const [highlight, setHighlight] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setHighlight(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const highlightClasses: Record<string, string> = {
        up: 'bg-green-100',
        down: 'bg-red-100',
        new: 'bg-blue-100',
        none: 'bg-slate-100'
    };

    const rankChangeIcons: Record<string, React.ReactNode> = {
        up: <ArrowUp className="w-4 h-4 text-green-500" />,
        down: <ArrowDown className="w-4 h-4 text-red-500" />,
        new: <Sparkles className="w-4 h-4 text-blue-500" />,
        none: null
    };

    return (
        <div ref={ref} className={`flex items-center justify-between p-2 rounded-lg transition-colors duration-500 ${highlight ? highlightClasses[rankChange] : 'bg-slate-100'}`}>
            <div className="flex items-center gap-2">
                <div className="font-bold text-slate-500 w-8 text-center flex items-center justify-center gap-1">
                    <span>{rank}</span>
                    {rankChangeIcons[rankChange]}
                </div>
                <img src={player.avatar} alt="avatar" className="w-7 h-7 rounded-full bg-slate-300"/>
                <span className="font-semibold text-sm">{player.nama}</span>
            </div>
            <span className="font-bold text-sm text-primary-dark">{animatedScore}</span>
        </div>
    );
}));
LeaderboardRow.displayName = 'LeaderboardRow';


const GameHost: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const {
    room,
    questions,
    currentQuestion,
    timeLeft,
    leaderboard,
    questionResults,
    previousQuestionLeaderboard,
    allPlayers,
    kickPlayer,
    isCancelModalOpen,
    setIsCancelModalOpen,
    handleCancelQuiz,
    handleFinishAndExit,
    updateRoomStatus,
  } = useGameRoom(roomId);

  const registerFlip = useFlipAnimation([questionResults]);
  
  const renderQuestionIntro = () => {
    if (!currentQuestion) return null;
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-accent p-6 bg-surface animate-pop">
            <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-xl font-bold bg-primary/10 text-primary px-4 py-1.5 rounded-full mb-4">Soal #{room!.current_question_index + 1}</p>
                <h1 className="text-3xl md:text-4xl font-extrabold max-w-4xl">{currentQuestion.teks_soal}</h1>
            </div>
        </div>
    );
  };

  const renderQuestionRunning = () => {
      if (!currentQuestion) return null;
      const options = [
          { key: 'a', color: 'bg-red-600', symbol: 'A', text: currentQuestion.opsi_a },
          { key: 'b', color: 'bg-blue-600', symbol: 'B', text: currentQuestion.opsi_b },
          { key: 'c', color: 'bg-yellow-500', symbol: 'C', text: currentQuestion.opsi_c },
          { key: 'd', color: 'bg-green-600', symbol: 'D', text: currentQuestion.opsi_d },
      ];
      return (
        <div className="h-full flex flex-col p-4 sm:p-6 text-accent bg-slate-100">
          <header className="grid grid-cols-3 gap-4 items-center mb-4 pr-14">
              <div className="bg-white border border-slate-200 px-3 rounded-xl flex items-center justify-center gap-2 h-10">
                <Users className="w-5 h-5 text-primary"/>
                <span className="text-lg sm:text-xl font-bold">{allPlayers.length}</span>
              </div>
              <div className="bg-white border border-slate-200 px-3 rounded-xl flex items-center justify-center h-10">
                <span className="text-2xl sm:text-4xl font-black text-accent leading-none">{timeLeft}</span>
              </div>
              <div className="bg-white border border-slate-200 px-3 rounded-xl flex items-center justify-center gap-2 h-10">
                <span className="text-lg sm:text-xl font-bold">{room!.current_question_index + 1} / {questions.length}</span>
              </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <h1 className="text-2xl sm:text-3xl font-bold max-w-4xl mb-6">{currentQuestion.teks_soal}</h1>
          </main>
          
          <footer className="grid grid-cols-2 gap-3 sm:gap-4">
              {options.map(opt => (
                  <div key={opt.key} className={`p-3 sm:p-4 rounded-lg flex items-center gap-3 sm:gap-4 text-left ${opt.color} text-white`}>
                      <div className="text-2xl sm:text-4xl font-bold">{opt.symbol}</div>
                      <span className="text-sm sm:text-base font-semibold">{opt.text}</span>
                  </div>
              ))}
          </footer>
        </div>
      );
  };
  
  const renderQuestionResult = () => {
    if (!currentQuestion || !questionResults) return <div className="flex-1 flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;

    const options = [
        { key: 'a', color: 'bg-red-100 text-red-800 border-red-200', symbol: 'A' },
        { key: 'b', color: 'bg-blue-100 text-blue-800 border-blue-200', symbol: 'B' },
        { key: 'c', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', symbol: 'C' },
        { key: 'd', color: 'bg-green-100 text-green-800 border-green-200', symbol: 'D' },
    ];
    const totalAnswers = Object.values(questionResults.answerStats).reduce((a, b) => a + b, 0);

    return (
      <div className="h-full flex flex-col items-center justify-center text-accent bg-slate-50 p-4 sm:p-6 space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-center">Hasil Soal</h1>
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-3 shadow-lg">
                  <h2 className="text-lg font-bold text-primary mb-2 flex items-center gap-2"><BarChart2 size={20}/> Jawaban Pemain</h2>
                  {options.map(opt => {
                    const count = questionResults.answerStats[opt.key as 'a'|'b'|'c'|'d'];
                    const isCorrect = currentQuestion.jawaban_benar === opt.key;
                    const width = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;
                    return (
                        <div key={opt.key} className="flex items-center gap-3 text-sm">
                            <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center font-bold text-lg ${isCorrect ? 'bg-primary text-white' : opt.color}`}>
                                {isCorrect ? <CheckCircle/> : opt.symbol}
                            </div>
                            <div className="flex-1 bg-slate-200 rounded-full h-6 overflow-hidden">
                                <div className="bg-primary/50 h-full rounded-full transition-all duration-500" style={{ width: `${width}%` }}></div>
                            </div>
                            <span className="font-bold w-10 text-right">{count}</span>
                        </div>
                    );
                  })}
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col shadow-lg">
                  <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2"><Trophy size={20}/> Papan Skor Teratas</h2>
                  <div className="flex-1 space-y-2">
                    {questionResults.leaderboard.length > 0 ? questionResults.leaderboard.map((player, idx) => {
                        const oldIndex = previousQuestionLeaderboard.findIndex(p => p.id === player.id);
                        let rankChange: 'up' | 'down' | 'new' | 'none' = 'none';
                        if (oldIndex === -1 && previousQuestionLeaderboard.length > 0) {
                            rankChange = 'new';
                        } else if (oldIndex > idx) {
                            rankChange = 'up';
                        } else if (oldIndex !== -1 && oldIndex < idx) {
                            rankChange = 'down';
                        }
                        
                        return (
                            <LeaderboardRow 
                                key={player.id} 
                                ref={registerFlip(player.id)}
                                player={player} 
                                rank={idx + 1} 
                                rankChange={rankChange}
                            />
                        );
                    }) : <p className="text-slate-400 text-sm text-center pt-8">Belum ada yang menjawab.</p>}
                  </div>
              </div>
          </div>
      </div>
    );
  };
  
  const renderPodium = () => {
    const top3 = leaderboard.slice(0, 3);
    const podiumOrder = [top3.find((_, i) => i === 1), top3.find((_, i) => i === 0), top3.find((_, i) => i === 2)].filter(Boolean);
  
    return (
      <div className="h-full flex flex-col items-center justify-between text-accent bg-slate-50 p-4 sm:p-6 text-center">
        <header className="w-full text-center">
          <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Podium Juara</h1>
        </header>
  
        <main className="flex-1 flex items-end justify-center w-full max-w-2xl">
          <div className="flex justify-center items-end gap-2 sm:gap-4 w-full">
            {podiumOrder.map((player, index) => {
              if (!player) return <div key={index}></div>;
              const isFirst = player.id === leaderboard[0]?.id;
              const isSecond = player.id === leaderboard[1]?.id;
              const height = isFirst ? 'h-48 sm:h-64' : (isSecond ? 'h-36 sm:h-48' : 'h-28 sm:h-36');
              const podiumColor = isFirst ? 'bg-yellow-400' : (isSecond ? 'bg-slate-400' : 'bg-yellow-600');
              const rank = leaderboard.findIndex(p => p.id === player.id) + 1;
              
              return (
                <div key={player.id} className="flex flex-col items-center justify-end">
                  <div className="flex flex-col items-center animate-pop" style={{ animationDelay: `${index * 150}ms` }}>
                    <Star className={`w-6 h-6 mb-2 ${isFirst ? 'text-yellow-400' : 'text-transparent'}`} />
                    <img src={player.avatar} alt="avatar" className="w-16 sm:w-20 h-16 sm:h-20 rounded-full border-4 border-white/80 shadow-lg bg-slate-300" />
                    <p className="font-bold text-sm sm:text-base mt-2 truncate max-w-[100px]">{player.nama}</p>
                    <p className="font-extrabold text-lg sm:text-xl text-primary-dark">{player.skor} pts</p>
                  </div>
                  <div className={`w-full ${height} ${podiumColor} rounded-t-lg flex items-center justify-center text-5xl sm:text-7xl font-black text-white/50 shadow-inner`}>
                    {rank}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
  
        <footer className="w-full mt-6">
          <Button onClick={() => updateRoomStatus('final_leaderboard')}>
            Lihat Papan Skor <ChevronRight className="w-5 h-5 ml-1 inline" />
          </Button>
        </footer>
      </div>
    );
  };

  const renderFinalLeaderboard = () => {
    return (
        <div className="h-full flex flex-col items-center p-4 sm:p-6 text-accent w-full max-w-2xl mx-auto bg-slate-50">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Papan Skor Akhir</h1>
            <main className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto hide-scrollbar shadow-lg">
                <div className="space-y-2">
                    {leaderboard.map((player, index) => (
                        <div key={player.id} className={`flex items-center justify-between p-3 rounded-lg ${
                            index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-slate-200' : index === 2 ? 'bg-yellow-200/50' : 'bg-slate-100'
                        }`}>
                            <div className="flex items-center gap-3">
                                <span className={`font-bold text-slate-600 w-8 text-center text-lg ${index < 3 ? 'text-accent' : ''}`}>{index + 1}</span>
                                <img src={player.avatar} alt="avatar" className="w-10 h-10 rounded-full bg-slate-300"/>
                                <span className="font-bold">{player.nama}</span>
                            </div>
                            <span className="font-extrabold text-lg text-primary-dark">{player.skor}</span>
                        </div>
                    ))}
                </div>
            </main>
            <footer className="mt-6">
                <Button onClick={handleFinishAndExit} variant="destructive">
                    Selesai & Keluar
                </Button>
            </footer>
        </div>
    );
  };
  
  const renderContent = () => {
      if (!room) {
          return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
      }
      switch (room.status) {
          case 'question_intro': return renderQuestionIntro();
          case 'running': return renderQuestionRunning();
          case 'question_result': return renderQuestionResult();
          case 'podium': return renderPodium();
          case 'final_leaderboard': return renderFinalLeaderboard();
          default: return <div className="flex-1 flex items-center justify-center"><p>Status tidak diketahui: {room.status}</p></div>
      }
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      {['question_intro', 'running', 'question_result'].includes(room?.status || '') && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsCancelModalOpen(true)}
              className="!p-2.5 hover:bg-primary/10 hover:text-primary"
              aria-label="Keluar Kuis"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsPlayerModalOpen(true)}
              className="!p-2.5"
              aria-label="Kelola Pemain"
            >
              <Users className="w-5 h-5" />
            </Button>
        </div>
      )}
      {renderContent()}
      <PlayerManagementModal
        isOpen={isPlayerModalOpen}
        onClose={() => setIsPlayerModalOpen(false)}
        players={allPlayers}
        onKickPlayer={kickPlayer}
      />
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelQuiz}
        title="Akhiri Kuis"
        message="Apakah Anda yakin ingin mengakhiri kuis ini sekarang? Semua kemajuan akan hilang."
        confirmText="Ya, Akhiri"
      />
    </div>
  );
};

export default GameHost;