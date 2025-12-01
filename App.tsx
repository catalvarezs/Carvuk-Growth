import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { ChatInterface } from './components/ChatInterface';
import { parseExcelFile } from './utils/excelParser';
import { generateDataAnalysis } from './services/geminiService';
import { ExcelData, ChatMessage, AppState } from './types';
import { Table, MessageSquare, ArrowLeft, FileText, Menu, Github, X, BarChart } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'chat'>('chat');
  const [showCredits, setShowCredits] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await parseExcelFile(file);
      setExcelData(data);
      setAppState(AppState.ANALYSIS);
      
      // Calculate total stats
      const totalSheets = data.sheets.length;
      const sheetNames = data.sheets.map(s => s.sheetName).join(', ');
      
      // Add initial greeting
      setMessages([{
        id: 'init',
        role: 'model',
        content: `Hi! I've analyzed **${data.fileName}**. \n\nI found **${totalSheets} sheets**: ${sheetNames}. \n\nYou can ask me to analyze data from a specific sheet or cross-reference data between them (e.g., "Join data from Sheet A and Sheet B").`,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error("Parse Error", error);
      alert("Failed to parse Excel file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!excelData) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
        // Prepare chat history for API
        const history = messages.map(m => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const responseText = await generateDataAnalysis(text, excelData, history);

        const newAiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText || "I couldn't generate a response.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, newAiMsg]);

    } catch (error) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            content: "Sorry, I encountered an error analyzing your request. Please try again.",
            timestamp: Date.now()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  const resetApp = () => {
    setAppState(AppState.UPLOAD);
    setExcelData(null);
    setMessages([]);
    setActiveTab('chat');
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden relative font-inter">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-md shadow-indigo-200">
                <FileText className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ExcelChat <span className="text-indigo-600">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowCredits(true)}
                className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block"
            >
                Developed by Catalina
            </button>

            {appState === AppState.ANALYSIS && (
                <button 
                onClick={resetApp}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
                >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Upload New</span>
                </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 relative w-full max-w-7xl mx-auto">
        
        {appState === AppState.UPLOAD ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in custom-scrollbar">
             <div className="flex flex-col items-center justify-center min-h-[85%]">
                <div className="text-center mb-12 max-w-2xl px-4">
                    <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        Chat with your <span className="text-indigo-600">Spreadsheet</span>
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Instant analysis for your Excel files. Calculate CAC, ROAS, and visualize trends effortlessly with Gemini AI.
                    </p>
                </div>
                
                <FileUpload onFileSelect={handleFileSelect} isLoading={isProcessing} />
                
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full text-center px-4 pb-10">
                    <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">1. Upload Excel</h3>
                        <p className="text-slate-500">Securely drag & drop your .xlsx or .xls files.</p>
                    </div>
                    <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <MessageSquare size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">2. Ask Questions</h3>
                        <p className="text-slate-500">Analyze metrics like CAC, ROAS, or AOV.</p>
                    </div>
                    <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <BarChart size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3">3. Visualize Data</h3>
                        <p className="text-slate-500">Auto-generate charts and visual insights.</p>
                    </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden p-3 md:p-6 gap-6 animate-fade-in">
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 shrink-0 mb-2">
                <button 
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'data' 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Table size={16} />
                        <span>Data View</span>
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'chat' 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <MessageSquare size={16} />
                        <span>Analysis</span>
                    </div>
                </button>
            </div>

            {/* Data Panel */}
            <div className={`
                flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300
                ${activeTab === 'data' ? 'h-full opacity-100' : 'hidden md:flex md:h-full md:opacity-100'}
            `}>
               {excelData && <DataTable data={excelData} />}
            </div>

            {/* Chat Panel */}
            <div className={`
                w-full md:w-[450px] lg:w-[500px] flex flex-col min-h-0 transition-all duration-300
                ${activeTab === 'chat' ? 'h-full opacity-100' : 'hidden md:flex md:h-full md:opacity-100'}
            `}>
               <ChatInterface 
                  messages={messages} 
                  onSendMessage={handleSendMessage}
                  isTyping={isTyping}
               />
            </div>
          </div>
        )}
      </main>

      {/* Credits Modal */}
      {showCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                <div className="p-4 flex justify-end">
                    <button 
                        onClick={() => setShowCredits(false)} 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="px-8 pb-10 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-200 transform -rotate-3">
                         <span className="text-2xl font-bold">CA</span>
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Prueba Técnica</h4>
                    <p className="text-lg font-semibold text-indigo-600 mb-4">Growth Engineer</p>
                    <div className="h-px w-16 bg-slate-200 mb-4"></div>
                    <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-wide">Developed for Carvuk</p>
                    
                    <a 
                        href="https://github.com/catalvarezs" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all transform hover:-translate-y-1 shadow-lg w-full justify-center group"
                    >
                        <Github size={20} className="text-slate-400 group-hover:text-white transition-colors"/>
                        <span className="font-semibold">github.com/catalvarezs</span>
                    </a>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;