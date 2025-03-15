import React, { useState, useEffect } from 'react';
import { Send, Bot, LineChart, DollarSign, Loader2 } from 'lucide-react';
import { LineChart as ReChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Message {
  text: string;
  isBot: boolean;
  chartData?: {
    symbol: string;
    data?: Array<{ date: string; price: number }>;
  };
}

// Enhanced predefined responses with more specific financial queries
const predefinedResponses: Record<string, string> = {
  hello: "Hello! I'm your financial assistant. I can help you with:\n- Stock prices (try 'stock AAPL')\n- Investment basics\n- Market terms\n- Financial advice\nWhat would you like to know?",
  help: "Here are commands you can try:\n- 'stock SYMBOL' (e.g., try these symbols:\n  • AAPL (Apple)\n  • MSFT (Microsoft)\n  • GOOGL (Google)\n  • AMZN (Amazon)\n  • TSLA (Tesla)\n  • META (Meta/Facebook)\n  • NFLX (Netflix))\n- 'explain investing'\n- 'what is a stock'\n- 'investment tips'\n- 'market basics'",
  "what is a stock": "A stock represents ownership in a company. When you buy a stock, you're buying a small piece of that company. The stock price can go up or down based on the company's performance and market conditions.",
  "investment tips": "Here are some basic investment tips:\n1. Diversify your portfolio\n2. Invest for the long term\n3. Start early\n4. Research before investing\n5. Don't invest money you can't afford to lose",
  "market basics": "The stock market is where shares of public companies are bought and sold. Key things to know:\n- Stock exchanges (NYSE, NASDAQ)\n- Market hours (9:30 AM - 4:00 PM EST)\n- Types of orders (market, limit)\n- Basic terms (bull/bear market)",
  "explain investing": "Investing is putting money into assets hoping to grow wealth over time. Common investment types:\n1. Stocks\n2. Bonds\n3. Mutual Funds\n4. ETFs\n5. Real Estate",
  default: "I'm not sure about that. Try asking about stocks, investing basics, or type 'help' for available commands."
};

const ALPHA_VANTAGE_API_KEY = 'GV7X6LMWS10833IN'; // Get free key from www.alphavantage.co

const parseCommand = (message: string): { command: string; args: string } => {
  const parts = message.toLowerCase().trim().split(' ');
  return {
    command: parts[0],
    args: parts.slice(1).join(' ')
  };
};

const getHistoricalData = async (symbol: string) => {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    
    if (data['Note']) {
      return { error: 'API rate limit reached. Please try again in a minute.' };
    }

    if (!data['Monthly Time Series']) {
      return { error: 'No historical data found' };
    }

    const chartData = Object.entries(data['Monthly Time Series'])
      .slice(0, 12) // Get last 12 months
      .reverse()
      .map(([date, values]: [string, any]) => ({
        date: date.substring(0, 7), // Format: YYYY-MM
        price: parseFloat(values['4. close'])
      }));

    return { data: chartData };
  } catch (error) {
    return { error: 'Failed to fetch historical data' };
  }
};

const StockChart = ({ data, symbol }: { data: Array<{ date: string; price: number }>; symbol: string }) => (
  <div className="h-[300px] w-full mt-4 p-4 bg-white/50 rounded-xl backdrop-blur-sm">
    <ResponsiveContainer width="100%" height="100%">
      <ReChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" stroke="#4b5563" />
        <YAxis stroke="#4b5563" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '0.5rem',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ fill: '#2563eb', strokeWidth: 2 }}
        />
      </ReChart>
    </ResponsiveContainer>
  </div>
);

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hi! I'm FinBot, your AI financial assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getStockData = async (symbol: string) => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      
      if (data['Note']) {
        return { error: 'API rate limit reached. Please try again in a minute.' };
      }
      
      if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
        return { error: `Could not find stock data for symbol: ${symbol}` };
      }
      
      return { data: data['Global Quote'] };
    } catch (error) {
      return { error: 'Failed to fetch stock data. Please try again.' };
    }
  };

  const formatStockResponse = (stockData: any, symbol: string) => {
    const price = parseFloat(stockData['05. price']).toFixed(2);
    const change = parseFloat(stockData['09. change']).toFixed(2);
    const changePercent = stockData['10. change percent'];
    const direction = parseFloat(change) >= 0 ? '📈' : '📉';

    return `${direction} ${symbol.toUpperCase()} Stock Info:\n` +
           `Price: $${price}\n` +
           `Change: $${change} (${changePercent})\n` +
           `Today's High: $${parseFloat(stockData['03. high']).toFixed(2)}\n` +
           `Today's Low: $${parseFloat(stockData['04. low']).toFixed(2)}`;
  };

  const getBotResponse = async (userMessage: string) => {
    const { command, args } = parseCommand(userMessage);
    const lowerMessage = userMessage.toLowerCase();

    // Handle stock queries with chart data
    if (command === 'stock' && args) {
      const symbol = args.split(' ')[0];
      const quoteResult = await getStockData(symbol);
      const historyResult = await getHistoricalData(symbol);
      
      if (quoteResult.error) {
        return { text: quoteResult.error };
      }

      const response = formatStockResponse(quoteResult.data, symbol);
      
      if (!historyResult.error) {
        return {
          text: response,
          chartData: {
            symbol: symbol.toUpperCase(),
            data: historyResult.data
          }
        };
      }
      
      return { text: response };
    }

    // Check for exact matches in predefined responses
    if (predefinedResponses[lowerMessage]) {
      return { text: predefinedResponses[lowerMessage] };
    }

    // Check for partial matches
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (lowerMessage.includes(key)) {
        return { text: response };
      }
    }

    // Handle queries about specific financial terms
    if (lowerMessage.startsWith('what is') || lowerMessage.startsWith('explain')) {
      const term = lowerMessage.replace('what is', '').replace('explain', '').trim();
      if (term) {
        return { text: `I'll explain ${term}. ${predefinedResponses[term] || predefinedResponses.default}` };
      }
    }

    return { text: predefinedResponses.default };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setIsLoading(true);

    try {
      const botResponse = await getBotResponse(userMessage);
      setMessages(prev => [...prev, { 
        text: botResponse.text, 
        isBot: true,
        chartData: botResponse.chartData
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: "I'm sorry, I encountered an error. Please try again later.", 
        isBot: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-sm sticky top-0 z-10 flex-none">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              FinBot
            </h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">AI Assistant</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 overflow-hidden flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-4 mb-4 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 space-y-4 p-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} w-full`}
              >
                <div className={`flex items-start gap-3 w-full ${
                  message.isBot ? 'flex-row pr-8' : 'flex-row-reverse pl-8'
                }`}>
                  {/* Avatar */}
                  {message.isBot ? (
                    <div className="flex-none w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                      <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                  ) : (
                    <div className="flex-none w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                      <LineChart className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {/* Message Content */}
                  <div className={`flex-1 p-4 rounded-2xl shadow-sm ${
                    message.isBot
                      ? 'bg-white text-gray-800'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-line">{message.text}</p>
                    {message.chartData && message.chartData.data && (
                      <>
                        <p className="text-sm font-semibold mt-3 mb-2">
                          {message.chartData.symbol} - 12 Month Performance
                        </p>
                        <StockChart 
                          data={message.chartData.data} 
                          symbol={message.chartData.symbol} 
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Processing request...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <div className="flex-none">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about stocks, investments, or financial advice..."
              className="flex-1 p-4 rounded-xl border-0 bg-white/70 backdrop-blur-md shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`px-6 py-4 bg-blue-600 text-white rounded-xl shadow-sm
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                       focus:ring-offset-2 transition-all ${
                         isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                       }`}
              disabled={isLoading}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none max-w-7xl mx-auto px-4 py-3 text-center text-gray-500 text-sm">
        <p className="font-medium">FinBot - AI-Powered Financial Assistant</p>
      </footer>
    </div>
  );
}

export default App;