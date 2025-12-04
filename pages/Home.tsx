import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

const Home: React.FC = () => {
  const [gameCode, setGameCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode.trim()) {
      navigate(`/play/${gameCode}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-pop">
        <div className="text-center space-y-2">
          {/* FIX: Replaced missing PNG with existing SVG logo */}
          <img src="assets/images/Logo-Text-Merah.png" alt="ID-Networkers Logo" className="w-72 mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Platform kuis interaktif paling seru!</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            placeholder="PIN Game"
            className="text-center text-2xl tracking-[0.3em] font-bold h-16"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={6}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <Button type="submit" fullWidth className="!py-3 text-base">
            Masuk
          </Button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold">ATAU</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <div className="text-center">
          <p className="mb-3 text-slate-600 text-sm">Mau buat kuis sendiri?</p>
          <Link to="/login">
            <Button variant="secondary" fullWidth>Login sebagai Host</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;