import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Trash2, Calendar, Send, Timer, BookOpen, History, Download, FileText, FileCode, Pencil, X, Check, Copy } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const [weeklyReflections, setWeeklyReflections] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('time-tracker-weekly-reflections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const [monthlyReflections, setMonthlyReflections] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('time-tracker-monthly-reflections');
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
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [calcSelection, setCalcSelection] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const todayObj = new Date();
  const todayKey = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [exportEndDate, setExportEndDate] = useState(todayKey);
  
  const [summaryDate, setSummaryDate] = useState<string>(todayKey);
  const [summaryTab, setSummaryTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
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
    const handleStateChange = () => {
      const hash = window.location.hash;
      setIsSummaryMode(hash === '#summary');
      setShowExportModal(hash === '#export');
      
      if (hash === '') {
        setCalcSelection([]);
      }
    };

    // Initial check
    handleStateChange();

    window.addEventListener('popstate', handleStateChange);
    window.addEventListener('hashchange', handleStateChange);
    return () => {
      window.removeEventListener('popstate', handleStateChange);
      window.removeEventListener('hashchange', handleStateChange);
    };
  }, []);

  const pushHash = (hash: string) => {
    window.history.pushState(null, '', hash);
    window.dispatchEvent(new Event('popstate'));
  };

  const safeBack = () => {
    const before = window.location.hash;
    window.history.back();
    setTimeout(() => {
      if (window.location.hash === before) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        window.dispatchEvent(new Event('popstate'));
      }
    }, 50);
  };

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

  useEffect(() => {
    localStorage.setItem('time-tracker-weekly-reflections', JSON.stringify(weeklyReflections));
  }, [weeklyReflections]);

  useEffect(() => {
    localStorage.setItem('time-tracker-monthly-reflections', JSON.stringify(monthlyReflections));
  }, [monthlyReflections]);

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
    if (deletingId === id) setDeletingId(null);
  };

  const startEdit = (entry: LogEntry) => {
    setEditingId(entry.id);
    setEditValue(entry.text);
    setDeletingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editValue.trim()) return;
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, text: editValue.trim() } : entry
    ));
    setEditingId(null);
    setEditValue('');
  };

  const toggleSummaryMode = () => {
    if (window.location.hash !== '#summary') {
      pushHash('#summary');
    } else {
      safeBack();
    }
  };

  const handleEntryClick = (id: string) => {
    if (!isSummaryMode) return;
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

  const getChartData = (type: 'weekly' | 'monthly') => {
    const targetDate = new Date(summaryDate);
    let start, end;
    if (type === 'weekly') {
      start = startOfWeek(targetDate, { weekStartsOn: 1 });
      end = endOfWeek(targetDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(targetDate);
      end = endOfMonth(targetDate);
    }

    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => {
        const d = new Date(e.timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateStr;
      });
      
      let durationMs = 0;
      if (dayEntries.length >= 2) {
        const timestamps = dayEntries.map(e => e.timestamp);
        durationMs = Math.max(...timestamps) - Math.min(...timestamps);
      }
      
      const durationHours = Number((durationMs / (1000 * 60 * 60)).toFixed(1));
      
      return {
        dateStr,
        displayDate: type === 'weekly' ? format(day, 'EEEE', { locale: zhCN }).replace('星期', '周') : format(day, 'd日'),
        duration: durationHours,
        reflection: reflections[dateStr] || ''
      };
    });
  };

  const exportData = async (exportFormat: 'txt' | 'md' | 'copy') => {
    safeBack();
    
    const startTimestamp = new Date(`${exportStartDate}T00:00:00`).getTime();
    const endTimestamp = new Date(`${exportEndDate}T23:59:59`).getTime();

    const sortedEntries = [...entries]
      .filter(entry => entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp)
      .sort((a, b) => a.timestamp - b.timestamp);
      
    const grouped: Record<string, LogEntry[]> = {};
    
    sortedEntries.forEach(entry => {
      const d = new Date(entry.timestamp);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    try {
      const daysInRange = eachDayOfInterval({ start: new Date(exportStartDate), end: new Date(exportEndDate) });
      daysInRange.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        if (reflections[dateKey] && !grouped[dateKey]) {
          grouped[dateKey] = [];
        }
      });
    } catch (e) {
      // Ignore invalid dates
    }

    const sortedDates = Object.keys(grouped).sort();

    let content = '';
    const title = `时间切片记录 (${exportStartDate} 至 ${exportEndDate}) - Jin\n\n`;
    
    if (exportFormat === 'md') {
      content += `# ${title}`;
      sortedDates.forEach(date => {
        const dayEntries = grouped[date] || [];
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
      sortedDates.forEach(date => {
        const dayEntries = grouped[date] || [];
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

    if (exportFormat === 'copy') {
      try {
        await navigator.clipboard.writeText(content);
        alert('已复制到剪贴板');
      } catch (err) {
        alert('复制失败，请重试');
      }
      return;
    }

    const fileName = `时间切片记录_${exportStartDate}_至_${exportEndDate}.${exportFormat}`;
    
    // The "Hidden Link" Trick with Data URI
    const encodedUri = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
    
    try {
      await navigator.clipboard.writeText(encodedUri);
      alert(`已生成 ${exportFormat.toUpperCase()} 文件的下载链接并复制到剪贴板！\n\n请打开手机浏览器（如 Safari、Chrome 等），在地址栏粘贴并访问，即可下载或查看该文件。`);
    } catch (err) {
      alert('复制链接失败，请重试');
    }
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
            <button 
              onClick={() => {
                if (window.location.hash !== '#export') {
                  pushHash('#export');
                } else {
                  safeBack();
                }
              }}
              className={`p-2.5 rounded-full transition-colors ${showExportModal ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              title="导出记录"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleSummaryMode}
              className={`p-2.5 rounded-full transition-colors ${isSummaryMode ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              title="今日总结"
            >
              <BookOpen className="w-5 h-5" />
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
                <div className="flex bg-stone-200/50 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setSummaryTab('daily')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${summaryTab === 'daily' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    日总结
                  </button>
                  <button
                    onClick={() => setSummaryTab('weekly')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${summaryTab === 'weekly' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    周总结
                  </button>
                  <button
                    onClick={() => setSummaryTab('monthly')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${summaryTab === 'monthly' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    月总结
                  </button>
                </div>

                {summaryTab === 'daily' && (
                  <>
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[15px] font-bold text-stone-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          {summaryDate === todayKey ? '今日时间线' : '单日时间线'}
                        </h2>
                        <div className="flex items-center gap-2">
                          {summaryDate !== todayKey && (
                            <button
                              onClick={() => {
                                setSummaryDate(todayKey);
                                setCalcSelection([]);
                              }}
                              className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg font-medium active:bg-indigo-100 transition-colors"
                            >
                              回到今天
                            </button>
                          )}
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
                  </>
                )}

                {summaryTab === 'weekly' && (() => {
                  const chartData = getChartData('weekly');
                  const totalDuration = chartData.reduce((acc, curr) => acc + curr.duration, 0);
                  const totalDurationText = `${Math.floor(totalDuration)}小时${Math.round((totalDuration % 1) * 60)}分钟`;
                  const reflectionsList = chartData.filter(d => d.reflection.trim().length > 0);
                  
                  const targetDate = new Date(summaryDate);
                  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
                  const weekKey = format(weekStart, 'yyyy-MM-dd');

                  return (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[15px] font-bold text-stone-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          本周概览
                        </h2>
                        <div className="flex items-center gap-2">
                          {summaryDate !== todayKey && (
                            <button
                              onClick={() => {
                                setSummaryDate(todayKey);
                                setCalcSelection([]);
                              }}
                              className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg font-medium active:bg-indigo-100 transition-colors"
                            >
                              回到今天
                            </button>
                          )}
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
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                        <h3 className="text-[14px] font-bold text-stone-800 mb-4 flex items-center gap-2">
                          <Timer className="w-4 h-4 text-emerald-500" />
                          本周总时长: <span className="text-emerald-600">{totalDurationText}</span>
                        </h3>
                        <div className="h-48 w-full mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} />
                              <Tooltip 
                                cursor={{ fill: '#f5f5f4' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${value} 小时`, '记录时长']}
                                labelFormatter={(label, payload) => payload[0]?.payload.dateStr || label}
                              />
                              <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.dateStr === todayKey ? '#10b981' : '#6366f1'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                        <h3 className="text-[14px] font-bold text-stone-800 mb-4 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          每日感悟汇总
                        </h3>
                        {reflectionsList.length === 0 ? (
                          <p className="text-stone-400 text-sm text-center py-4">这周还没有写下每日感悟哦~</p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {reflectionsList.map(item => (
                              <div key={item.dateStr} className="border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                                <div className="text-xs font-medium text-stone-400 mb-2">{item.dateStr} ({item.displayDate})</div>
                                <p className="text-[14px] text-stone-700 leading-relaxed whitespace-pre-wrap">{item.reflection}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col mt-2">
                        <h2 className="text-[15px] font-bold text-stone-800 mb-3 flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-indigo-500" />
                          本周总结
                        </h2>
                        <textarea
                          value={weeklyReflections[weekKey] || ''}
                          onChange={(e) => {
                            setWeeklyReflections(prev => ({ ...prev, [weekKey]: e.target.value }));
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          placeholder="写下这周的整体回顾、成就或不足..."
                          className="w-full p-4 bg-white border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-[15px] leading-relaxed shadow-sm overflow-hidden min-h-[150px]"
                        />
                      </div>
                    </div>
                  );
                })()}

                {summaryTab === 'monthly' && (() => {
                  const targetDate = new Date(summaryDate);
                  const monthStart = startOfMonth(targetDate);
                  const monthEnd = endOfMonth(targetDate);
                  const monthKey = format(monthStart, 'yyyy-MM');
                  
                  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
                  const weeklyReflectionsList = weeks.map(week => {
                    const wKey = format(week, 'yyyy-MM-dd');
                    const wEnd = endOfWeek(week, { weekStartsOn: 1 });
                    return {
                      key: wKey,
                      displayDate: `${format(week, 'MM.dd')} - ${format(wEnd, 'MM.dd')}`,
                      reflection: weeklyReflections[wKey] || ''
                    };
                  }).filter(w => w.reflection.trim().length > 0);

                  return (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[15px] font-bold text-stone-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          本月概览
                        </h2>
                        <div className="flex items-center gap-2">
                          {summaryDate !== todayKey && (
                            <button
                              onClick={() => {
                                setSummaryDate(todayKey);
                                setCalcSelection([]);
                              }}
                              className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg font-medium active:bg-indigo-100 transition-colors"
                            >
                              回到今天
                            </button>
                          )}
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
                      </div>

                      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                        <h3 className="text-[14px] font-bold text-stone-800 mb-4 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          每周总结汇总
                        </h3>
                        {weeklyReflectionsList.length === 0 ? (
                          <p className="text-stone-400 text-sm text-center py-4">这个月还没有写下周总结哦~</p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {weeklyReflectionsList.map(item => (
                              <div key={item.key} className="border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                                <div className="text-xs font-medium text-stone-400 mb-2">{item.displayDate}</div>
                                <p className="text-[14px] text-stone-700 leading-relaxed whitespace-pre-wrap">{item.reflection}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col mt-2">
                        <h2 className="text-[15px] font-bold text-stone-800 mb-3 flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-indigo-500" />
                          本月总结
                        </h2>
                        <textarea
                          value={monthlyReflections[monthKey] || ''}
                          onChange={(e) => {
                            setMonthlyReflections(prev => ({ ...prev, [monthKey]: e.target.value }));
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          placeholder="写下这个月的整体回顾、目标达成情况..."
                          className="w-full p-4 bg-white border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-[15px] leading-relaxed shadow-sm overflow-hidden min-h-[150px]"
                        />
                      </div>
                    </div>
                  );
                })()}
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
                    {Object.entries(groupedEntries).map(([date, dayEntries]: [string, LogEntry[]]) => (
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
                              return (
                                <motion.div
                                  key={entry.id}
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                  className="group relative p-3.5 rounded-2xl shadow-sm transition-all duration-300 bg-white border border-stone-100"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="text-[11px] font-mono font-medium mb-1.5 text-stone-400">
                                        {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </div>
                                      {editingId === entry.id ? (
                                        <div className="flex flex-col gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                                          <textarea
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full bg-stone-50 border border-indigo-200 rounded-lg px-3 py-2 text-[15px] text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            rows={2}
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSaveEdit(entry.id);
                                              }
                                            }}
                                          />
                                          <div className="flex justify-end gap-2">
                                            <button
                                              onClick={() => setEditingId(null)}
                                              className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                                            >
                                              取消
                                            </button>
                                            <button
                                              onClick={() => handleSaveEdit(entry.id)}
                                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                                            >
                                              保存
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[15px] leading-relaxed break-words text-stone-800">
                                          {entry.text}
                                        </p>
                                      )}
                                    </div>
                                    {editingId !== entry.id && (
                                      <div className="flex items-center gap-1">
                                        {deletingId === entry.id ? (
                                          <div className="flex items-center gap-1 bg-red-50 px-2 py-1.5 rounded-xl">
                                            <span className="text-xs text-red-600 font-medium mr-1">确定删除?</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(entry.id);
                                              }}
                                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            >
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingId(null);
                                              }}
                                              className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg transition-colors"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(entry);
                                              }}
                                              className="p-2 text-stone-300 hover:text-indigo-500 active:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                                              aria-label="编辑记录"
                                            >
                                              <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingId(entry.id);
                                              }}
                                              className="p-2 text-stone-300 hover:text-red-500 active:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                              aria-label="删除记录"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
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

        {/* Export Modal */}
        <AnimatePresence>
          {showExportModal && (
            <>
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => safeBack()} />
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl border-t border-stone-100 p-6 z-50 flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-stone-800">导出记录</h2>
                  <button onClick={() => safeBack()} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-stone-600">起始日期</label>
                    <input 
                      type="date" 
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-stone-700 font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-stone-600">结束日期</label>
                    <input 
                      type="date" 
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-stone-700 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-2">
                  <button 
                    onClick={() => exportData('txt')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-medium transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    生成 TXT 下载链接 (复制到剪贴板)
                  </button>
                  <button 
                    onClick={() => exportData('md')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors"
                  >
                    <FileCode className="w-5 h-5" />
                    生成 Markdown 下载链接 (复制到剪贴板)
                  </button>
                  <button 
                    onClick={() => exportData('copy')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-medium transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                    直接复制纯文本内容
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
