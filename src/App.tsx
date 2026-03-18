import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Trash2, Calendar, Send, Timer, BookOpen, History, Download, FileText, FileCode } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: number;
  text: string;
}

export default function App() {
  const [entries, setEntries] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('time-tracker-entries');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [reflections, setReflections] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('time-tracker-reflections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const [inputValue, setInputValue] = useState('');
  const [isCalcMode, setIsCalcMode] = useState(false);
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [calcSelection, setCalcSelection] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const todayObj = new Date();
  const todayKey = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const [summaryDate, setSummaryDate] = useState<string>(todayKey);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isSummaryMode && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isSummaryMode, reflections]);

  useEffect(() => {
    // Clear hash on mount if it exists to prevent weird history states on refresh
    if (window.location.hash === '#summary') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (isSummaryMode) {
        setIsSummaryMode(false);
        setCalcSelection([]);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSummaryMode]);

  useEffect(() => {
    if (!isSummaryMode) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [isSummaryMode]);

  useEffect(() => {
    localStorage.setItem('time-tracker-entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('time-tracker-reflections', JSON.stringify(reflections));
  }, [reflections]);

  const handleToggleTimePicker = () => {
    if (!showTimePicker) {
      const now = new Date();
      setCustomDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setCustomTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
    setShowTimePicker(!showTimePicker);
  };

  const handleAddEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    let timestamp = Date.now();
    if (showTimePicker && customDate && customTime) {
      timestamp = new Date(`${customDate}T${customTime}`).getTime();
    }

    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp,
      text: inputValue.trim(),
    };

    setEntries(prev => {
      const updated = [newEntry, ...prev];
      return updated.sort((a, b) => b.timestamp - a.timestamp);
    });
    setInputValue('');
    setShowTimePicker(false);
    
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    inputRef.current?.focus();
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
    setCalcSelection(prev => prev.filter(selectedId => selectedId !== id));
  };

  const toggleCalcMode = () => {
    setIsCalcMode(!isCalcMode);
    if (isSummaryMode) {
      window.history.back();
    }
    setCalcSelection([]);
  };

  const toggleSummaryMode = () => {
    if (!isSummaryMode) {
      // Add #summary to the URL so mobile browsers reliably create a history entry
      window.history.pushState({ summary: true }, '', '#summary');
      setIsSummaryMode(true);
      setIsCalcMode(false);
      setCalcSelection([]);
    } else {
      window.history.back();
    }
  };

  const handleEntryClick = (id: string) => {
    if (!isCalcMode && !isSummaryMode) return;
    setCalcSelection(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [id]; // Start new selection if 2 are already selected
      }
      return [...prev, id];
    });
  };

  // Calculate duration if 2 items are selected
  let minTime = 0;
  let maxTime = 0;
  let durationText = '';
  
  if (calcSelection.length === 2) {
    const entry1 = entries.find(e => e.id === calcSelection[0]);
    const entry2 = entries.find(e => e.id === calcSelection[1]);
    if (entry1 && entry2) {
      minTime = Math.min(entry1.timestamp, entry2.timestamp);
      maxTime = Math.max(entry1.timestamp, entry2.timestamp);
      const diff = maxTime - minTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      const parts = [];
      if (hours > 0) parts.push(`${hours}小时`);
      if (minutes > 0) parts.push(`${minutes}分钟`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);
      durationText = parts.join(' ');
    }
  }

  // Group by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = new Date(entry.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    
    if (date.toDateString() === today.toDateString()) {
      dateKey = '今天 · ' + date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = '昨天 · ' + date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    }

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  // Today's key for reflections
  const todayObjForGroup = new Date();
  const todayKeyForGroup = `${todayObjForGroup.getFullYear()}-${String(todayObjForGroup.getMonth() + 1).padStart(2, '0')}-${String(todayObjForGroup.getDate()).padStart(2, '0')}`;
  
  // Selected date's entries for summary (oldest first for reading chronologically)
  const selectedDateEntries = entries.filter(e => {
    const d = new Date(e.timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === summaryDate;
  }).reverse();

  const exportData = (format: 'txt' | 'md') => {
    setShowExportMenu(false);
    
    // Group all entries by date (ascending for export)
    const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const grouped: Record<string, LogEntry[]> = {};
    
    sortedEntries.forEach(entry => {
      const d = new Date(entry.timestamp);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    let content = '';
    const title = '时间切片记录 - Jin\n\n';
    
    if (format === 'md') {
      content += `# ${title}`;
      Object.entries(grouped).forEach(([date, dayEntries]) => {
        content += `## ${date}\n\n`;
        dayEntries.forEach(entry => {
          const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          content += `- **${time}** ${entry.text}\n`;
        });
        
        if (reflections[date]) {
          content += `\n> **今日感悟与反思：**\n> ${reflections[date].split('\n').join('\n> ')}\n`;
        }
        content += '\n---\n\n';
      });
    } else {
      content += title;
      Object.entries(grouped).forEach(([date, dayEntries]) => {
        content += `${date}\n`;
        content += `------------------------\n`;
        dayEntries.forEach(entry => {
          const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          content += `${time} ${entry.text}\n`;
        });
        
        if (reflections[date]) {
          content += `\n[今日感悟与反思]\n${reflections[date]}\n`;
        }
        content += '\n========================\n\n';
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `时间切片记录_${todayKey}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-stone-200 sm:p-4 md:p-8 flex items-center justify-center font-sans selection:bg-stone-300">
      <div className="w-full max-w-md h-[100dvh] sm:h-[85vh] sm:max-h-[850px] bg-stone-50 sm:rounded-[2.5rem] sm:shadow-2xl sm:border-8 border-stone-800 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-stone-100 px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 shrink-0 z-20 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-stone-800" />
              时间切片
            </h1>
            <p className="text-stone-500 mt-1 text-xs">
              记录每一个当下-Jin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`p-2.5 rounded-full transition-colors ${showExportMenu ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                title="导出记录"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50 overflow-hidden"
                    >
                      <button 
                        onClick={() => exportData('txt')}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-stone-400" />
                        导出为 TXT
                      </button>
                      <button 
                        onClick={() => exportData('md')}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                      >
                        <FileCode className="w-4 h-4 text-stone-400" />
                        导出为 Markdown
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={toggleSummaryMode}
              className={`p-2.5 rounded-full transition-colors ${isSummaryMode ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              title="今日总结"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleCalcMode}
              className={`p-2.5 rounded-full transition-colors ${isCalcMode ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              title="计算时长"
            >
              <Timer className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-6 pb-48 custom-scrollbar bg-stone-50">
          <AnimatePresence mode="wait">
            {isSummaryMode ? (
              <motion.div
                key="summary-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-h-full"
              >
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[15px] font-bold text-stone-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      {summaryDate === todayKey ? '今日时间线' : '单日时间线'}
                    </h2>
                    <input 
                      type="date" 
                      value={summaryDate}
                      onChange={(e) => {
                        setSummaryDate(e.target.value);
                        setCalcSelection([]);
                      }}
                      className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-stone-700 font-medium shadow-sm"
                    />
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2">
                    {selectedDateEntries.length === 0 ? (
                      <p className="text-stone-400 text-sm text-center py-4">{summaryDate === todayKey ? '今天还没有记录哦~' : '这一天没有记录哦~'}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedDateEntries.map((entry) => {
                          const isSelected = calcSelection.includes(entry.id);
                          return (
                            <div 
                              key={entry.id} 
                              onClick={() => handleEntryClick(entry.id)}
                              className={`flex gap-3 text-[14px] p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-stone-50 border border-transparent'}`}
                            >
                              <span className={`font-mono shrink-0 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`}>
                                {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`break-words ${isSelected ? 'text-emerald-800' : 'text-stone-700'}`}>{entry.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {calcSelection.length === 2 && isSummaryMode && (
                      <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <span className="text-emerald-700 text-sm font-medium">所选时间段时长：</span>
                        <span className="text-emerald-700 font-bold">{durationText}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col mt-8">
                  <h2 className="text-[15px] font-bold text-stone-800 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    {summaryDate === todayKey ? '今日感悟与反思' : '感悟与反思'}
                  </h2>
                  <textarea
                    ref={textareaRef}
                    value={reflections[summaryDate] || ''}
                    onChange={(e) => {
                      setReflections(prev => ({ ...prev, [summaryDate]: e.target.value }));
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder={`写下${summaryDate === todayKey ? '今天' : '这天'}的收获、反思或是心情...`}
                    className="w-full p-4 bg-white border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-[15px] leading-relaxed shadow-sm overflow-hidden min-h-[200px]"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="timeline-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {entries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4 opacity-60 mt-20">
                    <Calendar className="w-12 h-12" />
                    <p className="text-sm">还没有记录，写下你的第一个时间切片吧</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedEntries).map(([date, dayEntries]) => (
                      <div key={date} className="relative">
                        <div className="py-2 mb-3 -mx-2 px-2">
                          <h2 className="text-xs font-semibold text-stone-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                            {date}
                          </h2>
                        </div>
                        
                        <div className="space-y-3 pl-3 border-l-2 border-stone-200 ml-0.5">
                          <AnimatePresence initial={false}>
                            {dayEntries.map((entry) => {
                              const isSelected = calcSelection.includes(entry.id);
                              const isBetween = calcSelection.length === 2 && entry.timestamp > minTime && entry.timestamp < maxTime;
                              
                              let cardClass = "group relative p-3.5 rounded-2xl shadow-sm transition-all duration-300 ";
                              if (isCalcMode) {
                                cardClass += "cursor-pointer hover:scale-[1.02] active:scale-[0.98] ";
                              }
                              
                              if (isSelected) {
                                cardClass += "bg-emerald-50 border-2 border-emerald-500 z-10 ";
                              } else if (isBetween) {
                                cardClass += "bg-emerald-50/40 border border-emerald-200 border-l-4 border-l-emerald-400 ";
                              } else {
                                cardClass += "bg-white border border-stone-100 ";
                                if (isCalcMode && calcSelection.length === 2) {
                                  cardClass += "opacity-40 grayscale-[0.5] ";
                                }
                              }

                              return (
                                <motion.div
                                  key={entry.id}
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                  onClick={() => handleEntryClick(entry.id)}
                                  className={cardClass}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className={`text-[11px] font-mono font-medium mb-1.5 ${isSelected || isBetween ? 'text-emerald-600' : 'text-stone-400'}`}>
                                        {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </div>
                                      <p className={`text-[15px] leading-relaxed break-words ${isSelected || isBetween ? 'text-emerald-900' : 'text-stone-800'}`}>
                                        {entry.text}
                                      </p>
                                    </div>
                                    {!isCalcMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(entry.id);
                                        }}
                                        className="p-2 text-stone-300 hover:text-red-500 active:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        aria-label="删除记录"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Area (Input, Calc Panel, or Summary Panel) */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-stone-100 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
          <AnimatePresence mode="wait">
            {isSummaryMode ? (
              <motion.div
                key="summary-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <button 
                  onClick={toggleSummaryMode} 
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors text-[15px] shadow-sm"
                >
                  完成总结，返回记录
                </button>
              </motion.div>
            ) : isCalcMode ? (
              <motion.div 
                key="calc-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center"
              >
                {calcSelection.length === 0 && <p className="text-stone-500 font-medium py-4">请点击选择第一个时间记录</p>}
                {calcSelection.length === 1 && <p className="text-emerald-600 font-medium py-4">请点击选择第二个时间记录</p>}
                {calcSelection.length === 2 && (
                  <div className="text-center py-1">
                    <p className="text-stone-500 text-xs mb-1">经过时长</p>
                    <p className="text-2xl font-bold text-emerald-600">{durationText}</p>
                  </div>
                )}
                <div className="flex gap-3 mt-3 w-full">
                  <button onClick={() => setCalcSelection([])} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-2xl font-medium hover:bg-stone-200 transition-colors text-sm">重置选择</button>
                  <button onClick={toggleCalcMode} className="flex-1 py-3 bg-stone-800 text-white rounded-2xl font-medium hover:bg-stone-700 transition-colors text-sm">退出计算</button>
                </div>
              </motion.div>
            ) : (
              <motion.form 
                key="input-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleAddEntry} 
                className="flex flex-col gap-2 w-full"
              >
                <AnimatePresence>
                  {showTimePicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="flex gap-2 overflow-hidden"
                    >
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="flex-1 bg-stone-100 border border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-stone-800 transition-all"
                      />
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="flex-1 bg-stone-100 border border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-stone-800 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={handleToggleTimePicker}
                    className={`absolute left-1.5 p-2 rounded-full transition-colors z-10 ${showTimePicker ? 'bg-indigo-100 text-indigo-600' : 'text-stone-400 hover:bg-stone-200 hover:text-stone-600'}`}
                    title="补录时间"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={showTimePicker ? "补录记录..." : "此刻你在做什么？"}
                    className="w-full bg-stone-100 border-transparent rounded-full py-3.5 pl-12 pr-14 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:bg-white transition-all text-[15px]"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="absolute right-1.5 p-2.5 bg-stone-800 text-white rounded-full hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-stone-800 transition-colors shadow-sm z-10"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
