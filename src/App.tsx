/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Type,
  Layout,
  Sparkles,
  Download,
  ChevronRight,
  MoreVertical,
  ChevronDown,
  Menu,
  ChevronUp,
  ExternalLink,
  Eye,
  PenTool,
  Settings,
  Palette,
  Wand2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  RotateCcw,
  History,
  Trash2,
  Check,
  Languages,
  Save,
  X,
  Printer
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import { optimizeContent } from './services/geminiService';
import { TemplateType, DEFAULT_MARKDOWN, TEMPLATES, Version } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Markdown Component with Syntax Highlighting ---

const CustomMarkdown = ({ content, dark = false }: { content: string; dark?: boolean }) => {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={dark ? oneDark : oneLight}
              language={match[1]}
              PreTag="div"
              className="rounded-lg !my-4 !bg-slate-50/50 border border-slate-200/50"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={cn("bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600", className)} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </Markdown>
  );
};

// --- Resume Template Styles ---

const ResumeTemplate = ({ content, style }: { content: string; style: TemplateType }) => {
  const getStyleClasses = () => {
    const base = "bg-white shadow-2xl min-h-[1122px] w-full max-w-[794px] mx-auto transition-all duration-300 print:shadow-none print:m-0 ";
    switch (style) {
      case 'classic':
        return base + "p-16 font-serif text-slate-800 prose-slate";
      case 'modern':
        return base + "p-16 font-sans text-slate-900 prose-indigo border-t-[12px] border-indigo-600";
      case 'minimal':
        return base + "p-20 font-sans text-slate-600 prose-slate border border-slate-100";
      case 'bold':
        return base + "p-16 font-sans text-slate-900 prose-blue border-l-[16px] border-blue-600 bg-slate-50/30";
      case 'sidebar':
        return "bg-white shadow-2xl min-h-[1122px] w-full max-w-[794px] mx-auto font-sans text-slate-800 grid grid-cols-[260px_1fr] print:shadow-none print:m-0";
      case 'compact':
        return base + "p-12 font-sans text-slate-900 prose-sm prose-slate";
      case 'elegant':
        return base + "p-16 font-serif text-[#4A4238] prose-stone border-double border-8 border-[#D4AF37] bg-[#FFFCF5]";
      case 'tech':
        return base + "p-16 font-mono text-[#C9D1D9] prose-invert prose-emerald border border-[#30363D] bg-[#0D1117]";
      case 'creative':
        return base + "p-16 font-sans text-slate-900 prose-pink border-b-[12px] border-pink-500 rounded-b-[40px]";
      case 'executive':
        return base + "p-16 font-serif text-slate-900 prose-slate border-y-4 border-slate-900";
      default:
        return base + "p-16 font-serif text-slate-800 prose-slate";
    }
  };

  if (style === 'sidebar') {
    // Split content by sections
    const sections = content.split(/\n(?=### )/);
    const header = sections[0];
    const rest = sections.slice(1);
    
    // First 3 sections to sidebar, rest to main
    const sidebarContent = header + '\n' + rest.slice(0, 3).join('\n');
    const mainContent = rest.slice(3).join('\n');
    
    return (
      <div className={getStyleClasses()}>
        <div className="bg-slate-900 text-white p-10 flex flex-col gap-8 overflow-hidden">
          <div className="markdown-body prose prose-invert prose-sm max-w-none">
            <CustomMarkdown content={sidebarContent} dark />
          </div>
        </div>
        <div className="bg-white p-10 overflow-hidden">
          <div className="markdown-body prose prose-slate prose-sm max-w-none">
            <CustomMarkdown content={mainContent} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={getStyleClasses()}>
      <div className="markdown-body prose max-w-none">
        <CustomMarkdown content={content} dark={style === 'tech'} />
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [history, setHistory] = useState<string[]>([DEFAULT_MARKDOWN]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [template, setTemplate] = useState<TemplateType>('classic');
  const [viewMode, setViewMode] = useState<'display' | 'design'>('display');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [aiToolbarPos, setAiToolbarPos] = useState({ x: 0, y: 0 });
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize sidebar as open in design mode (removed as per new design)
  useEffect(() => {
    // No-op
  }, [viewMode]);

  const updateMarkdown = (newMarkdown: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMarkdown);
    // Limit history to 50 items
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMarkdown(newMarkdown);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setMarkdown(history[prevIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setMarkdown(history[nextIndex]);
    }
  };

  const saveVersion = (name?: string) => {
    setVersions(prev => {
      const newVersion: Version = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        content: markdown,
        name: name || `版本 ${prev.length + 1}`
      };
      return [newVersion, ...prev];
    });
  };

  const restoreVersion = (version: Version) => {
    updateMarkdown(version.content);
  };

  const deleteVersion = (id: string) => {
    setVersions(versions.filter(v => v.id !== id));
  };

  // Auto-versioning logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (markdown !== versions[0]?.content && markdown !== DEFAULT_MARKDOWN) {
        saveVersion(`自动保存 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
      }
    }, 10000); // Save after 10s of idle

    return () => clearTimeout(timer);
  }, [markdown]);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    // We need to handle selection with the simple-code-editor
    // Since it uses a textarea internally, we can still use refs if we can access it
    const el = document.querySelector('.markdesign-editor textarea') as HTMLTextAreaElement;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = markdown;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    updateMarkdown(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleExport = async () => {
    if (previewRef.current) {
      const dataUrl = await toPng(previewRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = `markdesign-${template}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handlePrint = () => {
    // Try native print first
    try {
      window.focus();
      window.print();
      
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.1, x: 0.9 }
      });
    } catch (err) {
      console.error('Print failed, falling back to PDF download:', err);
      handleExportPDF();
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    
    try {
      setIsProcessing(true);
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`markdesign-${template}-${Date.now()}.pdf`);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiAction = async (instruction: string) => {
    setIsProcessing(true);
    try {
      const targetContent = selection ? selection.text : markdown;
      const optimized = await optimizeContent(targetContent, instruction);
      
      if (optimized) {
        if (selection) {
          const newMarkdown = markdown.substring(0, selection.start) + optimized + markdown.substring(selection.end);
          updateMarkdown(newMarkdown);
        } else {
          updateMarkdown(optimized);
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsProcessing(false);
      setShowAiToolbar(false);
      setSelection(null);
    }
  };

  const handleTextSelection = () => {
    const el = document.querySelector('.markdesign-editor textarea') as HTMLTextAreaElement;
    if (el && el.selectionStart !== el.selectionEnd) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value.substring(start, end);
      setSelection({ text, start, end });
      
      // Position AI toolbar near selection
      const coords = el.getBoundingClientRect();
      // We need to estimate cursor position or just show it at a fixed place
      setAiToolbarPos({ x: coords.left + 20, y: coords.top + 20 });
      setShowAiToolbar(true);
    } else {
      setShowAiToolbar(false);
    }
  };

  const renderTemplate = () => {
    return <ResumeTemplate content={markdown} style={template} />;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-indigo-100 flex flex-col">
      {/* Unified Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[60] pointer-events-none">
        <div className="w-full flex items-center justify-center p-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-1 bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl p-1.5 pointer-events-auto"
          >
            <AnimatePresence mode="wait">
              {viewMode === 'design' && (
                <motion.div 
                  key="design-tools"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-1"
                >
                  <div className="flex items-center gap-0.5 px-1 border-r border-slate-100">
                    <button onClick={() => insertMarkdown('# ')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all" title="标题1"><Heading1 size={16} /></button>
                    <button onClick={() => insertMarkdown('## ')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all" title="标题2"><Heading2 size={16} /></button>
                    <button onClick={() => insertMarkdown('**', '**')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all" title="加粗"><Bold size={16} /></button>
                    <button onClick={() => insertMarkdown('*', '*')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all" title="斜体"><Italic size={16} /></button>
                    <button onClick={() => insertMarkdown('- ')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all" title="无序列表"><List size={16} /></button>
                    <button onClick={() => insertMarkdown('1. ')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all" title="有序列表"><ListOrdered size={16} /></button>
                  </div>

                  <div className="flex items-center gap-1 pl-1">
                    <div className="relative">
                      <button 
                        onClick={() => setShowAiMenu(!showAiMenu)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          showAiMenu ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        )}
                        title="AI 优化"
                      >
                        <Wand2 size={16} />
                      </button>
                      <AnimatePresence>
                        {showAiMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 15 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 w-48 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[70]"
                          >
                            <button 
                              onClick={() => { handleAiAction("Optimize the overall formatting and structure of this resume to follow industry best practices."); setShowAiMenu(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                              <Layout size={14} className="text-indigo-500" />
                              格式优化
                            </button>
                            <button 
                              onClick={() => { handleAiAction("Rewrite the entire resume with more professional wording, focusing on achievements and impact."); setShowAiMenu(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                              <Sparkles size={14} className="text-amber-500" />
                              话术优化
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          showHistoryDropdown ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        )}
                        title="历史记录"
                      >
                        <History size={16} />
                      </button>
                      <AnimatePresence>
                        {showHistoryDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 15 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full right-0 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[70] max-h-96 overflow-y-auto"
                          >
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-2">版本历史</div>
                            {versions.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">暂无记录</div>
                            ) : (
                              versions.map((v) => (
                                <div key={v.id} className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{v.name}</span>
                                    <span className="text-[9px] text-slate-400">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <button onClick={() => { restoreVersion(v); setShowHistoryDropdown(false); }} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                    <RotateCcw size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="w-px h-4 bg-slate-100 mx-1" />

                    <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-100">
                      <button onClick={undo} disabled={historyIndex === 0} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 disabled:opacity-30 transition-all" title="撤销"><RotateCcw size={16} /></button>
                      <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 disabled:opacity-30 transition-all rotate-180" title="重做"><RotateCcw size={16} /></button>
                    </div>

                    <button 
                      onClick={() => setViewMode('display')}
                      className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                      title="保存并预览"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Absolute Top Right Actions */}
        <AnimatePresence>
          {viewMode === 'display' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute top-4 right-4 z-[9999] pointer-events-auto"
            >
              <div className="flex items-center gap-2 p-1 transition-all opacity-40 hover:opacity-100">
                <button 
                  onClick={handleExportPDF}
                  className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white/50 hover:bg-white backdrop-blur-sm hover:shadow-xl border border-white/20 hover:border-slate-100 rounded-xl transition-all active:scale-95"
                  title="下载 PDF"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => setShowStylePanel(true)}
                  className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white/50 hover:bg-white backdrop-blur-sm hover:shadow-xl border border-white/20 hover:border-slate-100 rounded-xl transition-all active:scale-95"
                  title="风格选择"
                >
                  <Palette size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Style Switcher Overlay (Removed in favor of top bar integration) */}

      {/* Floating Action Button */}
      <div className="fixed bottom-12 right-12 z-[100]">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setViewMode(viewMode === 'display' ? 'design' : 'display')}
          className={cn(
            "w-14 h-14 shadow-[0_12px_40px_rgba(79,70,229,0.4)] rounded-full flex items-center justify-center transition-all z-[110] relative",
            viewMode === 'design' ? "bg-slate-900 text-white" : "bg-indigo-600 text-white"
          )}
        >
          {viewMode === 'design' ? <Eye size={24} /> : <PenTool size={24} />}
        </motion.button>
      </div>

      {/* Style Selection Panel (Slide-out from right) */}
      <AnimatePresence>
        {showStylePanel && (
          <>
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[130] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">风格选择</h3>
                  <p className="text-xs text-slate-400">选择最适合您的简历模板</p>
                </div>
                <button 
                  onClick={() => setShowStylePanel(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id as TemplateType)}
                      className={cn(
                        "group relative flex flex-col gap-1.5 transition-all text-left",
                        template === t.id ? "scale-[1.02]" : "hover:scale-[1.01]"
                      )}
                    >
                      <div className={cn(
                        "w-full aspect-[3/4.2] rounded-lg overflow-hidden border transition-all shadow-sm group-hover:shadow-md relative bg-slate-50",
                        template === t.id ? "border-indigo-600 ring-2 ring-indigo-50" : "border-slate-100"
                      )}>
                        {/* CSS-based Template Preview */}
                        <div className="absolute inset-0 p-2 flex flex-col gap-1 origin-top-left scale-[0.25] w-[400%] h-[400%] pointer-events-none">
                          {t.id === 'sidebar' ? (
                            <div className="flex h-full gap-2">
                              <div className="w-1/3 bg-slate-800 rounded-lg" />
                              <div className="flex-1 flex flex-col gap-2">
                                <div className="h-6 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-full" />
                                <div className="h-3 bg-slate-100 rounded w-5/6" />
                                <div className="mt-2 h-4 bg-slate-200 rounded w-1/2" />
                                <div className="h-3 bg-slate-100 rounded w-full" />
                              </div>
                            </div>
                          ) : (
                            <div className={cn(
                              "flex flex-col gap-3 h-full p-6 bg-white rounded-lg shadow-inner",
                              t.id === 'tech' && "bg-[#0D1117]",
                              t.id === 'elegant' && "bg-[#FFFCF5] border-2 border-[#D4AF37]",
                              t.id === 'modern' && "border-t-[8px] border-indigo-600",
                              t.id === 'bold' && "border-l-[10px] border-blue-600",
                              t.id === 'creative' && "border-b-[8px] border-pink-500 rounded-b-[30px]",
                              t.id === 'executive' && "border-y-2 border-slate-900"
                            )}>
                              <div className={cn("h-8 bg-slate-200 rounded w-1/2", t.id === 'tech' && "bg-emerald-500/20", t.id === 'elegant' && "bg-[#4A4238]/20")} />
                              <div className="h-3 bg-slate-100 rounded w-3/4" />
                              <div className="mt-2 h-0.5 bg-slate-100 w-full" />
                              <div className="mt-2 h-6 bg-slate-200 rounded w-1/3" />
                              <div className="space-y-1">
                                <div className="h-3 bg-slate-100 rounded w-full" />
                                <div className="h-3 bg-slate-100 rounded w-5/6" />
                              </div>
                            </div>
                          )}
                        </div>

                        {template === t.id && (
                          <div className="absolute inset-0 bg-indigo-600/5 flex items-center justify-center">
                            <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                              <Check size={12} />
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold transition-colors truncate px-1",
                        template === t.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"
                      )}>
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'design' ? (
            <motion.div 
              key="design-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white flex flex-col overflow-y-auto no-scrollbar"
            >
              {/* Editor Area */}
              <div className="flex-1 flex justify-center py-32">
                <div className="w-full max-w-3xl px-6 flex flex-col min-h-screen">
                  <div className="flex-1 markdesign-editor">
                    <Editor
                      value={markdown}
                      onValueChange={code => setMarkdown(code)}
                      onBlur={() => { if (markdown !== history[historyIndex]) updateMarkdown(markdown); }}
                      onKeyUp={handleTextSelection}
                      onMouseUp={handleTextSelection}
                      highlight={code => Prism.highlight(code, Prism.languages.markdown, 'markdown')}
                      padding={0}
                      className="min-h-full font-mono text-lg leading-relaxed text-slate-700"
                      style={{ 
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
                        textAlign: 'left'
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="display-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 pt-24 pb-48 px-6 flex justify-center overflow-y-auto"
            >
              <div className="w-full max-w-5xl flex flex-col items-center">
                <div className="w-full flex justify-center" ref={previewRef}>
                  {renderTemplate()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating AI Toolbar (Only in Design Mode) */}
        <AnimatePresence>
          {viewMode === 'design' && showAiToolbar && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              style={{ left: aiToolbarPos.x, top: aiToolbarPos.y }}
              className="fixed z-[100] bg-white shadow-2xl rounded-2xl border border-slate-200 p-1 flex gap-1 items-center"
            >
              <button 
                onClick={() => handleAiAction("Optimize the formatting of this resume section for better readability and structure.")}
                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
              >
                <Layout size={14} /> 格式优化
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button 
                onClick={() => handleAiAction("Optimize the wording of this resume content to be more professional, impactful, and action-oriented.")}
                className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
              >
                <Wand2 size={14} /> 话术优化
              </button>
              <button 
                onClick={() => handleAiAction("Translate this resume content to English professionally.")}
                className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
              >
                <Languages size={14} /> 英文翻译
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/90 z-[100] flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full"
              />
              <Sparkles className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold tracking-tight">AI is designing...</h3>
              <p className="text-slate-500 text-sm">Optimizing your content for the best visual impact.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
