import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import { askAgent } from '../api/chat';

/**
 * AI Agent page — uses tool-calling to answer structured HR questions.
 *
 * Unlike the RAG chat (which only retrieves documents), the agent can:
 * - Run FMLA eligibility checks with exact rules
 * - Calculate PTO balances
 * - Check remote work eligibility
 * - Combine multiple tool results in one answer
 *
 * Beginners' note:
 * The "context" field lets you provide employee details like tenure and job title
 * so the agent can give personalized answers (e.g., "Am I FMLA eligible?" needs
 * the employee's start date and employment type to answer correctly).
 */
const AgentPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const examples = [
    { q: 'Am I eligible for FMLA leave?', c: 'Tenure: 2 years, Employment type: full-time' },
    { q: 'What is my PTO balance?', c: 'Accrual: 1.5 days/month, 12 months worked, 8 days taken' },
    { q: 'Can I work remotely?', c: 'Job role: Software Engineer, Tenure: 6 months' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const response = await askAgent({ question, context: context || undefined });
      setAnswer(response.answer);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { error?: string } } };
      if (axiosErr?.response?.status === 500) {
        setError(axiosErr.response.data?.error ?? 'Server error. Please try again.');
      } else if (axiosErr?.response?.status === 403 || axiosErr?.response?.status === 401) {
        setError('Session expired. Please log out and log back in.');
      } else {
        setError('Agent request failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="max-w-3xl mx-auto w-full px-4 py-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">🤖 HR Compliance Agent</h2>
        <p className="text-gray-500 text-sm mb-6">
          The AI agent uses specialized tools to calculate eligibility, balances, and compliance answers.
        </p>

        {/* Example questions */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => { setQuestion(ex.q); setContext(ex.c); }}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 transition"
              >
                {ex.q}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Am I eligible for FMLA leave?"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Context <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Tenure: 2 years, full-time, Software Engineer"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Agent thinking...' : 'Ask Agent'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-6 bg-white rounded-2xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-3">Agent Response:</h3>
            <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPage;
