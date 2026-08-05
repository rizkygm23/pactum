
    let userAddress = null;
    let jwtToken = null;

    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletAddressEl = document.getElementById('walletAddress');
    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatForm = document.getElementById('chatForm');
    const messagesEl = document.getElementById('messages');
    const emptyState = document.getElementById('emptyState');
    const chatContainer = document.getElementById('chatContainer');

    // Auto-resize textarea
    promptInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });

    // Create SIWE Message
    function createSiweMessage(address, statement, nonce) {
      const domain = window.location.host;
      const origin = window.location.origin;
      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
      return message;
    }

    // Connect Wallet logic
    connectWalletBtn.addEventListener('click', async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const address = accounts[0];
          
          connectWalletBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span id="walletAddress">Verifying...</span>';

          // 1. Get Nonce
          const nonceRes = await fetch('http://localhost:4000/nonce');
          const { nonce } = await nonceRes.json();

          // 2. Create SIWE Message
          const message = createSiweMessage(
            address,
            "Sign this message to prove you own this wallet and authorize micro-payments to Aura AI via Pactum.",
            nonce
          );

          // 3. Sign Message
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, address],
          });

          // 4. Verify on Backend
          const verifyRes = await fetch('http://localhost:4000/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature })
          });

          if (!verifyRes.ok) {
            throw new Error("Verification failed");
          }

          const { token, address: verifiedAddress } = await verifyRes.json();
          jwtToken = token;
          userAddress = verifiedAddress;
          
          connectWalletBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg> <span id="walletAddress">${userAddress.slice(0,6) + '...' + userAddress.slice(-4)}</span>`;
          connectWalletBtn.classList.add('bg-slate-800', 'border-blue-500/50', 'text-blue-400');
          
          promptInput.disabled = false;
          sendBtn.disabled = false;
          emptyState.style.display = 'none';
          
          promptInput.placeholder = "Ask Aura AI anything...";
          promptInput.focus();
        } catch (error) {
          console.error("User rejected connection or verification failed:", error);
          connectWalletBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg> <span id="walletAddress">Connect Wallet</span>';
          alert("Verification failed! Make sure to sign the SIWE message.");
        }
      } else {
        alert("Please install MetaMask or another Web3 wallet!");
      }
    });

    // Render message
    function appendMessage(role, text, meta = null) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'}`;
      
      let innerHTML = '';
      if (role === 'user') {
        innerHTML = `
          <div class="max-w-[80%] user-msg px-5 py-3 shadow-sm">
            <p class="leading-relaxed text-[15px]">${text}</p>
          </div>
        `;
      } else if (role === 'error') {
        innerHTML = `
          <div class="max-w-[80%] error-msg px-5 py-3 flex gap-3 items-start">
            <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <div>
              <p class="font-medium text-[15px] mb-1">Processing Failed</p>
              <p class="text-sm opacity-90 leading-relaxed">${text}</p>
              <div class="mt-3">
                <a href="http://localhost:3000/wallet" target="_blank" class="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                  Deposit to Pactum Wallet ↗
                </a>
              </div>
            </div>
          </div>
        `;
      } else {
        // AI Response
        innerHTML = `
          <div class="max-w-[80%] ai-msg px-5 py-3 shadow-sm">
            <p class="leading-relaxed text-[15px] text-slate-200">${text}</p>
            ${meta ? `<div class="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500">
              <span class="flex items-center gap-1"><svg class="w-3 h-3 text-brass" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Pactum Billed</span>
              <span class="font-mono">${meta.billedAmount} USDC</span>
            </div>` : ''}
          </div>
        `;
      }

      msgDiv.innerHTML = innerHTML;
      messagesEl.appendChild(msgDiv);
      scrollToBottom();
    }

    function scrollToBottom() {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Submit handler
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!userAddress) return;

      const prompt = promptInput.value.trim();
      if (!prompt) return;

      // 1. Render User Message
      appendMessage('user', prompt);
      promptInput.value = '';
      promptInput.style.height = 'auto';
      
      // Loading State
      sendBtn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
      promptInput.disabled = true;

      try {
        // 2. Call our backend (with JWT)
        const response = await fetch('http://localhost:4000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            prompt: prompt
          })
        });

        const data = await response.json();

        if (response.status === 402) {
          // Pactum 402 Payment Required
          appendMessage('error', data.error);
        } else if (!response.ok) {
          appendMessage('error', 'System error occurred. Please try again later.');
        } else {
          // Success
          appendMessage('ai', data.text, { billedAmount: data.billedAmount });
        }

      } catch (err) {
        console.error(err);
        appendMessage('error', 'Connection lost. Ensure the AI server is running.');
      } finally {
        sendBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>`;
        promptInput.disabled = false;
        promptInput.focus();
      }
    });

    // Enter to submit
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  