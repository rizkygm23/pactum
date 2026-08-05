"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { Loader2, Send, Wallet, MessageSquare, ShieldCheck } from "lucide-react";

interface Message {
  role: "user" | "ai" | "error";
  text: string;
  meta?: { billedAmount: string };
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask to continue.");
      return;
    }

    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // 1. Get Nonce
      const nonceRes = await fetch("/api/nonce");
      const { nonce } = await nonceRes.json();

      // 2. Create SIWE Message
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = "Sign this message to prove you own this wallet and authorize micro-payments to Aura AI via Pactum.";
      const message = `${domain} wants you to sign in with your Ethereum account:\n${userAddress}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

      // 3. Sign Message
      const signature = await signer.signMessage(message);

      // 4. Verify on Backend
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
      alert("Verification failed! Make sure to sign the SIWE message.");
    } finally {
      setConnecting(false);
    }
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
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setMessages(prev => [...prev, { role: "error", text: data.error }]);
      } else if (!res.ok) {
        setMessages(prev => [...prev, { role: "error", text: "System error occurred. Please try again later." }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.text, meta: { billedAmount: data.billedAmount } }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "error", text: "Connection lost. Ensure the AI server is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-ink-navy/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-graphite border border-border-subtle flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-parchment" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-parchment font-[family-name:var(--font-fraunces)]">Aura AI</h1>
        </div>
        
        <div>
          <button 
            onClick={!address ? connectWallet : undefined}
            disabled={connecting}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border transition-all duration-200 shadow-sm ${
              address 
                ? "bg-graphite border-brass/50 text-brass cursor-default" 
                : "bg-graphite hover:bg-[#252F45] text-parchment border-border-subtle"
            }`}
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : address ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            <span>{connecting ? "Verifying..." : address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Connect Wallet"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col overflow-y-auto scrollbar-hide relative">
        {!address ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Wallet className="w-16 h-16 mb-4 text-[#8B8FA0]" />
            <p className="text-[#8B8FA0]">Connect your wallet to start chatting with Aura AI.</p>
          </div>
        ) : messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full opacity-50">
            <MessageSquare className="w-16 h-16 mb-4 text-[#8B8FA0]" />
            <p className="text-[#8B8FA0]">Start a conversation. Every message is metered via Pactum.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-4 w-full mt-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] bg-graphite text-parchment border border-border-subtle rounded-md px-5 py-3 shadow-sm">
                    <p className="leading-relaxed text-[15px]">{msg.text}</p>
                  </div>
                ) : msg.role === 'error' ? (
                  <div className="max-w-[80%] bg-red-900/10 text-red-400 border border-red-900/30 rounded-md px-5 py-3 flex gap-3 items-start">
                    <div className="mt-0.5">⚠️</div>
                    <div>
                      <p className="font-medium text-[15px] mb-1">Processing Failed</p>
                      <p className="text-sm opacity-90 leading-relaxed">{msg.text}</p>
                      <div className="mt-3">
                        <a href="http://localhost:3000/wallet" target="_blank" rel="noreferrer" className="inline-block text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                          Deposit to Pactum Wallet ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-ink-navy text-parchment border border-border-subtle rounded-md px-5 py-3 shadow-sm">
                    <p className="leading-relaxed text-[15px] whitespace-pre-wrap">{msg.text}</p>
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
      </main>

      <div className="p-4 border-t border-border-subtle bg-ink-navy">
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
    </>
  );
}
