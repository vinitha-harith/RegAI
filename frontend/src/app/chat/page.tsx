import { ChatAssistant } from '@/app/components/ChatAssistant';

export default function ChatPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
        <header className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">AI Chat Assistant</h1>
            <p className="text-lg text-gray-600 mt-2">Ask questions about any of your uploaded documents.</p>
        </header>
        <ChatAssistant />
    </div>
  );
}