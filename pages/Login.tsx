import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
    } else {
      navigate('/host/dashboard');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-slate-50 min-h-screen">
      <Button variant="secondary" className="absolute top-4 left-4 !p-2.5 z-10" onClick={() => navigate('/')}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-pop">
        {/* Left Panel - responsive adjustments */}
        <div className="w-full lg:w-2/5 bg-primary text-white p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative min-h-[240px] lg:min-h-0">
          {/* FIX: Replaced missing PNG with existing SVG pattern */}
          <img src="assets/images/Logo-Putih-Crop.png" alt="background pattern" className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Login</h2>
            <p className="mt-2 text-white/80 text-sm sm:text-base">Silahkan login masuk ke Host Dashboard</p>
          </div>
          {/* FIX: Replaced missing PNG with existing white SVG logo */}
          <img src="assets/images/Logo-Text-Putih.png" alt="ID-Networkers White Logo" className="w-48 relative z-10" />
        </div>
        
        {/* Right Panel - responsive adjustments */}
        <div className="w-full lg:w-3/5 p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
          <h3 className="text-xl sm:text-2xl font-bold text-accent mb-1">Login ke Akun Anda</h3>
          <p className="text-slate-500 mb-6 text-sm sm:text-base">Selamat datang kembali!</p>

          {error && (
            <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg mb-4 text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input 
              label="Email *" 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contoh@email.com"
            />
            <Input 
              label="Password *" 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            
            <div>
              <Button type="submit" fullWidth disabled={loading} className="!py-3 text-base">
                {loading ? 'Memproses...' : 'Login'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
