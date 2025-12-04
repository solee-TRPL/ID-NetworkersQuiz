import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { RoomStatus } from '../types';
import { Loader2, Pencil } from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';
import { AvatarSelectionModal } from '../components/AvatarSelectionModal';

const PlayerLobby: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  
  const [gameCode, setGameCode] = useState(code || '');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const generateInitialAvatar = async () => {
      // Use random eyes and mouth from our standard set
      const eyesList = ['closed', 'cute', 'love', 'wink'];
      const mouthList = ['cute', 'lilSmile', 'smileLol', 'wideSmile'];
      
      const randomEyes = eyesList[Math.floor(Math.random() * eyesList.length)];
      const randomMouth = mouthList[Math.floor(Math.random() * mouthList.length)];

      const avatar = createAvatar(funEmoji, {
        seed: 'ID-Networkers', // Same seed as modal for consistent shape
        // @ts-ignore
        eyes: [randomEyes],
        // @ts-ignore
        mouth: [randomMouth],
        backgroundColor: [],
        shapeColor: ['e33849']
      });
      const dataUri = await avatar.toDataUri();
      setSelectedAvatar(dataUri);
    };
    generateInitialAvatar();
  }, []);

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nama panggilan harus diisi.');
      return;
    }
    if (!gameCode.trim()) {
        setError('Kode game harus diisi.');
        return;
    }
    if (!selectedAvatar) {
        setError('Avatar sedang dimuat, harap tunggu.');
        return;
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('kode_room', gameCode)
      .maybeSingle();

    if (roomError || !room) {
      setError('Kode game tidak ditemukan.');
      return;
    }

    if (room.status !== 'waiting') {
      setError('Game sudah berjalan atau selesai.');
      return;
    }

    const { data: player, error: joinError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        nama: name,
        avatar: selectedAvatar,
        skor: 0
      })
      .select()
      .single();

    if (joinError) {
        if(joinError.code === '23505') setError('Nama sudah dipakai di room ini.');
        else setError('Gagal bergabung: ' + joinError.message);
    } else if (player) {
      setRoomId(room.id);
      setPlayerId(player.id);
      setJoined(true);
    }
  };

  useEffect(() => {
    if (!joined || !roomId) return;

    const channel = supabase
      .channel(`room-status-updates-for-${roomId}`)
      .on('postgres_changes', 
          { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'rooms', 
              filter: `id=eq.${roomId}` 
          },
          (payload) => {
              const newStatus = payload.new.status as RoomStatus;
              if (newStatus !== 'waiting' && playerId) {
                  navigate(`/game/${playerId}`);
              }
          }
      )
      .on('postgres_changes', 
          { 
              event: 'DELETE', 
              schema: 'public', 
              table: 'rooms', 
              filter: `id=eq.${roomId}` 
          },
          () => {
              navigate('/');
          }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
    }
  }, [joined, roomId, playerId, navigate]);

  if (joined) {
    return (
      <div className="flex-1 bg-background flex flex-col items-center justify-center p-6 text-accent text-center">
        <div className="animate-pop flex flex-col items-center">
          <img src={selectedAvatar} alt="me" className="w-32 h-32 rounded-full border-4 border-primary shadow-lg mb-6 bg-primary/10" />
          <h1 className="text-3xl font-extrabold mb-2">Kamu berhasil masuk!</h1>
          <p className="text-primary-dark text-lg animate-pulse">Menunggu host memulai permainan...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-50">
        <form onSubmit={joinGame} className="w-full max-w-md bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 animate-pop">
          <h1 className="text-2xl font-extrabold text-accent text-center">Gabung Game</h1>
          
          {error && <div className="text-red-700 text-center text-sm font-bold bg-red-100 p-3 rounded-lg">{error}</div>}
          
          <div className="space-y-3">
            <label className="text-slate-600 font-semibold text-sm ml-1 mb-2 block text-center">Pilih Avatarmu</label>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="relative group rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {selectedAvatar ? (
                    <img
                      src={selectedAvatar}
                      alt="avatar"
                      className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                  <Pencil className="w-8 h-8 text-white" />
                </div>
              </button>
            </div>
          </div>

          <Input
            placeholder="PIN GAME"
            value={gameCode}
            onChange={e => setGameCode(e.target.value.replace(/[^0-9]/g, ''))}
            className="text-center text-xl font-bold tracking-[0.3em]"
            maxLength={6}
            required
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <Input 
            placeholder="Nama Panggilan" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-center text-lg font-bold"
            maxLength={12}
            required
          />
          <Button type="submit" fullWidth className="!py-3 text-base">Gabung Sekarang</Button>
        </form>
      </div>
      <AvatarSelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectAvatar={(avatarUri) => {
          setSelectedAvatar(avatarUri);
          setIsModalOpen(false);
        }}
      />
    </>
  );
};

export default PlayerLobby;
