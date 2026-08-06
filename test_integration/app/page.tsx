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

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
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
      const statement = "Sign this message to prove you own this wallet and authorize micro-payments to Aura AI via Pactum.";
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
    setActiveConversationId(null);
  };

  const submitChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || !address || !jwt) return;

    const currentPrompt = prompt.trim();
    setMessages(prev => [...prev, { role: "user", text: currentPrompt }]);
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "error", text: "Connection lost. Ensure the AI server is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ink-navy">
      {/* Sidebar (Desktop) */}
      {address && (
        <aside className="hidden md:flex w-64 flex-col border-r border-border-subtle bg-graphite/50 shrink-0">
          <div className="p-4">
            <button 
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 bg-ink-navy hover:bg-ink-navy/80 border border-border-subtle text-parchment py-2.5 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Chat</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors text-left ${
                  activeConversationId === c.id 
                    ? "bg-brass/10 text-brass border border-brass/20" 
                    : "text-[#8B8FA0] hover:bg-ink-navy hover:text-parchment border border-transparent"
                }`}
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Sidebar (Mobile Overlay) */}
      {address && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex w-[260px] max-w-[85vw] flex-col bg-graphite border-r border-border-subtle h-full shadow-2xl">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <span className="font-semibold text-parchment">History</span>
              <button onClick={() => setSidebarOpen(false)} className="text-[#8B8FA0] hover:text-parchment">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 bg-ink-navy hover:bg-ink-navy/80 border border-border-subtle text-parchment py-2.5 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New Chat</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors text-left ${
                    activeConversationId === c.id 
                      ? "bg-brass/10 text-brass border border-brass/20" 
                      : "text-[#8B8FA0] hover:bg-ink-navy hover:text-parchment border border-transparent"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border-subtle bg-ink-navy/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            {address && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden mr-1 text-[#8B8FA0] hover:text-parchment transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <img src="/aura-logo.png" alt="Aura AI Logo" className="w-9 h-9 rounded-md border border-border-subtle object-cover bg-graphite" />
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold tracking-tight text-parchment font-[family-name:var(--font-fraunces)] leading-tight">Aura AI</h1>
              <div className="flex items-center gap-1.5 mt-0.5 opacity-70">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[#8B8FA0]">by</span>
                <img src="/pactum-logo.png" alt="Pactum" className="w-3 h-3 object-cover rounded-sm" />
                <span className="text-[11px] font-medium tracking-wide leading-none">Pactum</span>
              </div>
            </div>
          </div>
          
          <div>
            <button 
              onClick={!address ? connectWallet : disconnectWallet}
              disabled={connecting}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border transition-all duration-200 shadow-sm ${
                address 
                  ? "bg-graphite hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 border-border-subtle text-parchment group" 
                  : "bg-graphite hover:bg-[#252F45] text-parchment border-border-subtle"
              }`}
              title={address ? "Disconnect Wallet" : "Connect Wallet"}
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : address ? (
                <ShieldCheck className="w-4 h-4 group-hover:hidden" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              {address && <X className="w-4 h-4 hidden group-hover:block" />}
              <span className="hidden sm:inline">
                {connecting ? "Verifying..." : address ? <><span className="group-hover:hidden">{address.slice(0,6)}...{address.slice(-4)}</span><span className="hidden group-hover:inline">Disconnect</span></> : "Connect Wallet"}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full flex flex-col overflow-y-auto scrollbar-hide relative">
          <div className="max-w-4xl w-full mx-auto p-4 flex-1 flex flex-col">
            {!address ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50 flex-1">
                <Wallet className="w-16 h-16 mb-4 text-[#8B8FA0]" />
                <p className="text-[#8B8FA0] text-center">Connect your wallet to start chatting with Aura AI.</p>
              </div>
            ) : messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full opacity-50 flex-1">
                <img src="/aura-logo.png" className="w-16 h-16 mb-6 opacity-30 grayscale" alt="" />
                <p className="text-[#8B8FA0] text-center max-w-sm">Start a conversation. Every message is metered via Pactum State Channels.</p>
              </div>
            ) : (
              <div className="space-y-6 pb-4 w-full mt-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] sm:max-w-[80%] bg-graphite text-parchment border border-border-subtle rounded-md px-4 sm:px-5 py-3 shadow-sm">
                        <p className="leading-relaxed text-[15px]">{msg.text}</p>
                      </div>
                    ) : msg.role === 'error' ? (
                      <div className="max-w-[85%] sm:max-w-[80%] bg-red-900/10 text-red-400 border border-red-900/30 rounded-md px-4 sm:px-5 py-3 flex gap-3 items-start">
                        <div className="mt-0.5">⚠️</div>
                        <div>
                          <p className="font-medium text-[15px] mb-1">Processing Failed</p>
                          <p className="text-sm opacity-90 leading-relaxed">{msg.text}</p>
                          <div className="mt-3">
                            <a href="https://pactum-ruddy.vercel.app/wallet" target="_blank" rel="noreferrer" className="inline-block text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                              Deposit to Pactum Wallet ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%] sm:max-w-[80%] bg-ink-navy text-parchment border border-border-subtle rounded-md px-4 sm:px-5 py-3 shadow-sm">
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p className="leading-relaxed text-[15px] mb-3 last:mb-0">{children}</p>,
                            strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                            code: ({className, children, ...props}: any) => {
                              const match = /language-(\w+)/.exec(className || "");
                              return match ? (
                                <div className="my-3"><pre className="bg-[#0D1117] p-3 rounded overflow-x-auto border border-border-subtle text-sm"><code className={className} {...props}>{children}</code></pre></div>
                              ) : (
                                <code className="bg-graphite px-1.5 py-0.5 rounded text-[13px]" {...props}>{children}</code>
                              );
                            },
                            pre: ({children}) => <>{children}</>,
                            ul: ({children}) => <ul className="list-disc pl-5 mb-3 text-[15px]">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal pl-5 mb-3 text-[15px]">{children}</ol>,
                            li: ({children}) => <li className="mb-1">{children}</li>
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                        {msg.meta && (
                          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-[#8B8FA0]">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-brass" /> Pactum Billed
                            </span>
                            <span className="font-mono">{msg.meta.billedAmount} USDC</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </main>

        <div className="p-4 border-t border-border-subtle bg-ink-navy shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={submitChat} className="flex items-end gap-2">
              <div className="relative flex-1 bg-graphite border border-border-subtle rounded-md shadow-sm focus-within:border-brass focus-within:ring-1 focus-within:ring-brass transition-all">
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
                  placeholder={address ? "Ask Aura AI anything..." : "Connect wallet to type..."}
                  disabled={!address || loading}
                  className="w-full bg-transparent text-parchment placeholder-[#8B8FA0] px-4 py-3 focus:outline-none resize-none scrollbar-hide"
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                />
              </div>
              <button 
                type="submit" 
                disabled={!address || !prompt.trim() || loading}
                className="bg-parchment hover:bg-[#D9D2C3] disabled:bg-graphite disabled:text-[#8B8FA0] text-ink-navy rounded-md w-12 h-12 flex items-center justify-center transition-colors flex-shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
            <div className="text-center mt-3 text-xs text-[#8B8FA0]">
              Per-token micro-payments powered by <span className="font-medium text-parchment">Pactum State Channel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
