import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Quiz, TingkatKesulitan, QuizCategory } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Play, LogOut, Loader2, AlertTriangle, Trash2, Pencil, HelpCircle, MoreHorizontal, Folder, Search, Filter, X } from 'lucide-react';
import { playSound } from '../services/audioService';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { HistoryModal } from './HistoryModal';

type DashboardQuiz = Omit<Quiz, 'questions'> & {
  questions: { count: number }[];
  quiz_categories: { nama: string } | null;
};

const HostDashboard: React.FC = () => {
  const [quizzes, setQuizzes] = useState<DashboardQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyQuizId, setHistoryQuizId] = useState<string | null>(null);

  // States for Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);
  
  // States for adding a new category from dashboard
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);


  useEffect(() => {
    const fetchQuizzesAndEnsureProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated.");
        }

        const { data: hostData, error: hostError } = await supabase
          .from('hosts')
          .select('id')
          .eq('id', user.id)
          .single();

        if (hostError && hostError.code !== 'PGRST116') {
          throw hostError;
        }

        if (!hostData) {
          const { error: insertError } = await supabase
            .from('hosts')
            .insert({ id: user.id, email: user.email });

          if (insertError) {
            throw new Error(`Failed to create host profile: ${insertError.message}`);
          }
        }
        
        const quizzesPromise = supabase
          .from('quizzes')
          .select('*, questions(count), quiz_categories(nama)')
          .eq('host_id', user.id)
          .order('created_at', { ascending: false });
        
        const categoriesPromise = supabase
          .from('quiz_categories')
          .select('*')
          .eq('host_id', user.id)
          .order('nama');

        const [{data: quizzesData, error: quizzesError}, {data: categoriesData, error: catError}] = await Promise.all([quizzesPromise, categoriesPromise]);

        if (quizzesError) throw quizzesError;
        if (catError) throw catError;
        
        if (quizzesData) setQuizzes(quizzesData as any);
        if (categoriesData) setCategories(categoriesData);

      } catch (err: any) {
        console.error("Dashboard Load Error:", err);
        setError("Gagal memuat dashboard. Error: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizzesAndEnsureProfile();
  }, []);
  
  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
            setIsFilterOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const displayedQuizzes = useMemo(() => {
    return quizzes
      .filter(quiz => {
        if (!selectedCategoryId) return true;
        return quiz.category_id === selectedCategoryId;
      })
      .filter(quiz => {
        if (!searchTerm.trim()) return true;
        return quiz.judul.toLowerCase().includes(searchTerm.trim().toLowerCase());
      });
  }, [quizzes, searchTerm, selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.nama.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );
  }, [categories, categorySearchTerm]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  
  const handleAddNewCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
        alert('Nama kategori tidak boleh kosong.');
        return;
    }
    if (categories.some(c => c.nama.toLowerCase() === trimmedName.toLowerCase())) {
        alert('Kategori dengan nama ini sudah ada.');
        return;
    }

    setIsSavingCategory(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSavingCategory(false);
        alert('Sesi habis, silakan login ulang.');
        return;
    }

    const { data: newCategory, error } = await supabase
        .from('quiz_categories')
        .insert({ host_id: user.id, nama: trimmedName })
        .select()
        .single();

    setIsSavingCategory(false);
    if (error) {
        alert('Gagal menyimpan kategori baru: ' + error.message);
    } else if (newCategory) {
        setCategories(prev => [...prev, newCategory].sort((a, b) => a.nama.localeCompare(b.nama)));
        setSelectedCategoryId(newCategory.id);
        setNewCategoryName('');
        setIsAddCategoryModalOpen(false);
    }
  };

  const createRoom = async (quizId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const roomCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        quiz_id: quizId,
        host_id: user.id,
        kode_room: roomCode,
        status: 'waiting',
        current_question_index: 0
      })
      .select()
      .single();

    if (error) {
      alert('Gagal membuat room: ' + error.message);
    } else if (data) {
      navigate(`/host/lobby/${data.id}`);
    }
  };

  const openDeleteConfirmation = (quizId: string) => {
    setQuizToDeleteId(quizId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quizToDeleteId) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizToDeleteId);

    setIsDeleting(false);
    setIsDeleteModalOpen(false);

    if (error) {
      alert("Gagal menghapus kuis: " + error.message);
    } else {
      setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizToDeleteId));
      setQuizToDeleteId(null);
    }
  };

  const openHistoryModal = (quizId: string) => {
    setHistoryQuizId(quizId);
    setIsHistoryModalOpen(true);
  };

  const difficultyStyles: Record<TingkatKesulitan, string> = {
    mudah: 'bg-green-100 text-green-800 border border-green-200',
    sedang: 'bg-blue-100 text-blue-800 border border-blue-200',
    sulit: 'bg-primary/10 text-primary-dark border border-primary/20',
  };

  const quizForHistory = quizzes.find(q => q.id === historyQuizId);
  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.nama;

  return (
    <>
      <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 sm:p-6 w-full">
        <header className="flex flex-row justify-between items-center gap-4 mb-6">
          {/* FIX: Replaced missing PNG with existing SVG logo */}
          <img src="assets/images/Logo-Text-Merah.png" alt="ID-Networkers Logo" className="h-12" />
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2 inline" /> Logout
          </Button>
        </header>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <Input 
              placeholder="Cari nama kuis..."
              className="pl-10 !py-3"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
              <div className="relative" ref={filterRef}>
                  <Button variant="secondary" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                      <Filter className="w-4 h-4 mr-2 inline" /> Kategori
                  </Button>
                  {isFilterOpen && (
                      <div className="absolute top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-20 right-0 animate-pop">
                          <Input 
                              placeholder="Cari kategori..."
                              className="text-sm"
                              value={categorySearchTerm}
                              onChange={e => setCategorySearchTerm(e.target.value)}
                          />
                          <ul className="mt-2 max-h-48 overflow-y-auto hide-scrollbar text-sm">
                              <li
                                  className="p-2 rounded cursor-pointer hover:bg-slate-100 flex items-center gap-2 text-primary font-semibold border-b border-slate-200 mb-1"
                                  onClick={() => { setIsAddCategoryModalOpen(true); setIsFilterOpen(false); }}
                              >
                                  <Plus className="w-4 h-4"/> Tambah Kategori Baru
                              </li>
                              <li 
                                  className={`p-2 rounded cursor-pointer hover:bg-slate-100 ${!selectedCategoryId ? 'bg-primary/10 font-bold text-primary' : ''}`}
                                  onClick={() => { setSelectedCategoryId(null); setIsFilterOpen(false); }}
                              >
                                  Semua Kategori
                              </li>
                              {filteredCategories.map(cat => (
                                  <li 
                                      key={cat.id} 
                                      className={`p-2 rounded cursor-pointer hover:bg-slate-100 ${selectedCategoryId === cat.id ? 'bg-primary/10 font-bold text-primary' : ''}`}
                                      onClick={() => { setSelectedCategoryId(cat.id); setIsFilterOpen(false); }}
                                  >
                                      {cat.nama}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
              {selectedCategoryId && (
                  <div className="bg-primary/10 text-primary font-bold text-sm px-3 py-2 rounded-lg flex items-center gap-2 animate-pop">
                      <span>{selectedCategoryName}</span>
                      <button onClick={() => setSelectedCategoryId(null)} className="p-0.5 rounded-full hover:bg-primary/20"><X className="w-4 h-4"/></button>
                  </div>
              )}
          </div>
        </div>


        {error && (
          <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg mb-6 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 mt-1"/>
            <div>
              <p className="font-bold">Terjadi Kesalahan</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto hide-scrollbar -mx-2 px-2 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/host/create" className="group" onClick={() => playSound('click')}>
              <div className="h-full min-h-[180px] sm:min-h-[200px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-primary transition-all duration-300 cursor-pointer">
                <div className="border-2 border-dashed border-slate-400 group-hover:border-primary/80 group-hover:scale-110 p-3 rounded-full mb-3 transition-transform">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="font-bold text-lg">Buat Kuis Baru</p>
              </div>
            </Link>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 flex flex-col animate-pulse border border-slate-200">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="flex-1 space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-10 bg-slate-200 rounded-lg mt-6"></div>
                </div>
              ))
            ) : (
              displayedQuizzes.map(quiz => (
                <div key={quiz.id} className="bg-white rounded-2xl p-5 flex flex-col border border-slate-200 shadow-md group hover:border-primary transition-all duration-300 hover:shadow-xl relative animate-pop">
                  <Button onClick={() => openHistoryModal(quiz.id)} variant="secondary" className="!p-2.5 absolute top-4 right-4 z-10 hover:bg-slate-200">
                      <MoreHorizontal className="w-4 h-4"/>
                  </Button>
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-accent truncate mb-3 pr-12" title={quiz.judul}>{quiz.judul}</h3>
                    
                    <div className="flex flex-col items-start gap-3 text-sm text-slate-500 mb-6">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        <span>{quiz.questions[0]?.count || 0} Soal</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                          <span className={`capitalize px-2 py-0.5 rounded-md ${difficultyStyles[quiz.tingkat_kesulitan]}`}>
                              {quiz.tingkat_kesulitan}
                          </span>
                          {quiz.quiz_categories && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                                  <Folder className="w-3 h-3"/>
                                  {quiz.quiz_categories.nama}
                              </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-auto">
                    <Button onClick={() => createRoom(quiz.id)} className="flex-1">
                      <Play className="w-4 h-4 mr-2 inline"/> Mulai
                    </Button>
                    <Button onClick={() => navigate(`/host/edit/${quiz.id}`)} variant="secondary" className="!p-2.5">
                       <Pencil className="w-4 h-4"/>
                    </Button>
                    <Button onClick={() => openDeleteConfirmation(quiz.id)} variant="secondary" className="!p-2.5 hover:bg-primary/10 hover:text-primary">
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
              ))
            )}

            {!loading && displayedQuizzes.length === 0 && !error && (
              <div className="md:col-span-2 lg:col-span-3 text-center py-20 text-slate-500">
                <h3 className="text-xl font-bold mb-2">
                  {searchTerm || selectedCategoryId ? "Tidak ada kuis yang cocok" : "Anda belum punya kuis!"}
                </h3>
                <p className="text-sm">
                  {searchTerm || selectedCategoryId ? "Coba kata kunci atau filter yang berbeda." : "Jangan khawatir, membuatnya sangat mudah. Klik 'Buat Kuis Baru' untuk memulai."}
                </p>
              </div>
            )}
          </div>
        </div>
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Hapus Kuis"
          message="Apakah Anda yakin ingin menghapus kuis ini? Semua soal di dalamnya juga akan terhapus secara permanen. Tindakan ini tidak dapat dibatalkan."
          confirmText="Ya, Hapus"
          isConfirming={isDeleting}
        />
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          quizId={historyQuizId}
          quizTitle={quizForHistory?.judul || 'Riwayat Kuis'}
        />
      </div>
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsAddCategoryModalOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-pop" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-accent mb-4">Tambah Kategori Baru</h2>
            <Input 
              placeholder="Nama Kategori"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setIsAddCategoryModalOpen(false)}>Batal</Button>
              <Button onClick={handleAddNewCategory} disabled={isSavingCategory}>
                {isSavingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HostDashboard;