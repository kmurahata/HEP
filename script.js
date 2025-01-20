// OpenAI APIキーとエンドポイント
const API_KEY = "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"; // 自分のAPIキーを設定してください
const API_URL = "https://api.openai.com/v1/completions";

// 初期プロンプト設定
const initialPrompt = "You are a tourist from overseas visiting Osaka. You don’t know much about Japan, and you need help understanding various situations during your visit. You will ask for help in different situations, and I will assist you. Use simple English for communication.";

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
displayMessage("Hello! How can I assist you with your visit to Osaka?", 'ai');
