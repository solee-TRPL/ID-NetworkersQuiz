import React, { useState } from 'react';
import { Player } from '../types';
import { Button } from '../components/Button';
import { X, Users, Trash2, UserX } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface PlayerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onKickPlayer: (playerId: string) => void;
}

export const PlayerManagementModal: React.FC<PlayerManagementModalProps> = ({
  isOpen,
  onClose,
  players,
  onKickPlayer,
}) => {
  const [playerToKick, setPlayerToKick] = useState<Player | null>(null);

  const handleConfirmKick = () => {
    if (playerToKick) {
      onKickPlayer(playerToKick.id);
      setPlayerToKick(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-pop flex flex-col h-[500px] max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-accent flex items-center gap-2">
              <Users />
              Kelola Pemain ({players.length})
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-primary transition-colors p-1 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar -mx-6 px-6">
            {players.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center">
                <UserX className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-bold">Tidak Ada Pemain</p>
                <p className="text-sm">Tidak ada pemain di dalam room ini.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.sort((a, b) => a.nama.localeCompare(b.nama)).map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={player.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-slate-300 flex-shrink-0"/>
                      <span className="font-semibold text-accent truncate">{player.nama}</span>
                    </div>
                    <Button 
                      variant="secondary"
                      className="!p-2 hover:bg-red-500/10 hover:text-red-500 flex-shrink-0"
                      onClick={() => setPlayerToKick(player)}
                      title={`Keluarkan ${player.nama}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={!!playerToKick}
        onClose={() => setPlayerToKick(null)}
        onConfirm={handleConfirmKick}
        title={`Keluarkan Pemain`}
        message={`Apakah Anda yakin ingin mengeluarkan "${playerToKick?.nama}" dari permainan? Mereka tidak akan bisa bergabung kembali.`}
        confirmText="Ya, Keluarkan"
      />
    </>
  );
};