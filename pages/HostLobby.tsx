import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../services/supabaseClient';
import { Room, Player } from '../types';
import { Button } from '../components/Button';
import { Users, Copy, Play, Loader2, AlertTriangle, Check, MoreHorizontal } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

const HostLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  // State for kicking players
  const [playerToKick, setPlayerToKick] = useState<Player | null>(null);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);


  useEffect(() => {
    if (!roomId) {
      navigate('/host/dashboard');
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch initial data for the lobby
    const loadLobbyData = async () => {
      try {
        // Fetch room info and quiz title in one go
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*, quiz:quizzes(judul)')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) throw roomError || new Error('Room not found');
        
        setRoom(roomData);
        // @ts-ignore
        setQuizTitle(roomData.quiz?.judul || 'Kuis');

        // Fetch the list of players already in the room
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId);
        
        if (playersError) throw playersError;

        setPlayers(playersData || []);
      } catch (err: any) {
        console.error("Failed to load lobby data:", err);
        setError("Tidak dapat memuat lobi. Mungkin room tidak valid.");
      } finally {
        setLoading(false);
      }
    };

    loadLobbyData();

    // Set up realtime subscription for players joining or leaving
    const playerSubscription = supabase
      .channel(`lobby-players-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPlayer = payload.new as Player;
            setPlayers(prevPlayers => 
              prevPlayers.find(p => p.id === newPlayer.id) ? prevPlayers : [...prevPlayers, newPlayer]
            );
          } else if (payload.eventType === 'DELETE') {
            const oldPlayerId = payload.old.id;
            setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== oldPlayerId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerSubscription);
    };
  }, [roomId, navigate]);

  const startGame = async () => {
    if (!roomId) return;
    
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'question_intro' })
      .eq('id', roomId);

    if (!error) {
      navigate(`/host/game/${roomId}`);
    } else {
      setError('Gagal memulai kuis: ' + error.message);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/#/play/${room?.kode_room}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const openKickConfirmation = (player: Player) => {
    setPlayerToKick(player);
    setIsKickConfirmOpen(true);
  };
  
  const handleConfirmKick = async () => {
    if (!playerToKick) return;
  
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerToKick.id);
  
    if (error) {
      alert(`Gagal mengeluarkan pemain: ${error.message}`);
    } else {
      // Optimistic update for faster UI response
      setPlayers(prev => prev.filter(p => p.id !== playerToKick.id));
    }
    
    setIsKickConfirmOpen(false);
    setPlayerToKick(null);
  };
  
  if (loading) return <div className="flex-1 p-10 text-center flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
  if (error || !room) return (
    <div className="flex-1 p-10 text-center flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-500 font-bold">{error || "Room tidak ditemukan."}</p>
        <Button onClick={() => navigate('/host/dashboard')}>Kembali ke Dashboard</Button>
    </div>
  );

  const joinUrl = `${window.location.origin}/#/play/${room.kode_room}`;

  return (
    <>
      <div className="flex-1 flex flex-col p-4 sm:p-6 bg-slate-50">
        <div className="w-full h-full max-w-6xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden hide-scrollbar">
          
          {/* Left: Info & QR */}
          <div className="bg-slate-100 p-6 md:p-8 lg:w-[350px] flex flex-col items-center justify-center text-center gap-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div>
              <h2 className="text-base font-medium mb-2 text-primary">PIN Game</h2>
              <div className="text-5xl lg:text-6xl font-black tracking-[0.2em] text-accent p-4 bg-slate-200 rounded-xl border border-slate-300">{room.kode_room}</div>
            </div>
            
            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
              <QRCodeSVG value={joinUrl} size={160} bgColor="#ffffff" fgColor="#001529" />
            </div>
            
            <div className="space-y-3 w-full max-w-xs">
              <p className="text-xs text-primary">Atau bagikan link ini:</p>
              <Button variant="secondary" onClick={copyLink} className="w-full">
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 inline" /> Link Disalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2 inline" /> Salin Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right: Player List */}
          <div className="p-6 md:p-8 flex flex-col flex-1">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-200 pb-6">
              <div className="w-full sm:w-auto">
                <h1 className="text-xl md:text-2xl font-bold text-accent truncate">{quizTitle}</h1>
                <p className="text-primary flex items-center gap-2 mt-1">
                  <Users className="w-5 h-5" /> 
                  <span className="font-bold text-lg">{players.length}</span> Pemain Menunggu
                </p>
              </div>
              <Button onClick={startGame} disabled={players.length === 0} className="px-6 !py-3 text-base w-full sm:w-auto font-bold">
                Mulai <Play className="w-5 h-5 ml-2 inline" />
              </Button>
            </header>
            
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            <main className="flex-1 overflow-y-auto min-h-[200px] md:min-h-[300px] hide-scrollbar -mx-2 px-2">
              {players.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                  <Users className="w-12 h-12 opacity-50 mb-4" />
                  <h3 className="text-lg font-bold">Menunggu pemain bergabung...</h3>
                  <p className="text-sm">Bagikan PIN atau link invite agar pemain bisa masuk.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {players.map(player => (
                    <div key={player.id} className="bg-slate-100 p-3 rounded-lg text-center animate-pop border border-slate-200 relative group">
                       <button
                          onClick={() => openKickConfirmation(player)}
                          className="absolute top-1 right-1 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Keluarkan ${player.nama}`}
                      >
                          <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <img src={player.avatar} alt="avatar" className="w-16 h-16 rounded-full mx-auto mb-2 bg-slate-300/50 shadow-md"/>
                      <p className="font-bold text-accent truncate text-sm">{player.nama}</p>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      <ConfirmationModal
          isOpen={isKickConfirmOpen}
          onClose={() => setIsKickConfirmOpen(false)}
          onConfirm={handleConfirmKick}
          title="Keluarkan Pemain"
          message={`Apakah Anda yakin ingin mengeluarkan "${playerToKick?.nama}" dari lobi?`}
          confirmText="Ya, Keluarkan"
      />
    </>
  );
};

export default HostLobby;