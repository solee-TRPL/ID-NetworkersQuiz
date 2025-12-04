import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { CheckCircle, Loader2, Award, XCircle, LogOut, Check, AlertCircle, Zap } from 'lucide-react';
import { useGamePlayer } from '../hooks/useGamePlayer';

const GamePlayer: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const {
    player,
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
  } = useGamePlayer(playerId);
  
  if (quizCancelled) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-accent text-center">
            <div className="animate-pop">
                <LogOut className="w-16 h-16 text-primary mb-6 mx-auto"/>
                <h1 className="text-2xl font-bold">Kuis Telah Berakhir</h1>
                <p className="text-slate-500 mt-2">Host telah mengakhiri permainan. Anda akan diarahkan kembali.</p>
            </div>
        </div>
      );
  }

  const renderContent = () => {
    switch(gameState) {
      case 'question_intro':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-accent text-center animate-pop">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
                <h2 className="text-xl font-bold mb-2 text-primary">Bersiaplah!</h2>
                <p className="text-lg">Soal berikutnya akan segera dimulai...</p>
                <div className="mt-6 flex justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary"/>
                </div>
            </div>
          </div>
        );
      
      case 'running':
        const options = [
          { key: 'a', color: 'bg-red-500 border-red-600', activeColor: 'bg-red-600 ring-4 ring-red-300', symbol: 'A' },
          { key: 'b', color: 'bg-blue-500 border-blue-600', activeColor: 'bg-blue-600 ring-4 ring-blue-300', symbol: 'B' },
          { key: 'c', color: 'bg-yellow-500 border-yellow-600', activeColor: 'bg-yellow-600 ring-4 ring-yellow-300', symbol: 'C' },
          { key: 'd', color: 'bg-green-500 border-green-600', activeColor: 'bg-green-600 ring-4 ring-green-300', symbol: 'D' },
        ];

        return (
          <div className="flex-1 flex flex-col p-4 bg-slate-50">
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-4 flex justify-between items-center">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Skor Kamu</p>
                    <p className="text-xl font-black text-primary">{totalScore}</p>
                </div>
                {hasAnswered ? (
                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        <CheckCircle className="w-5 h-5" />
                        <span>Terjawab</span>
                    </div>
                ) : (
                    <div className={`text-sm font-bold px-3 py-1 rounded-full border transition-all ${
                        requiredAnswersCount > 1 
                        ? 'text-primary bg-primary/10 border-primary/20 animate-pulse' 
                        : 'text-slate-500 bg-slate-100 border-slate-200'
                    }`}>
                        Pilih {requiredAnswersCount} Jawaban
                    </div>
                )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-fr">
              {options.map((opt) => {
                const isSelected = selectedAnswers.includes(opt.key);
                // If answered (submitted), show simplified state. If not, show selection state.
                const opacityClass = hasAnswered && !isSelected ? 'opacity-50 grayscale' : 'opacity-100';
                const shadowClass = isSelected ? 'shadow-none translate-y-1' : 'shadow-[0_6px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1';
                const borderClass = isSelected ? opt.activeColor : opt.color;

                return (
                  <button
                    key={opt.key}
                    disabled={hasAnswered}
                    onClick={() => handleAnswer(opt.key as any)}
                    className={`
                      ${borderClass} text-white rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-100
                      ${opacityClass} ${shadowClass} relative
                    `}
                  >
                    {isSelected && (
                        <div className="absolute top-2 right-2 bg-white text-primary rounded-full p-1 shadow-sm">
                            <Check className="w-4 h-4" strokeWidth={4} />
                        </div>
                    )}
                    <span className="font-black text-6xl sm:text-7xl drop-shadow-lg">{opt.symbol}</span>
                  </button>
                );
              })}
            </div>
            
            {hasAnswered && (
                <div className="mt-4 text-center text-slate-500 font-medium animate-pulse">
                    Menunggu hasil...
                </div>
            )}
          </div>
        );

      case 'question_result':
        if (!lastAnswerResult) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
        
        // Determine Visual State based on Score Awarded
        let resultTitle = "";
        let resultColor = "";
        let borderColor = "";
        let icon = null;
        let scoreText = "";
        let scoreColorClass = "";

        if (lastAnswerResult.isCorrect) {
             resultTitle = "Sempurna!";
             resultColor = "text-green-600";
             borderColor = "border-green-400";
             icon = <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-12 h-12 text-green-600" /></div>;
        } else if (lastAnswerResult.scoreAwarded > 0) {
             resultTitle = "Cukup Baik!";
             resultColor = "text-yellow-600";
             borderColor = "border-yellow-400";
             icon = <div className="bg-yellow-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-12 h-12 text-yellow-600" /></div>;
        } else if (lastAnswerResult.scoreAwarded < 0) {
             resultTitle = "Salah!";
             resultColor = "text-red-600";
             borderColor = "border-red-400";
             icon = <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><XCircle className="w-12 h-12 text-red-600" /></div>;
        } else {
             // Score is 0
             resultTitle = "Tidak Menjawab";
             resultColor = "text-slate-500";
             borderColor = "border-slate-300";
             icon = <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-12 h-12 text-slate-500" /></div>;
        }

        // Format Score Text
        if (lastAnswerResult.scoreAwarded > 0) {
            scoreText = `+ ${lastAnswerResult.scoreAwarded} Poin`;
            scoreColorClass = "text-green-600";
        } else if (lastAnswerResult.scoreAwarded < 0) {
            scoreText = `- ${Math.abs(lastAnswerResult.scoreAwarded)} Poin`;
            scoreColorClass = "text-red-600";
        } else {
            scoreText = `+ 0 Poin`;
            scoreColorClass = "text-slate-500";
        }

        return (
          <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${lastAnswerResult.scoreAwarded > 0 ? 'bg-green-50' : (lastAnswerResult.scoreAwarded < 0 ? 'bg-red-50' : 'bg-slate-50')}`}>
            <div className={`bg-white p-8 rounded-3xl shadow-2xl border-4 ${borderColor} max-w-sm w-full animate-pop`}>
                {icon}
                <h1 className={`text-3xl font-black ${resultColor} mb-2`}>{resultTitle}</h1>
                <p className={`text-2xl font-black mb-1 ${scoreColorClass}`}>{scoreText}</p>
                {lastAnswerResult.speedBonus > 0 && (
                    <div className="flex items-center justify-center gap-1 text-yellow-600 font-bold mb-6 text-sm bg-yellow-50 py-1 px-3 rounded-full border border-yellow-200">
                        <Zap className="w-4 h-4" fill="currentColor"/>
                        <span>+ {lastAnswerResult.speedBonus} Bonus Cepat</span>
                    </div>
                )}
                
                {lastAnswerResult.totalNeeded > 1 && (
                    <div className="bg-slate-50 rounded-lg p-2 mb-6 border border-slate-200 inline-block px-4">
                        <span className="text-slate-600 text-sm font-semibold">
                            Menjawab {lastAnswerResult.correctCount} dari {lastAnswerResult.totalNeeded} benar
                        </span>
                    </div>
                )}
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Peringkat Saat Ini</p>
                    <p className="text-3xl font-black text-accent">#{lastAnswerResult.currentRank}</p>
                </div>
            </div>
            
             <p className="mt-8 text-slate-500 font-medium animate-pulse">Menunggu soal berikutnya...</p>
          </div>
        );

      case 'podium':
      case 'finished':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
             <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full animate-pop">
                <Award className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-accent mb-2">Kuis Selesai!</h1>
                <p className="text-slate-500 mb-6">Terima kasih sudah bermain.</p>
                
                <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                    <p className="text-sm text-primary font-bold uppercase tracking-wider mb-2">Skor Akhir Kamu</p>
                    <p className="text-5xl font-black text-primary-dark">{totalScore}</p>
                </div>
                
                <Button onClick={() => navigate('/')} variant="secondary" fullWidth className="mt-8">
                    Kembali ke Beranda
                </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
             <div className="text-center animate-pulse">
                <img src={player?.avatar} alt="avatar" className="w-24 h-24 rounded-full mx-auto mb-4 bg-slate-200 border-4 border-white shadow-lg"/>
                <h2 className="text-xl font-bold text-accent">Halo, {player?.nama}!</h2>
                <p className="text-slate-500">Anda sudah bergabung.</p>
                <div className="mt-8 flex items-center justify-center gap-2 text-primary font-semibold bg-white px-4 py-2 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menunggu host memulai game...</span>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {renderContent()}
    </div>
  );
};

export default GamePlayer;