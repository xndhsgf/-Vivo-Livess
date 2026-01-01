
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MicOff, Mic, Zap } from 'lucide-react';
import { User } from '../../types';

interface SeatProps {
  index: number;
  speaker: User | null;
  onClick: (index: number) => void;
  currentUser: User;
  sizeClass: string;
  customSkin?: string; 
}

const Seat: React.FC<SeatProps> = ({ index, speaker, onClick, currentUser, sizeClass, customSkin }) => {
  return (
    <div className={`relative flex items-center justify-center ${sizeClass}`}>
      <button 
        onClick={() => onClick(index)} 
        className="w-full h-full relative group transition-transform active:scale-90 flex items-center justify-center"
      >
        {speaker ? (
          <div className="relative w-full h-full p-1 flex flex-col items-center">
            {/* التوهج عند التحدث فقط */}
            {!speaker.isMuted && (
              <motion.div 
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 z-0 rounded-full bg-amber-400/30 blur-md"
              />
            )}

            <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-2 border-white/20 bg-slate-900 shadow-xl">
              <img src={speaker.avatar} className="w-full h-full object-cover" alt={speaker.name} />
              
              {/* إيموجي التفاعل */}
              <AnimatePresence>
                {speaker.activeEmoji && (
                  <motion.div 
                    initial={{ scale: 0, y: 10 }} 
                    animate={{ scale: 1.5, y: -10 }} 
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
                  >
                    <span className="text-3xl filter drop-shadow-lg">{speaker.activeEmoji}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* الإطارات - Adjusted scale for tighter fit */}
            {speaker.frame && (
              <img src={speaker.frame} className="absolute inset-0 w-full h-full object-contain z-20 scale-[1.15] pointer-events-none" />
            )}

            {/* معلومات المستخدم تحت المايك */}
            <div className="absolute -bottom-10 left-0 right-0 flex flex-col items-center gap-0.5">
               {/* الاسم */}
               <span className="text-[8px] font-black text-white truncate drop-shadow-md px-1.5 py-0.5 bg-black/50 rounded-full max-w-[65px] border border-white/5">
                  {speaker.name}
               </span>
               
               {/* عداد الكاريزما (احتساب الكوينز المتلقاة) */}
               <motion.div 
                 initial={{ opacity: 0, y: -5 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-600/20 border border-pink-500/30 rounded-full shadow-lg backdrop-blur-sm"
               >
                  <span className="text-pink-400 font-black text-[7px] leading-none tracking-tighter">
                     {(Number(speaker.charm || 0)).toLocaleString()}
                  </span>
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(236,72,153,0.8)]"></div>
               </motion.div>
            </div>
          </div>
        ) : (
          /* تصميم المقعد الفارغ */
          customSkin ? (
            <div className="w-full h-full relative flex items-center justify-center">
               <img src={customSkin} className="w-full h-full object-contain filter drop-shadow-lg group-hover:brightness-125 transition-all" alt="Seat Skin" />
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner group-hover:bg-white/30 transition-all">
               <span className="text-xl filter grayscale opacity-60">🛋️</span>
            </div>
          )
        )}
      </button>
    </div>
  );
};

export default Seat;
