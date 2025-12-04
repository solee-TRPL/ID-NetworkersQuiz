import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Room, Player } from '../types';
import { Button } from '../components/Button';
import { X, Loader2, Calendar, ChevronLeft, Users, Trophy, Download, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string | null;
  quizTitle: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, quizId, quizTitle }) => {
  const [sessions, setSessions] = useState<Room[]>([]);
  const [selectedSession, setSelectedSession] = useState<Room | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'sessions' | 'leaderboard'>('sessions');
  const [exportingSessionId, setExportingSessionId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && quizId) {
      setView('sessions');
      setSelectedSession(null);
      setLeaderboard([]);
      setLoading(true);

      const fetchSessions = async () => {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('quiz_id', quizId)
            .eq('status', 'finished')
            .order('created_at', { ascending: false });

          if (error) throw error;
          setSessions(data || []);
        } catch (error) {
          console.error("Error fetching game sessions:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchSessions();
    }
  }, [isOpen, quizId]);

  const exportToCSV = (leaderboardData: Player[], sessionDate: string) => {
    if (leaderboardData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
  
    const headers = ['Peringkat', 'Nama Pemain', 'Skor'];
    const rows = leaderboardData.map((player, index) => [
      index + 1,
      `"${player.nama.replace(/"/g, '""')}"`, // Handle names with quotes
      player.skor
    ]);
  
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      
      const safeTitle = quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeDate = new Date(sessionDate).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      link.setAttribute("download", `Riwayat_${safeTitle}_${safeDate}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleQuickExport = async (e: React.MouseEvent, session: Room) => {
    e.stopPropagation();
    setExportingSessionId(session.id);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', session.id)
        .order('skor', { ascending: false });
      if (error) throw error;
      exportToCSV(data || [], session.created_at);
    } catch (err) {
      console.error("Quick export failed:", err);
      alert("Gagal mengekspor data.");
    } finally {
      setExportingSessionId(null);
    }
  };

  const handleSessionClick = async (session: Room) => {
    setSelectedSession(session);
    setLoading(true);
    setView('leaderboard');
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', session.id)
        .order('skor', { ascending: false });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteHistory = async () => {
    if (!quizId) return;
    setIsDeletingHistory(true);
    try {
        const { error } = await supabase
            .from('rooms')
            .delete()
            .eq('quiz_id', quizId)
            .eq('status', 'finished');
        
        if (error) throw error;
        
        setSessions([]); // Clear sessions from UI
    } catch (err: any) {
        console.error("Error deleting history:", err);
        alert("Gagal menghapus riwayat: " + err.message);
    } finally {
        setIsDeletingHistory(false);
        setIsDeleteConfirmOpen(false);
    }
  };

  const renderSessionList = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-accent truncate">{quizTitle}</h2>
            <p className="text-sm text-slate-500 -mt-1">Riwayat Permainan</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sessions.length > 0 && !loading && (
              <button 
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="p-2 rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"
                  title="Hapus semua riwayat"
              >
                  <Trash2 className="w-5 h-5" />
              </button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-primary transition-colors p-1 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar -mx-6 px-6">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold">Belum Ada Riwayat</p>
            <p className="text-sm">Mainkan kuis ini untuk melihat riwayatnya di sini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="w-full text-left bg-slate-100 rounded-lg flex items-center justify-between">
                <button onClick={() => handleSessionClick(session)} className="flex-1 text-left p-3 group">
                  <div>
                    <p className="font-semibold text-accent group-hover:text-primary transition-colors">{new Date(session.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm text-slate-500">{new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </button>
                <button onClick={(e) => handleQuickExport(e, session)} className="p-2 rounded-full hover:bg-slate-200 transition-colors mr-2" title="Export ke CSV" disabled={exportingSessionId === session.id}>
                  {exportingSessionId === session.id ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Download className="w-5 h-5 text-slate-500" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderLeaderboard = () => (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => setView('sessions')} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeft /></button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-accent truncate">Papan Skor</h2>
            <p className="text-sm text-slate-500 -mt-1 truncate">{selectedSession ? new Date(selectedSession.created_at).toLocaleString('id-ID', {day: 'numeric', month:'long', year:'numeric'}) : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="secondary" 
            className="!p-2.5"
            onClick={() => exportToCSV(leaderboard, selectedSession!.created_at)} 
            disabled={loading || leaderboard.length === 0}
            title="Export ke CSV"
          >
              <Download className="w-5 h-5"/>
          </Button>
        </div>
      </div>
      
      <div className="mt-4 flex-1 overflow-y-auto hide-scrollbar -mx-6 px-6">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold">Tidak Ada Pemain</p>
            <p className="text-sm">Sesi ini tidak memiliki data pemain.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div key={player.id} className={`flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-slate-600 w-8 text-center text-lg`}>
                    {index === 0 ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto" /> : index + 1}
                  </span>
                  <img src={player.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-slate-300"/>
                  <span className="font-semibold text-accent">{player.nama}</span>
                </div>
                <span className="font-extrabold text-lg text-primary-dark">{player.skor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-pop flex flex-col h-[600px] max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {view === 'sessions' ? renderSessionList() : renderLeaderboard()}
        </div>
      </div>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteHistory}
        title="Hapus Seluruh Riwayat"
        message={`Apakah Anda yakin ingin menghapus SELURUH riwayat permainan untuk kuis "${quizTitle}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Semua"
        isConfirming={isDeletingHistory}
      />
    </>
  );
};