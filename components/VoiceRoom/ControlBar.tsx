
import React from 'react';
import { Mic, MicOff, Gift, Gamepad2, LayoutGrid, MessageCircle } from 'lucide-react';

interface ControlBarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onShowGifts: () => void;
  onShowGames: () => void;
  onShowRoomTools: () => void;
  onOpenChat: () => void; // إضافة البروب الجديد
  userCoins: number;
}

const ControlBar: React.FC<ControlBarProps> = ({ 
  isMuted, onToggleMute, onShowGifts, onShowGames, onShowRoomTools, onOpenChat, userCoins 
}) => {
  return (
    <div className="p-4 bg-gradient-to-t from-black to-transparent z-50 shrink-0">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        
        {/* زر الامتيازات (4 مربعات) */}
        <button 
          onClick={onShowRoomTools}
          className="w-11 h-11 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 shadow-lg"
          title="امتيازات الغرفة"
        >
          <LayoutGrid size={22} />
        </button>

        {/* الدردشة (مفعلة الآن) */}
        <button 
           onClick={onOpenChat}
           className="flex-1 h-11 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center px-4 active:scale-[0.98] transition-transform"
        >
           <MessageCircle size={14} className="text-slate-500 ml-2" />
           <span className="text-[10px] text-slate-500 font-bold">دردشة الغرفة...</span>
        </button>

        {/* زر المايك الرئيسي */}
        <button 
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-xl transition-all active:scale-90 ${
            isMuted ? 'bg-slate-800 border-white/10 text-slate-500' : 'bg-blue-600 border-blue-400 text-white animate-pulse'
          }`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {/* ألعاب وهدايا */}
        <div className="flex gap-2">
           <button onClick={onShowGames} className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 border border-emerald-400/30"><Gamepad2 size={22}/></button>
           <button onClick={onShowGifts} className="w-11 h-11 bg-pink-600 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 border border-pink-400/30"><Gift size={22} fill="currentColor" /></button>
        </div>

      </div>
    </div>
  );
};

export default ControlBar;
