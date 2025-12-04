import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TingkatKesulitan, QuizCategory } from '../types';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Check, Upload, FileDown, AlertCircle, Folder } from 'lucide-react';
import { playSound } from '../services/audioService';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface QuestionDraft {
  teks_soal: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  jawaban_benar: string;
  timer_detik: number;
}

const CreateQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  
  const defaultQuestion: QuestionDraft = { teks_soal: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', jawaban_benar: 'a', timer_detik: 20 };

  const [title, setTitle] = useState('');
  const [tingkatKesulitan, setTingkatKesulitan] = useState<TingkatKesulitan>('sedang');
  const [questions, setQuestions] = useState<QuestionDraft[]>([defaultQuestion]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!quizId;
  
  // State for categories
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  
  // State for unsaved changes confirmation
  const [initialState, setInitialState] = useState<string>('');
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification("Sesi Habis", "Silakan login ulang.", 'danger');
        navigate('/login');
        return;
      }

      const categoriesPromise = supabase.from('quiz_categories').select('*').eq('host_id', user.id).order('nama');

      if (isEditing) {
        const quizPromise = supabase.from('quizzes').select('*, questions(*)').eq('id', quizId).single();
        const [{ data: quizData, error: quizError }, { data: categoriesData, error: catError }] = await Promise.all([quizPromise, categoriesPromise]);

        if (quizError || !quizData) {
          showNotification("Gagal Memuat", "Gagal memuat kuis untuk diedit.", 'danger');
          navigate('/host/dashboard');
          return;
        }
        if (catError) {
          showNotification("Gagal Memuat Kategori", catError.message, 'danger');
        }

        const mappedQuestions = quizData.questions && quizData.questions.length > 0
          ? quizData.questions.sort((a: any, b: any) => a.order_index - b.order_index).map((q: any) => ({
              teks_soal: q.teks_soal, opsi_a: q.opsi_a, opsi_b: q.opsi_b, opsi_c: q.opsi_c,
              opsi_d: q.opsi_d, jawaban_benar: q.jawaban_benar, timer_detik: q.timer_detik,
            }))
          : [defaultQuestion];
          
        setTitle(quizData.judul);
        setTingkatKesulitan(quizData.tingkat_kesulitan);
        setQuestions(mappedQuestions);
        setCategories(categoriesData || []);
        setSelectedCategoryId(quizData.category_id);

        setInitialState(JSON.stringify({
          title: quizData.judul, tingkatKesulitan: quizData.tingkat_kesulitan, questions: mappedQuestions, selectedCategoryId: quizData.category_id
        }));
      } else {
        const { data: categoriesData, error: catError } = await categoriesPromise;
        if (catError) {
          showNotification("Gagal Memuat Kategori", catError.message, 'danger');
        }
        setCategories(categoriesData || []);
        setInitialState(JSON.stringify({ title, tingkatKesulitan, questions, selectedCategoryId }));
      }
      setLoading(false);
    };
    fetchInitialData();
  }, [quizId, isEditing, navigate]);


  const isDirty = () => {
    const currentState = JSON.stringify({ title, tingkatKesulitan, questions, selectedCategoryId });
    return currentState !== initialState;
  };

  const handleBackNavigation = () => {
    if (isDirty()) {
      setIsExitConfirmOpen(true);
    } else {
      navigate('/host/dashboard');
    }
  };

  const handleSaveAndExit = async () => {
    setIsExitConfirmOpen(false);
    await saveQuiz();
  };

  const handleExitWithoutSaving = () => {
    setIsExitConfirmOpen(false);
    navigate('/host/dashboard');
  };

  const showNotification = (title: string, message: string, type: 'success' | 'danger') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const addQuestion = () => {
    setQuestions([...questions, defaultQuestion]);
     setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof QuestionDraft, value: any) => {
    const newQ = [...questions];
    newQ[index] = { ...newQ[index], [field]: value };
    setQuestions(newQ);
  };

  const toggleCorrectAnswer = (index: number, opt: string) => {
    const currentAnswers = questions[index].jawaban_benar.split(',').filter(x => x);
    const newAnswers = currentAnswers.includes(opt) ? currentAnswers.filter(x => x !== opt) : [...currentAnswers, opt];
    updateQuestion(index, 'jawaban_benar', newAnswers.sort().join(','));
  };
  
  const handleAddNewCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
        showNotification('Nama Kosong', 'Nama kategori tidak boleh kosong.', 'danger');
        return;
    }
    if (categories.some(c => c.nama.toLowerCase() === trimmedName.toLowerCase())) {
        showNotification('Duplikat', 'Kategori dengan nama ini sudah ada.', 'danger');
        return;
    }

    setIsSavingCategory(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSavingCategory(false);
        showNotification('Sesi Habis', 'Silakan login ulang.', 'danger');
        return;
    }

    const { data: newCategory, error } = await supabase
        .from('quiz_categories')
        .insert({ host_id: user.id, nama: trimmedName })
        .select()
        .single();

    setIsSavingCategory(false);
    if (error) {
        showNotification('Gagal', 'Gagal menyimpan kategori baru: ' + error.message, 'danger');
    } else if (newCategory) {
        setCategories(prev => [...prev, newCategory].sort((a, b) => a.nama.localeCompare(b.nama)));
        setSelectedCategoryId(newCategory.id);
        setNewCategoryName('');
        setIsAddingCategory(false);
        showNotification('Berhasil', 'Kategori baru berhasil ditambahkan.', 'success');
    }
  };


  const downloadTemplate = () => {
    const headers = ['Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Jawaban Benar (contoh: a atau a,c)', 'Waktu (detik)'];
    const exampleRow1 = ['Siapa presiden pertama indonesia?', 'Soekarno', 'Hatta', 'Suharto', 'Habibie', 'a', '20'];
    const exampleRow2 = ['Manakah yang termasuk buah warna merah? (2 Jawaban)', 'Apel', 'Pisang', 'Stroberi', 'Melon', 'a,c', '30'];
    const exampleRow3 = ['Pilih semua opsi yang benar (4 Jawaban)', 'Benar', 'Benar', 'Benar', 'Benar', 'a,b,c,d', '30'];
    
    const csvContent = [
        headers.join(';'),
        exampleRow1.join(';'),
        exampleRow2.join(';'),
        exampleRow3.join(';')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import_soal_idn.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVLine = (text: string, delimiter: string) => {
    const result = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        try {
            const lines = text.split(/\r\n|\n|\r/);
            const firstLine = lines[0] || '';
            const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
            const dataLines = lines.slice(1).filter(line => line.trim() !== '');
            const newQuestions: QuestionDraft[] = [];

            dataLines.forEach((line, idx) => {
                const cols = parseCSVLine(line, delimiter);
                if (cols.length >= 6) {
                    let answerRaw = cols[5]?.toLowerCase().replace(/["\s]/g, '') || 'a';
                    answerRaw = answerRaw.replace(/1/g, 'a').replace(/2/g, 'b').replace(/3/g, 'c').replace(/4/g, 'd');
                    const validChars = new Set(['a', 'b', 'c', 'd']);
                    const parts = answerRaw.split(/[,;]/).filter(p => validChars.has(p));
                    const finalAnswer = Array.from(new Set(parts)).sort().join(',') || 'a';

                    newQuestions.push({
                        teks_soal: cols[0]?.replace(/^"|"$/g, '').replace(/""/g, '"') || `Soal Impor #${idx+1}`,
                        opsi_a: cols[1]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
                        opsi_b: cols[2]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
                        opsi_c: cols[3]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
                        opsi_d: cols[4]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
                        jawaban_benar: finalAnswer,
                        timer_detik: parseInt(cols[6]) || 20
                    });
                }
            });

            if (newQuestions.length > 0) {
                setQuestions(prev => (prev.length === 1 && !prev[0].teks_soal) ? newQuestions : [...prev, ...newQuestions]);
                showNotification("Impor Berhasil", `Berhasil mengimpor ${newQuestions.length} soal!`, 'success');
            } else {
                showNotification("Data Tidak Valid", `Tidak ada data soal yang valid ditemukan dalam file. \nPastikan menggunakan format CSV dengan pemisah '${delimiter}'`, 'danger');
            }
        } catch (err) {
            console.error(err);
            showNotification("Error", "Gagal membaca file CSV. Pastikan formatnya benar.", 'danger');
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const saveQuiz = async () => {
    if (!title.trim()) {
        showNotification("Judul Kosong", "Judul kuis harus diisi sebelum menyimpan.", 'danger');
        return;
    }
    if (questions.some(q => !q.jawaban_benar)) {
        showNotification("Jawaban Kosong", `Setiap soal harus memiliki setidaknya satu jawaban benar.`, 'danger');
        return;
    }

    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showNotification("Sesi Habis", "Sesi habis, silakan login ulang.", 'danger');
        navigate('/login');
        setSaving(false);
        return;
    }

    const quizPayload = {
        judul: title,
        tingkat_kesulitan: tingkatKesulitan,
        category_id: selectedCategoryId,
    };

    const questionsPayload = questions.map((q, idx) => ({ ...q, order_index: idx }));

    if (isEditing) {
      const { error: quizUpdateError } = await supabase.from('quizzes').update(quizPayload).eq('id', quizId);
      if (quizUpdateError) {
        showNotification("Gagal", "Gagal memperbarui kuis: " + quizUpdateError.message, 'danger');
        setSaving(false); return;
      }
      
      const { error: deleteError } = await supabase.from('questions').delete().eq('quiz_id', quizId);
      if (deleteError) {
         showNotification("Gagal", "Gagal menghapus soal lama: " + deleteError.message, 'danger');
         setSaving(false); return;
      }

      const { error: insertError } = await supabase.from('questions').insert(questionsPayload.map(q => ({...q, quiz_id: quizId })));
      if (insertError) {
        showNotification("Gagal", "Gagal menyimpan soal baru: " + insertError.message, 'danger');
      } else {
        navigate('/host/dashboard');
      }

    } else {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({ ...quizPayload, host_id: user.id })
        .select()
        .single();

      if (quizError || !quizData) {
        showNotification("Gagal", "Gagal menyimpan kuis: " + (quizError?.message || "Error tidak diketahui."), 'danger');
        setSaving(false); return;
      }

      const { error: qError } = await supabase.from('questions').insert(questionsPayload.map(q => ({...q, quiz_id: quizData.id })));
      if (qError) {
        showNotification("Gagal", "Gagal menyimpan soal: " + qError.message, 'danger');
      } else {
        navigate('/host/dashboard');
      }
    }
    setSaving(false);
  };
  
  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <Button variant="secondary" className="mb-6 !px-3" onClick={handleBackNavigation}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
          </Button>

          <h1 className="text-3xl font-extrabold text-accent mb-6">{isEditing ? 'Edit Kuis' : 'Buat Kuis Baru'}</h1>
          
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-lg mb-6 space-y-6">
            <Input 
              label="Judul Kuis" 
              placeholder="Misal: Pengetahuan Umum Abad 21" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-lg font-bold"
            />
            <div>
              <label className="text-slate-600 font-semibold text-sm ml-1 mb-2 block">Tingkat Kesulitan</label>
              <div className="flex gap-2">
                {(['mudah', 'sedang', 'sulit'] as TingkatKesulitan[]).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => { playSound('click'); setTingkatKesulitan(level); }}
                    className={`capitalize px-4 py-1.5 rounded-full font-bold text-sm transition-all duration-200 ${
                      tingkatKesulitan === level ? 'bg-primary text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >{level}</button>
                ))}
              </div>
            </div>
             <div>
                <label className="text-slate-600 font-semibold text-sm ml-1 mb-2 block">Kategori</label>
                <div className="flex gap-2 items-start">
                    <div className="relative flex-1">
                        <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <select
                            value={selectedCategoryId || ''}
                            onChange={e => setSelectedCategoryId(e.target.value || null)}
                            className="w-full bg-slate-50 border border-slate-300 text-accent rounded-lg pl-10 pr-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all duration-200 appearance-none"
                        >
                            <option value="" disabled>-- Pilih Kategori --</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nama}</option>
                            ))}
                        </select>
                    </div>
                    <Button variant="secondary" onClick={() => setIsAddingCategory(true)} className="!p-2.5">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
                {isAddingCategory && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-pop">
                    <p className="text-sm font-semibold mb-2 text-accent">Tambah Kategori Baru</p>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Nama Kategori Baru"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={handleAddNewCategory} disabled={isSavingCategory}>
                            {isSavingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                        </Button>
                        <Button variant="secondary" onClick={() => setIsAddingCategory(false)}>Batal</Button>
                    </div>
                    </div>
                )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <FileDown className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-blue-900 text-sm">Import Soal dari Excel/CSV</h3>
                    <p className="text-xs text-blue-700">Masukkan banyak soal sekaligus dari file spreadsheet.</p>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={downloadTemplate} className="flex-1 sm:flex-none text-xs bg-white !py-2 h-auto" title="Download Template CSV">
                    Template
                </Button>
                <div className="relative flex-1 sm:flex-none">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50 !py-2 h-auto">
                        <Upload className="w-3 h-3 mr-2 inline" /> Upload CSV
                    </Button>
                </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {questions.map((q, index) => {
                const selectedAnswers = q.jawaban_benar ? q.jawaban_benar.split(',') : [];
                return (
              <div key={index} className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-lg relative animate-pop flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">Soal #{index + 1}</h3>
                  {questions.length > 1 && (
                    <button onClick={() => { playSound('click'); removeQuestion(index); }} className="text-slate-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <Input 
                    label="Teks Pertanyaan" 
                    placeholder="Siapakah penemu bola lampu?" 
                    value={q.teks_soal}
                    onChange={e => updateQuestion(index, 'teks_soal', e.target.value)}
                    className="!py-3 text-base"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                      <div 
                        key={opt} 
                        className={`relative rounded-lg transition-all p-0.5 cursor-pointer ring-2 ${selectedAnswers.includes(opt) ? 'ring-primary' : 'ring-transparent'}`}
                        onClick={() => { playSound('click'); toggleCorrectAnswer(index, opt); }}
                      >
                        <div className="flex items-center gap-3 p-1 bg-slate-100 rounded-md">
                          <div className={`w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center font-bold text-lg transition-colors ${selectedAnswers.includes(opt) ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                             {selectedAnswers.includes(opt) ? <Check /> : opt.toUpperCase()}
                          </div>
                          <Input 
                            placeholder={`Opsi ${opt.toUpperCase()}`}
                            value={q[`opsi_${opt}`]}
                            onChange={e => { e.stopPropagation(); updateQuestion(index, `opsi_${opt}`, e.target.value) }}
                            className={`w-full !border-0 !bg-transparent !ring-0`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Klik huruf opsi untuk memilih jawaban benar.
                  </p>

                  <div className="pt-2 mt-auto">
                    <label className="font-semibold text-slate-600 text-sm">Waktu Jawab (Detik)</label>
                    <div className="w-full">
                      <div className="flex gap-2 w-full">
                        {[5, 10, 20, 30, 60].map(time => (
                          <button 
                            key={time}
                            type="button"
                            onClick={() => { playSound('click'); updateQuestion(index, 'timer_detik', time); }}
                            className={`flex-1 py-2 rounded-lg font-bold transition-colors text-sm ${q.timer_detik === time ? 'bg-primary text-white' : 'bg-slate-200 hover:bg-slate-300'}`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
          
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 p-3 z-10">
          <div className="w-full max-w-4xl mx-auto flex gap-3">
              <Button onClick={addQuestion} variant="secondary" className="flex-1 !py-3">
                <Plus className="w-5 h-5 mr-2 inline" /> Tambah
              </Button>
              <Button onClick={() => saveQuiz()} disabled={saving} className="flex-1 !py-3">
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5 mr-2 inline" />}
                {saving ? 'Menyimpan...' : (isEditing ? 'Simpan' : 'Simpan Kuis')}
              </Button>
          </div>
      </div>
      
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsExitConfirmOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-pop" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-full p-3 bg-primary/10 text-primary"><AlertCircle className="w-6 h-6" /></div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-accent mb-2">Perubahan Belum Disimpan</h2>
                <p className="text-slate-600 text-sm leading-relaxed">Anda memiliki perubahan yang belum disimpan. Apa yang ingin Anda lakukan?</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <Button variant="secondary" onClick={() => setIsExitConfirmOpen(false)}>Batal</Button>
              <Button variant="outline" onClick={handleExitWithoutSaving}>Keluar Tanpa Menyimpan</Button>
              <Button onClick={handleSaveAndExit} disabled={saving}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Simpan & Keluar'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        onConfirm={closeNotification}
        title={notification.title}
        message={notification.message}
        confirmText="OK"
        singleButton={true}
        type={notification.type}
      />
    </div>
  );
};

export default CreateQuiz;