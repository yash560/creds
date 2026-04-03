'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

type SoundType = 'click' | 'success' | 'error' | 'delete' | 'pop' | 'typing';

interface SoundContextValue {
  playSound: (type: SoundType) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const SOUND_URLS: Record<SoundType, string> = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  pop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
  delete: 'https://assets.mixkit.co/active_storage/sfx/2559/2559-preview.mp3',
  typing: 'https://assets.mixkit.co/active_storage/sfx/2563/2563-preview.mp3',
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('creds-hub-muted') === 'true';
    }
    return false;
  });
  const audioRefs = React.useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Preload sounds
    Object.entries(SOUND_URLS).forEach(([type, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.3;
      audioRefs.current[type] = audio;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('creds-hub-muted', String(next));
      return next;
    });
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;
    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.debug('Sound play blocked by browser', err));
    }
  }, [isMuted]);

  return (
    <SoundContext.Provider value={{ playSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within SoundProvider');
  return context;
}
