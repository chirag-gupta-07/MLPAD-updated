import React, { useState, useEffect, useRef } from 'react';
import introData from './introFrames.json';

interface IntroSplashProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({
  onComplete,
  minDurationMs = 3000
}) => {
  const [isFading, setIsFading] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  useEffect(() => {
    const frames = introData.frames || [];
    const totalFrames = frames.length;
    if (totalFrames === 0) {
      finish();
      return;
    }

    const intervalMs = 1000 / (introData.fps || 24);
    let idx = 0;

    const frameTimer = setInterval(() => {
      idx += 1;
      if (idx >= totalFrames) {
        clearInterval(frameTimer);
        // Hold the final pristine logo frame briefly then transition smoothly
        setTimeout(() => {
          finish();
        }, 350);
      } else {
        setCurrentFrameIndex(idx);
      }
    }, intervalMs);

    const safetyTimer = setTimeout(() => {
      clearInterval(frameTimer);
      finish();
    }, minDurationMs + 1500);

    return () => {
      clearInterval(frameTimer);
      clearTimeout(safetyTimer);
    };
  }, [minDurationMs]);

  const currentFrame = introData.frames[currentFrameIndex] || introData.frames[0];

  return (
    <div
      onClick={finish}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-white cursor-pointer transition-opacity duration-500 ease-out select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#ffffff' }}
      title="Click anywhere to skip"
    >
      {/* Full-Page Animation Canvas without any extra text or images */}
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12 bg-white">
        <img
          src={currentFrame}
          alt="MLPAD"
          className="w-full h-full max-w-[960px] max-h-[90vh] object-contain pointer-events-none"
          style={{ backgroundColor: '#ffffff' }}
        />
      </div>
    </div>
  );
};
