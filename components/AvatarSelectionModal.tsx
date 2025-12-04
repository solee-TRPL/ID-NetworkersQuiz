import React, { useState, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';
import { X, Loader2 } from 'lucide-react';

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarUri: string) => void;
}

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
}) => {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const generateAvatars = async () => {
        // Define a 4x4 matrix of expressions for uniformity
        const eyesList = ['closed', 'cute', 'love', 'wink'];
        const mouthList = ['cute', 'lilSmile', 'smileLol', 'wideSmile'];
        
        const avatarPromises = [];

        // Generate 16 unique avatars based on the matrix
        for (const eyes of eyesList) {
            for (const mouth of mouthList) {
                const avatar = createAvatar(funEmoji, {
                    seed: 'ID-Networkers', // Constant seed ensures base shape/rotation is identical
                    // @ts-ignore
                    eyes: [eyes],
                    // @ts-ignore
                    mouth: [mouth],
                    backgroundColor: [], // Transparent background
                    shapeColor: ['e33849']
                });
                avatarPromises.push(avatar.toDataUri());
            }
        }

        const generatedAvatars = await Promise.all(avatarPromises);
        setAvatars(generatedAvatars);
        setLoading(false);
      };
      generateAvatars();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (avatarUri: string) => {
    onSelectAvatar(avatarUri);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg animate-pop flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-accent">Pilih Avatar Favoritmu</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-primary transition-colors p-1 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {avatars.map((avatarUri, index) => (
              <button 
                key={index}
                onClick={() => handleSelect(avatarUri)}
                className="rounded-full transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <img 
                  src={avatarUri} 
                  alt={`Avatar ${index + 1}`} 
                  className="w-full h-auto aspect-square rounded-full bg-primary/10 border-2 border-primary/20"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
