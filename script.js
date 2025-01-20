// 初期設定：config.json から APIキーとURLを読み込む
let API_KEY;
let API_URL;

fetch('config.json')
  .then(response => response.json())
  .then(config => {
    API_KEY = config.API_KEY;
    API_URL = config.API_URL;
    console.log("APIキーとURLが正常に読み込まれました。");

    // 初期プロンプト設定
    const initialPrompt = `
    You are a foreign visitor traveling in Osaka.  
    You don’t know much about Japan and need help from the user.  
    The user is a local person who can assist you.  

    Your role is **ONLY** to ask for help and receive support.  
    **Never** act as a guide or helper.  
    You should ask for help in various situations such as:  
    - Finding a restaurant  
    - Asking for directions  
    - Understanding a menu  
    - Buying a train ticket  
    - Checking into a hotel  

    Always start with a phrase like:  
    - "Excuse me, can you help me?"  
    - "I need help with something."  
    - "I'm lost. Can you assist me?"  

    When the user types "change situation", you must change the topic to a different situation where you need help.  

    When the user types "report", summarize the conversation from "start class" to "class dismissed" and provide a PDF output.  

    ⚠️ **IMPORTANT RULES:**  
    1. **Never** act as a guide or assistant.  
    2. You are **only** a tourist asking for help.  
    3. If you accidentally say, "How can I assist you?", immediately correct yourself and ask for help instead.  
    `;
    
    // DOM要素の取得
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // 会話履歴の管理
    let conversationHistory = [
      { role: "system", content: initialPrompt }
    ];

    // メッセージの表示
    function displayMessage(content, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');
      messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
      messageDiv.textContent = content;
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight; // 最新のメッセージが見えるようにスクロール
    }

    // APIにリクエストを送信
    async function sendMessageToAI(message) {
      conversationHistory.push({ role: "user", content: message });
      
      try {
        const response = await axios.post(API_URL, {
          model: "gpt-3.5-turbo",  // 使用するモデル
          messages: conversationHistory,
          max_tokens: 150,
          temperature: 0.7
        }, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          }
        });

        const aiMessage = response.data.choices[0].message.content;
        conversationHistory.push({ role: "assistant", content: aiMessage });
        displayMessage(aiMessage, 'ai');
      } catch (error) {
        console.error("Error communicating with AI:", error);
        displayMessage("Sorry, I couldn't process your request. Please try again.", 'ai');
      }
    }

    // ユーザー入力の処理
    sendBtn.addEventListener('click', () => {
      const message = userInput.value.trim();
      if (message) {
        displayMessage(message, 'user');
        sendMessageToAI(message);
        userInput.value = ''; // 入力欄をリセット
      }
    });

    // 初回のメッセージ表示
    displayMessage("Hello!", 'ai');

  })
  .catch(error => {
    console.error("設定ファイルの読み込みエラー:", error);
    displayMessage("Sorry, configuration could not be loaded.", 'ai');
  });
