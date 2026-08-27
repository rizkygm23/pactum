/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { Loader2, Send, Wallet, ShieldCheck, Plus, MessageCircle, Menu, X } from "lucide-react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "ai" | "error";
  text: string;
  meta?: { billedAmount: string };
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface Transaction {
  id: string;
  endpoint: string;
  cost: number;
  status: string;
  created_at: string;
  idempotency_key: string;
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextSuggestion, setContextSuggestion] = useState<{text: string, id: number} | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    if (!jwt) return;
    try {
      const res = await fetch("/api/conversations", {
        headers: { "Authorization": `Bearer ${jwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error(e);
    }
  }, [jwt]);

  useEffect(() => {
    if (jwt) fetchConversations();
  }, [jwt, fetchConversations]);

  const fetchHistory = useCallback(async () => {
    if (!jwt) return;
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/history", {
        headers: { "Authorization": `Bearer ${jwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, [jwt]);

  useEffect(() => {
    if (isHistoryModalOpen && jwt) {
      fetchHistory();
    }
  }, [isHistoryModalOpen, jwt, fetchHistory]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const loadConversation = async (id: string) => {
    if (!jwt) return;
    setActiveConversationId(id);
    setSidebarOpen(false);
    setMessages([]);
    setContextSuggestion(null);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { "Authorization": `Bearer ${jwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          text: m.content
        })));
        fetchContextSuggestion(id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setContextSuggestion(null);
    setSidebarOpen(false);
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast.error("Please install MetaMask to continue.");
      return;
    }

    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const nonceRes = await fetch("/api/nonce");
      const { nonce } = await nonceRes.json();

      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = "Sign this message to prove you own this wallet and authorize micro-payments to Auto via Pactum.";
      const message = `${domain} wants you to sign in with your Ethereum account:\n${userAddress}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

      const signature = await signer.signMessage(message);

      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed");

      const { token, address: verifiedAddress } = await verifyRes.json();
      setJwt(token);
      setAddress(verifiedAddress);
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Verification failed! Make sure to sign the SIWE message.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setJwt(null);
    setAddress(null);
    setConversations([]);
    setMessages([]);
    setContextSuggestion(null);
    setActiveConversationId(null);
  };

  const fetchContextSuggestion = async (convoId: string) => {
    if (!jwt) return;
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({ conversationId: convoId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          setContextSuggestion({ text: data.suggestion, id: Date.now() });
        }
      } else {
        console.warn("Suggest API failed:", await res.text());
      }
    } catch (e) {
      console.error("Failed to fetch context suggestion:", e);
    }
  };

  const submitChat = async (e?: React.FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const currentPrompt = (overridePrompt || prompt).trim();
    if (!currentPrompt || !address || !jwt) return;

    setMessages(prev => [...prev, { role: "user", text: currentPrompt }]);
    if (!overridePrompt) {
      setPrompt("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({ 
          prompt: currentPrompt,
          conversationId: activeConversationId 
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setMessages(prev => [...prev, { role: "error", text: data.error }]);
      } else if (!res.ok) {
        setMessages(prev => [...prev, { role: "error", text: "System error occurred. Please try again later." }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.text, meta: { billedAmount: data.billedAmount } }]);
        const convoId = data.conversationId || activeConversationId;
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }
        if (convoId) fetchContextSuggestion(convoId);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "error", text: "Connection lost. Ensure the AI server is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#050505] relative selection:bg-white/10">
      {/* Radial Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[140px]" />
      </div>

      {/* Sidebar (Desktop) */}
      {address && (
        <aside className="hidden md:flex w-72 flex-col shrink-0 z-10 p-4">
          <div className="flex flex-col h-full bg-white/5 backdrop-blur-2xl rounded-[2rem] ring-1 ring-white/10 p-2 shadow-2xl">
            <div className="p-2 mb-2">
              <button 
                onClick={startNewChat}
                className="w-full group flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white/90 py-3 rounded-[1.5rem] transition-all duration-500 active:scale-[0.98]"
              >
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium tracking-wide">New Chat</span>
              </button>
            </div>
            <div className="px-2 mb-2">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="w-full group flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/10 text-emerald-400 py-3 rounded-[1.5rem] transition-all duration-500 active:scale-[0.98]"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium tracking-wide">Transaction History</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1.5 scrollbar-hide">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[1.25rem] text-[13px] transition-all duration-500 text-left group ${
                    activeConversationId === c.id 
                      ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={1.5} />
                  <span className="truncate flex-1 tracking-wide">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Sidebar (Mobile Overlay) */}
      {address && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl transition-opacity duration-700" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex w-[85vw] max-w-[320px] flex-col h-full bg-[#050505] ring-1 ring-white/10 shadow-2xl animate-in slide-in-from-left duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <span className="font-semibold text-white tracking-wide">History</span>
              <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-white/5">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <button 
                onClick={startNewChat}
                className="w-full group flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white py-3.5 rounded-[1.5rem] transition-all duration-500 active:scale-[0.98]"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium tracking-wide">New Chat</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setIsHistoryModalOpen(true);
                }}
                className="w-full group flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/10 text-emerald-400 py-3.5 rounded-[1.5rem] transition-all duration-500 active:scale-[0.98]"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium tracking-wide">Transaction History</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.25rem] text-[13px] transition-all duration-500 text-left ${
                    activeConversationId === c.id 
                      ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                      : "text-white/50 hover:bg-white/5 hover:text-white/90"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0 opacity-70" strokeWidth={1.5} />
                  <span className="truncate flex-1 tracking-wide">{c.title}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        <header className="flex items-center justify-between px-6 py-5 shrink-0">
          <div className="flex items-center gap-4">
            {address && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden mr-1 w-10 h-10 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors active:scale-[0.98]"
              >
                <Menu className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
            <div className="relative group">
              <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-700 rounded-full" />
              <img src="/aura-logo.png" alt="Auto Logo" className="w-10 h-10 rounded-xl ring-1 ring-white/10 object-cover bg-black relative z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-medium tracking-tight text-white font-[family-name:var(--font-fraunces)] leading-tight">Auto</h1>
              <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-white/50">by</span>
                <img src="/pactum-logo.png" alt="Pactum" className="w-3.5 h-3.5 object-cover rounded-sm ring-1 ring-white/10" />
                <span className="text-[11px] font-medium tracking-wide leading-none">Pactum</span>
              </div>
            </div>
          </div>
          
          <div>
            <button 
              onClick={!address ? connectWallet : disconnectWallet}
              disabled={connecting}
              className={`group flex items-center gap-2.5 text-[13px] tracking-wide font-medium px-5 py-2.5 rounded-full transition-all duration-500 active:scale-[0.98] ${
                address 
                  ? "bg-white/5 hover:bg-red-500/10 ring-1 ring-white/10 hover:ring-red-500/30 text-white/80 hover:text-red-400" 
                  : "bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
              }`}
              title={address ? "Disconnect Wallet" : "Connect Wallet"}
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : address ? (
                <ShieldCheck className="w-3.5 h-3.5 group-hover:hidden opacity-70" strokeWidth={1.5} />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center -ml-2 group-hover:scale-105 transition-transform duration-500">
                  <Wallet className="w-3 h-3" strokeWidth={1.5} />
                </div>
              )}
              {address && <X className="w-3.5 h-3.5 hidden group-hover:block" strokeWidth={1.5} />}
              <span className="hidden sm:inline">
                {connecting ? "Verifying..." : address ? <><span className="group-hover:hidden">{address.slice(0,6)}...{address.slice(-4)}</span><span className="hidden group-hover:inline">Disconnect</span></> : "Connect Wallet"}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full flex flex-col overflow-y-auto scrollbar-hide relative animate-in fade-in duration-1000">
          <div className="max-w-4xl w-full mx-auto p-4 flex-1 flex flex-col">
            {!address ? (
              <div className="flex flex-col items-center justify-center h-full flex-1">
                <div className="w-24 h-24 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse" />
                  <Wallet className="w-8 h-8 text-white/30 relative z-10" strokeWidth={1} />
                </div>
                <h2 className="text-2xl font-medium tracking-tight text-white mb-2">Wallet Required</h2>
                <p className="text-white/40 text-center text-sm">Connect your wallet to start chatting with Auto.</p>
              </div>
            ) : messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full flex-1 max-w-2xl mx-auto w-full px-4 pt-10 pb-20">
                <div className="relative group mb-8">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <img src="/aura-logo.png" className="w-20 h-20 rounded-2xl ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative z-10 object-cover bg-black" alt="" />
                </div>
                <h2 className="text-3xl font-medium tracking-tight text-white mb-3">Welcome to Auto</h2>
                <p className="text-white/40 text-center max-w-md mb-12 text-[15px] leading-relaxed">
                  Ask me anything about the Arc Testnet or Pactum ecosystem. Every message is metered via state channels.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {(contextSuggestion ? [
                    contextSuggestion.text,
                    "How do state channels reduce gas fees?",
                    "Is every API call recorded on Arc?",
                    "How does batch settlement work in Pactum?"
                  ] : [
                    "How does Pactum handle micropayments?",
                    "How do state channels reduce gas fees?",
                    "Is every API call recorded on Arc?",
                    "How does batch settlement work in Pactum?"
                  ]).map((suggestion, idx) => (
                    <button
                      key={idx === 0 && contextSuggestion ? contextSuggestion.id : suggestion}
                      onClick={() => submitChat(undefined, suggestion)}
                      className={`group relative overflow-hidden bg-white/5 hover:bg-white/10 ring-1 hover:ring-white/20 text-left px-5 py-4 rounded-[1.5rem] text-[13px] text-white/80 transition-all duration-500 flex items-center justify-between active:scale-[0.98] ${
                        idx === 0 && contextSuggestion ? "ring-white/15 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]" : "ring-white/5"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                      <span className="truncate pr-4 relative z-10">{suggestion}</span>
                      <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10 shrink-0">
                        <MessageCircle className={`w-3.5 h-3.5 ${
                          idx === 0 && contextSuggestion ? "text-emerald-400" : "text-white/50 group-hover:text-white"
                        }`} strokeWidth={1.5} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-8 w-full mt-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] sm:max-w-[75%] bg-white text-[#050505] rounded-[1.5rem] rounded-br-sm px-6 py-4 shadow-xl">
                        <p className="leading-relaxed text-[15px] font-medium tracking-tight">{msg.text}</p>
                      </div>
                    ) : msg.role === 'error' ? (
                      <div className="max-w-[85%] sm:max-w-[75%] bg-red-950/20 text-red-400 ring-1 ring-red-900/30 rounded-[1.5rem] rounded-bl-sm px-6 py-5 flex gap-4 items-start shadow-xl backdrop-blur-xl">
                        <div className="mt-0.5 w-6 h-6 rounded-full bg-red-900/20 flex items-center justify-center shrink-0">⚠️</div>
                        <div>
                          <p className="font-semibold tracking-tight text-[15px] mb-1 text-red-300">Processing Failed</p>
                          <p className="text-[14px] opacity-80 leading-relaxed font-light">{msg.text}</p>
                          <div className="mt-4">
                            <a href="https://pactum-ruddy.vercel.app/wallet" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-300 px-4 py-2 rounded-full ring-1 ring-red-500/20 transition-all duration-300">
                              Deposit to Pactum Wallet <span className="text-red-400/50">↗</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[90%] sm:max-w-[80%]">
                        <div className="p-1 rounded-[1.75rem] rounded-bl-sm ring-1 ring-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-3xl">
                          <div className="bg-white/5 rounded-[calc(1.75rem-4px)] rounded-bl-none px-6 py-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-white/90">
                            <ReactMarkdown
                              components={{
                                p: ({children}) => <p className="leading-relaxed text-[15px] font-light mb-4 last:mb-0 tracking-wide">{children}</p>,
                                strong: ({children}) => <strong className="font-semibold text-white tracking-normal">{children}</strong>,
                                code: ({className, children, ...props}: any) => {
                                  const match = /language-(\w+)/.exec(className || "");
                                  return match ? (
                                    <div className="my-4 p-1 rounded-xl bg-black/60 ring-1 ring-white/5"><pre className="p-4 rounded-lg overflow-x-auto text-[13px] text-white/80 font-mono tracking-tight"><code className={className} {...props}>{children}</code></pre></div>
                                  ) : (
                                    <code className="bg-white/10 px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono tracking-tight" {...props}>{children}</code>
                                  );
                                },
                                pre: ({children}) => <>{children}</>,
                                ul: ({children}) => <ul className="list-disc pl-5 mb-4 text-[15px] font-light tracking-wide space-y-1">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal pl-5 mb-4 text-[15px] font-light tracking-wide space-y-1">{children}</ol>,
                                li: ({children}) => <li>{children}</li>
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                            {msg.meta && (
                              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 uppercase tracking-[0.15em]">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <ShieldCheck className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} /> Pactum Billed
                                </span>
                                <span className="font-mono text-[10px] tracking-widest">{msg.meta.billedAmount} USDC</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} className="h-4" />
              </div>
            )}
          </div>
        </main>

        <div className="px-4 pb-6 pt-2 shrink-0 relative z-20">
          <div className="max-w-4xl mx-auto relative flex flex-col gap-4">
            {address && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {(contextSuggestion ? [
                  contextSuggestion.text,
                  "How do state channels reduce gas fees?",
                  "Is every API call recorded on Arc?",
                  "How does batch settlement work in Pactum?"
                ] : [
                  "How does Pactum handle micropayments?",
                  "How do state channels reduce gas fees?",
                  "Is every API call recorded on Arc?",
                  "How does batch settlement work in Pactum?"
                ]).map((suggestion, idx) => (
                  <button
                    key={idx === 0 && contextSuggestion ? contextSuggestion.id : suggestion}
                    onClick={() => submitChat(undefined, suggestion)}
                    className={`whitespace-nowrap shrink-0 px-4 py-2 rounded-full text-[12px] tracking-wide font-medium transition-all duration-500 active:scale-95 ${
                      idx === 0 && contextSuggestion ? "bg-white/10 ring-1 ring-white/20 text-white animate-in fade-in slide-in-from-right-8 duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]" : "bg-white/5 hover:bg-white/10 ring-1 ring-white/5 hover:ring-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={submitChat} className="flex items-end gap-3 p-1.5 rounded-[2.5rem] ring-1 ring-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-3xl focus-within:ring-white/20 transition-all duration-700">
              <div className="relative flex-1 bg-black/40 rounded-[calc(2.5rem-6px)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all overflow-hidden flex">
                <textarea 
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitChat();
                    }
                  }}
                  rows={1}
                  placeholder={address ? "Ask Auto anything..." : "Connect wallet to type..."}
                  disabled={!address || loading}
                  className="w-full bg-transparent text-white placeholder-white/30 px-6 py-4 focus:outline-none resize-none scrollbar-hide text-[15px] tracking-wide"
                  style={{ minHeight: "56px", maxHeight: "200px" }}
                />
              </div>
              <button 
                type="submit" 
                disabled={!address || !prompt.trim() || loading}
                className="group relative h-14 px-6 rounded-full bg-white hover:bg-[#e0e0e0] disabled:bg-white/5 disabled:text-white/20 text-black flex items-center justify-center transition-all duration-500 active:scale-95 flex-shrink-0 font-medium tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <span className={`mr-2 hidden sm:block ${(!address || !prompt.trim() || loading) ? 'opacity-50' : ''}`}>Send</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-500 ${(!address || !prompt.trim() || loading) ? 'bg-transparent text-white/30' : 'bg-black/10 text-black group-hover:bg-black/20'}`}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 translate-x-px translate-y-px group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-500" strokeWidth={2} />}
                </div>
              </button>
            </form>
            <div className="text-center text-[10px] uppercase tracking-[0.2em] font-semibold text-white/30 mt-2">
              Powered by <span className="text-white/70">Pactum State Channel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl transition-opacity duration-700" onClick={() => setIsHistoryModalOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0a0a0a] ring-1 ring-white/10 shadow-2xl rounded-[2rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-white tracking-wide leading-tight">Transaction History</h2>
                  <p className="text-xs text-white/40 tracking-wide mt-0.5">Off-chain and on-chain records</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-white/50 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-white/30 animate-spin mb-4" />
                  <p className="text-sm text-white/40">Loading history...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                    <ShieldCheck className="w-8 h-8 text-white/20" strokeWidth={1} />
                  </div>
                  <p className="text-white/60 font-medium">No transactions found</p>
                  <p className="text-xs text-white/40 mt-1">Start chatting to see your usage.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[1.25rem] bg-white/[0.02] ring-1 ring-white/5 hover:ring-white/10 transition-colors">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          tx.status === 'settled' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          <Wallet className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white/90">AI Chat Usage</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                              tx.status === 'settled' ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                            }`}>
                              {tx.status === 'settled' ? 'On-Chain' : 'Off-Chain'}
                            </span>
                          </div>
                          <div className="text-xs text-white/40 mt-1 font-mono tracking-tight">
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center mt-2 sm:mt-0 pl-11 sm:pl-0">
                        <span className="text-sm font-mono font-medium text-white">{Number(tx.cost).toFixed(6)} USDC</span>
                        <span className="text-[10px] text-white/30 font-mono" title={tx.idempotency_key}>ID: {tx.idempotency_key.substring(0, 12)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
