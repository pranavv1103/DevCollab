import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import { sendMessage, ChatMessage } from '../api/chat';

/**
 * RAG-powered Q&A chat interface.
 * Employees ask HR policy questions and get AI answers grounded in company documents.
 *
 * Beginners' note:
 * The messages are stored in React state (local to this component).
 * Each time the user sends a message, we add it to the list and also add
 * the AI response when it comes back. This creates the chat "thread" UI.
 */
const ChatPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; cacheHit?: boolean }>>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQuestion = question.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userQuestion }]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await sendMessage({ question: userQuestion, sessionId });
      setSessionId(response.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          cacheHit: response.cacheHit,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">HR Policy Q&A</h2>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-2xl shadow p-4 mb-4 min-h-64 overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center mt-8">
              Ask a question about your company's HR policies.<br />
              <span className="text-sm">e.g., "How many days of PTO do I get?" or "Am I eligible for FMLA?"</span>
            </p>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-xl px-4 py-2 max-w-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.cacheHit && (
                  <span className="text-xs text-gray-400 mt-1 block">⚡ Cached answer</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-2 text-gray-500 text-sm animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about HR policies..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
