
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, User, Gift, GameSettings, GlobalAnnouncement } from '../../types';
import { X, Lock, Unlock, Palette, Gift as GiftIcon, Zap, Settings2, ShieldCheck, UserMinus, RotateCcw, Trophy, MessageCircle, Send, Award, Star, Trash2, Eraser, LayoutGrid, ListFilter } from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, onSnapshot, increment, collection, addDoc, serverTimestamp, setDoc, query, orderBy, limit, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

// المكونات الداخلية
import RoomBackground from './RoomBackground';
import RoomHeader from './RoomHeader';
import Seat from './Seat';
import ControlBar from './ControlBar';
import GiftAnimationLayer from './GiftAnimationLayer';
import ComboButton from './ComboButton';

// المكونات العامة
import GiftModal from '../GiftModal';
import GameCenterModal from '../GameCenterModal';
import WheelGameModal from '../WheelGameModal';
import SlotsGameModal from '../SlotsGameModal';
import UserProfileSheet from '../UserProfileSheet';
import RoomSettingsModal from '../RoomSettingsModal';
import RoomRankModal from '../RoomRankModal';
import WinStrip from '../WinStrip';

interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  wealthLevel?: number;
  rechargeLevel?: number;
  bubbleUrl?: string;
  achievements?: string[];
  nameStyle?: string;
}

const ChatLevelBadge: React.FC<{ level: number; type: 'wealth' | 'recharge' }> = ({ level, type }) => {
  const isWealth = type === 'wealth';
  return (
    <div className="relative h-5 min-w-[65px] flex items-center group cursor-default scale-90 -ml-2 first:ml-0">
      <div className={`absolute inset-0 rounded-l-md rounded-r-xl border border-white/20 shadow-md ${
        isWealth 
          ? 'bg-gradient-to-r from-[#6a29e3] via-[#8b5cf6] to-[#6a29e3]' 
          : 'bg-gradient-to-r from-[#1a1a1a] via-[#444] to-[#1a1a1a]'
      }`}></div>
      <div className={`relative z-10 -ml-1 h-6 w-6 flex items-center justify-center shrink-0`}>
        <div className={`absolute inset-0 rounded-md transform rotate-45 border-2 ${
          isWealth ? 'bg-[#5b21b6] border-[#fbbf24]' : 'bg-[#000] border-amber-500'
        }`}></div>
        <span className="relative z-20 text-[10px] mb-0.5">👑</span>
      </div>
      <div className="relative z-10 flex-1 pr-1.5 text-center">
        <span className="text-[9px] font-black italic text-white">{level}</span>
      </div>
    </div>
  );
};

const MIC_LAYOUTS = [
  { count: 8, cols: 'grid-cols-4', size: 'w-[75px] h-[75px]', gap: 'gap-x-4 gap-y-12', label: '8 مقاعد' },
  { count: 10, cols: 'grid-cols-5', size: 'w-[65px] h-[65px]', gap: 'gap-x-2 gap-y-12', label: '10 مقاعد' },
  { count: 15, cols: 'grid-cols-5', size: 'w-[65px] h-[65px]', gap: 'gap-x-2 gap-y-10', label: '15 مقعد' },
  { count: 20, cols: 'grid-cols-5', size: 'w-[65px] h-[65px]', gap: 'gap-x-2 gap-y-10', label: '20 مقعد' }
];

const VoiceRoom: React.FC<any> = ({ 
  room, onLeave, onMinimize, currentUser, gifts, gameSettings, onUpdateRoom, 
  isMuted, onToggleMute, onUpdateUser, users, onEditProfile, onAnnouncement, onOpenPrivateChat
}) => {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showGameCenter, setShowGameCenter] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeGame, setActiveGame] = useState<'wheel' | 'slots' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [globalMicSkins, setGlobalMicSkins] = useState<Record<number, string>>({});
  const [luckyWinAmount, setLuckyWinAmount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [joinTime] = useState(new Date());

  const [comboState, setComboState] = useState<{
    gift: Gift;
    recipients: string[];
    count: number;
  } | null>(null);
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  // مراقبة حالة الطرد للمستخدم الحالي
  useEffect(() => {
    if (room.kickedUsers?.includes(currentUser.id)) {
      alert('لقد تم طردك من هذه الغرفة بواسطة الإدارة.');
      onLeave();
    }
  }, [room.kickedUsers, currentUser.id]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'appSettings', 'micSkins'), (snap) => {
      if (snap.exists()) setGlobalMicSkins(snap.data() as Record<number, string>);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', room.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMsg))
        .filter(msg => {
          if (!msg.timestamp) return true;
          const msgDate = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp);
          return msgDate >= joinTime;
        });
      
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [room.id, joinTime]);

  const micCount = room.micCount || 8;
  const layout = MIC_LAYOUTS.find(l => l.count === micCount) || MIC_LAYOUTS[0];

  const speakersWithLatestData = useMemo(() => {
    return (room.speakers || []).map(s => {
      const latest = users.find(u => u.id === s.id);
      return latest ? { ...s, ...latest } : s;
    });
  }, [room.speakers, users]);

  const seats = useMemo(() => {
    const s = new Array(micCount).fill(null);
    for (const speaker of speakersWithLatestData) {
      if (speaker.seatIndex !== undefined && speaker.seatIndex < micCount) s[speaker.seatIndex] = speaker;
    }
    return s;
  }, [speakersWithLatestData, micCount]);

  const handleSeatClick = async (index: number) => {
    const speakerAtSeat = seats[index];
    if (speakerAtSeat) { setSelectedUser(speakerAtSeat); return; }
    
    // التحقق من الطرد قبل الصعود للمايك
    if (room.kickedUsers?.includes(currentUser.id)) return;

    try {
      const simpleUser = {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        seatIndex: index,
        isMuted: true,
        charm: 0
      };
      
      const updatedSpeakers = [
        ...speakersWithLatestData
          .filter(s => s.id !== currentUser.id)
          .map(s => ({
            id: s.id,
            name: s.name,
            avatar: s.avatar,
            seatIndex: s.seatIndex,
            isMuted: s.isMuted,
            charm: s.charm || 0
          })), 
        simpleUser
      ];
      
      await onUpdateRoom(room.id, { speakers: updatedSpeakers });
    } catch (err) { console.error(err); }
  };

  const handleSendChatMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    setShowChatInput(false);

    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: textToSend,
        wealthLevel: currentUser.wealthLevel || 1,
        rechargeLevel: currentUser.rechargeLevel || 1,
        bubbleUrl: currentUser.activeBubble || null,
        achievements: currentUser.achievements || [],
        nameStyle: currentUser.nameStyle || null,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const handleClearChat = async () => {
    if (room.hostId !== currentUser.id) return;
    if (!confirm('سيتم مسح كافة رسائل الدردشة لجميع المتواجدين، هل أنت متأكد؟')) return;
    
    try {
      const messagesRef = collection(db, 'rooms', room.id, 'messages');
      const snap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setShowToolsMenu(false);
    } catch (err) { console.error(err); }
  };

  const handleResetAllCharms = async () => {
    if (room.hostId !== currentUser.id) return;
    if (!confirm('هل تريد تصفير الكاريزما لجميع الأعضاء على المايك؟')) return;
    try {
      const resetSpeakers = (room.speakers || []).map((s: any) => ({ ...s, charm: 0 }));
      await onUpdateRoom(room.id, { speakers: resetSpeakers });
      setShowToolsMenu(false);
      alert('تم تصفير الكاريزما بنجاح ✅');
    } catch (err) { console.error(err); }
  };

  const handleClearRoomRank = async () => {
    if (room.hostId !== currentUser.id) return;
    if (!confirm('هل أنت متأكد من مسح ترتيب الغرفة (الرانك) بالكامل؟ سيتم حذف جميع الداعمين من القائمة لهذه الجلسة.')) return;
    
    try {
      const contribRef = collection(db, 'rooms', room.id, 'contributors');
      const snap = await getDocs(contribRef);
      const batch = writeBatch(db);
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setShowToolsMenu(false);
      alert('تم تصفير الرانك بنجاح ✅');
    } catch (err) { console.error(err); }
  };

  const handleUpdateMicCount = async (count: number) => {
    try {
      const filteredSpeakers = (room.speakers || [])
        .filter((s: any) => s.seatIndex < count);
      
      await onUpdateRoom(room.id, { micCount: count, speakers: filteredSpeakers });
      setShowMicMenu(false);
    } catch (e) { console.error(e); }
  };

  const executeGiftSend = async (gift: Gift, recipientIds: string[], qty: number = 1, isFromCombo: boolean = false) => {
    const totalCost = Number(gift.cost) * qty * recipientIds.length;
    const currentCoins = Number(currentUser.coins || 0);

    if (currentCoins < totalCost) {
       alert('رصيدك لا يكفي! 🪙');
       setComboState(null);
       return false;
    }

    onUpdateUser({ 
      id: currentUser.id,
      coins: increment(-totalCost),
      wealth: increment(totalCost)
    });

    const roomContribRef = doc(db, 'rooms', room.id, 'contributors', currentUser.id);
    await setDoc(roomContribRef, {
      userId: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      amount: increment(totalCost),
      timestamp: serverTimestamp()
    }, { merge: true });

    recipientIds.forEach(rid => {
        onUpdateUser({
            id: rid,
            charm: increment(gift.cost * qty),
            diamonds: increment(gift.cost * qty)
        });
    });

    const updatedSpeakersInRoom = (room.speakers || []).map((s: any) => {
       if (recipientIds.includes(s.id)) {
          return { ...s, charm: (s.charm || 0) + (gift.cost * qty) };
       }
       return s;
    });
    await onUpdateRoom(room.id, { speakers: updatedSpeakersInRoom });

    try {
      if (gift.isLucky) {
        const winChance = gameSettings.luckyGiftWinRate || 30;
        const isWin = (Math.random() * 100) < winChance;
        if (isWin) {
          const refundPercent = gameSettings.luckyGiftRefundPercent || 200;
          const winAmount = (gift.cost * qty * refundPercent) / 100;
          await onUpdateUser({ id: currentUser.id, coins: increment(winAmount) });
          setLuckyWinAmount(winAmount);
          setTimeout(() => setLuckyWinAmount(0), 5000);
        }
      }

      await addDoc(collection(db, 'rooms', room.id, 'gift_events'), {
        giftId: gift.id, giftName: gift.name, giftIcon: gift.icon, giftAnimation: gift.animationType,
        senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
        recipientIds: recipientIds, quantity: qty, timestamp: serverTimestamp()
      });

      recipientIds.forEach(rid => {
         const recipient = users.find(u => u.id === rid);
         if (recipient && onAnnouncement) {
            onAnnouncement({
               id: Math.random().toString(), senderName: currentUser.name,
               recipientName: recipient.id === currentUser.id ? "نفسه 🌟" : recipient.name,
               giftName: gift.name, giftIcon: gift.icon, roomTitle: room.title, roomId: room.id,
               type: 'gift', amount: gift.cost * qty, timestamp: new Date()
            });
         }
      });

      if (!isFromCombo) {
        setComboState({ gift, recipients: recipientIds, count: qty });
        resetComboTimer();
      }

      return true;
    } catch (err) { return false; }
  };

  const handleComboHit = async () => {
    if (!comboState) return;
    const success = await executeGiftSend(comboState.gift, comboState.recipients, 1, true);
    if (success) {
      setComboState(prev => prev ? { ...prev, count: prev.count + 1 } : null);
      resetComboTimer();
    }
  };

  const resetComboTimer = () => {
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => { setComboState(null); }, 5000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black flex flex-col font-cairo overflow-hidden">
      <RoomBackground background={room.background} />
      <RoomHeader room={room} onLeave={onLeave} onMinimize={onMinimize} />
      
      <GiftAnimationLayer roomId={room.id} speakers={speakersWithLatestData} />
      
      <AnimatePresence>{luckyWinAmount > 0 && <WinStrip amount={luckyWinAmount} />}</AnimatePresence>
      <AnimatePresence>
        {comboState && (
          <ComboButton 
            gift={comboState.gift} 
            count={comboState.count} 
            onHit={handleComboHit} 
            duration={5000} 
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col justify-start pt-4 px-4 relative z-10 overflow-hidden">
         <div className={`grid ${layout.cols} ${layout.gap} w-full max-w-md mx-auto mb-6 shrink-0 transition-all duration-500`}>
            {seats.map((speaker, index) => (
               <Seat key={index} index={index} speaker={speaker} onClick={handleSeatClick} currentUser={currentUser} sizeClass={layout.size} customSkin={globalMicSkins[micCount]} />
            ))}
         </div>

         <div className="flex-1 flex flex-col justify-end overflow-hidden pb-4">
            <div className="max-w-[320px] space-y-3 overflow-y-auto scrollbar-hide pr-2" dir="rtl">
               {chatMessages.map((msg) => (
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    key={msg.id} 
                    className="relative group w-fit max-w-full"
                  >
                     {msg.bubbleUrl ? (
                        <div 
                           className="relative px-7 py-5 min-w-[150px] min-h-[80px] flex flex-col"
                           style={{ 
                              backgroundImage: `url(${msg.bubbleUrl})`,
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat'
                           }}
                        >
                           <div className="flex items-center gap-1 flex-wrap mb-1.5 relative z-10">
                              <ChatLevelBadge level={msg.wealthLevel || 1} type="wealth" />
                              <ChatLevelBadge level={msg.rechargeLevel || 1} type="recharge" />
                              <span className={`text-[10px] font-black ${msg.nameStyle || 'text-slate-900'} truncate`}>{msg.senderName}:</span>
                           </div>
                           
                           {msg.achievements && msg.achievements.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1 relative z-10 pr-1">
                                 {msg.achievements.map((badge, i) => (
                                    <img key={i} src={badge} className="h-4 w-auto object-contain drop-shadow-sm" />
                                 ))}
                              </div>
                           )}

                           <span className="text-[11px] font-black text-slate-800 break-words leading-tight relative z-10 pr-1">{msg.text}</span>
                        </div>
                     ) : (
                        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col gap-1.5 shadow-lg">
                           <div className="flex items-center gap-1 flex-wrap">
                              <ChatLevelBadge level={msg.wealthLevel || 1} type="wealth" />
                              <ChatLevelBadge level={msg.rechargeLevel || 1} type="recharge" />
                              <span className={`text-[10px] font-black ${msg.nameStyle || 'text-amber-400'}`}>{msg.senderName}:</span>
                           </div>

                           {msg.achievements && msg.achievements.length > 0 && (
                              <div className="flex flex-wrap gap-1 pr-1">
                                 {msg.achievements.map((badge, i) => (
                                    <img key={i} src={badge} className="h-3.5 w-auto object-contain" />
                                 ))}
                              </div>
                           )}

                           <span className="text-[11px] font-bold text-white break-words pr-1">{msg.text}</span>
                        </div>
                     )}
               </motion.div>
               ))}
               <div ref={chatEndRef} />
            </div>
         </div>
      </div>

      <ControlBar 
        isMuted={isMuted} 
        onToggleMute={onToggleMute} 
        onShowGifts={() => { setSelectedRecipientIds([]); setShowGiftModal(true); }} 
        onShowGames={() => setShowGameCenter(true)} 
        onShowRoomTools={() => setShowToolsMenu(true)} 
        userCoins={Number(currentUser.coins || 0)} 
        onOpenChat={() => setShowChatInput(true)}
      />

      <GiftModal isOpen={showGiftModal} onClose={() => { setShowGiftModal(false); setSelectedRecipientIds([]); }} gifts={gifts} userCoins={Number(currentUser.coins || 0)} speakers={speakersWithLatestData} selectedRecipientIds={selectedRecipientIds} onSelectRecipient={setSelectedRecipientIds} onSend={(g, q) => { setShowGiftModal(false); executeGiftSend(g, selectedRecipientIds, q); }} />
      <GameCenterModal isOpen={showGameCenter} onClose={() => setShowGameCenter(false)} onSelectGame={(g) => { setActiveGame(g); setShowGameCenter(false); }} />
      {activeGame === 'wheel' && <WheelGameModal isOpen onClose={() => setActiveGame(null)} userCoins={Number(currentUser.coins || 0)} onUpdateCoins={(c) => onUpdateUser({ coins: c })} winRate={gameSettings.wheelWinRate} gameSettings={gameSettings} />}
      {activeGame === 'slots' && <SlotsGameModal isOpen onClose={() => setActiveGame(null)} userCoins={Number(currentUser.coins || 0)} onUpdateCoins={(c) => onUpdateUser({ coins: c })} winRate={gameSettings.slotsWinRate} gameSettings={gameSettings} />}
      
      {selectedUser && (
        <UserProfileSheet 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          isCurrentUser={selectedUser.id === currentUser.id} 
          currentUser={currentUser} 
          allUsers={users} 
          currentRoom={room} // تمرير كائن الغرفة بالكامل
          onShowRoomRank={() => { setSelectedUser(null); setShowRankModal(true); }} 
          onAction={(act, payload) => { 
            if (act === 'editProfile') onEditProfile(); 
            if (act === 'gift') { setSelectedRecipientIds([selectedUser.id]); setShowGiftModal(true); } 
            if (act === 'message') { onOpenPrivateChat(payload); } 
          }} 
        />
      )}

      {showRankModal && <RoomRankModal isOpen={showRankModal} onClose={() => setShowRankModal(false)} roomId={room.id} roomTitle={room.title} />}
      {showSettingsModal && <RoomSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} room={room} onUpdate={onUpdateRoom} />}

      <AnimatePresence>
        {showMicMenu && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMicMenu(false)} />
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl">
                <h3 className="text-xl font-black text-white text-center mb-6">اختيار عدد المقاعد</h3>
                <div className="grid grid-cols-2 gap-3">
                   {MIC_LAYOUTS.map(l => (
                      <button 
                        key={l.count} 
                        onClick={() => handleUpdateMicCount(l.count)}
                        className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${micCount === l.count ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                      >
                         <LayoutGrid size={24} />
                         <span className="font-black text-xs">{l.label}</span>
                      </button>
                   ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChatInput && (
          <div className="fixed inset-0 z-[110] flex items-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowChatInput(false)} />
            <motion.div 
               initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} 
               className="w-full bg-[#0f172a] p-4 pb-8 border-t border-white/10 flex items-center gap-3 z-[120] rounded-t-[2.5rem]"
            >
               <div className="flex-1 relative">
                  <input autoFocus type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="اكتب رسالتك هنا..." onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500/50 text-right" />
               </div>
               <button onClick={handleSendChatMessage} disabled={!inputText.trim()} className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-30">
                  <Send size={24} className="rotate-180" fill="currentColor" />
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToolsMenu && (room.hostId === currentUser.id) && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowToolsMenu(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-[#0f172a] border-t border-white/10 rounded-t-[3rem] p-8 pb-12 shadow-2xl">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg"><ShieldCheck size={20} className="text-white" /></div>
                    <h3 className="text-white font-black text-lg">أدوات الإشراف</h3>
                 </div>
                 <button onClick={() => setShowToolsMenu(false)} className="p-2 bg-white/5 rounded-full text-slate-500"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-3 gap-y-8 gap-x-4 text-center">
                 {[
                    { label: 'تغيير المايكات', icon: Settings2, color: 'bg-amber-500', action: () => { setShowToolsMenu(false); setShowMicMenu(true); } },
                    { label: room.isLocked ? 'إلغاء القفل' : 'قفل الغرفة', icon: room.isLocked ? Unlock : Lock, color: room.isLocked ? 'bg-emerald-500' : 'bg-red-500', action: () => { setShowToolsMenu(false); setShowSettingsModal(true); } },
                    { label: 'تغيير الخلفية', icon: Palette, color: 'bg-blue-500', action: () => { setShowToolsMenu(false); setShowSettingsModal(true); } },
                    { label: 'مسح الدردشة', icon: Eraser, color: 'bg-red-600', action: handleClearChat },
                    { label: 'تصفير المقاعد', icon: RotateCcw, color: 'bg-indigo-600', action: handleResetAllCharms },
                    { label: 'تصفير الرانك', icon: ListFilter, color: 'bg-pink-600', action: handleClearRoomRank },
                 ].map((tool, idx) => (
                    <button key={idx} onClick={tool.action} className="flex flex-col items-center gap-3 group">
                       <div className={`w-16 h-16 ${tool.color} rounded-[1.5rem] flex items-center justify-center text-white shadow-xl group-active:scale-90 transition-all border border-white/10`}>
                          <tool.icon size={28} />
                       </div>
                       <span className="text-[11px] text-slate-300 font-black tracking-tight">{tool.label}</span>
                    </button>
                 ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VoiceRoom;
