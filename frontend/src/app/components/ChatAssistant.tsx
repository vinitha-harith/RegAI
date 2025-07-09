'use client';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { Bot, User, Send, Loader2, XCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai' | 'error';
  text: string;
}

export const ChatAssistant = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // --- NEW STATE FOR FILTERS ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [tags, setTags] = useState('');
    const [regions, setRegions] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setInput('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: input,
                    start_date: startDate || null,
                    end_date: endDate || null,
                    // Convert comma-separated strings to arrays, filtering out empty strings
                    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
                    regions: regions ? regions.split(',').map(r => r.trim()).filter(Boolean) : null
                }),
            });


            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to get a response from the assistant.');
            }

            const data = await res.json();
            const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: data.answer };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'error', text: 'Sorry, something went wrong. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setTags('');
        setRegions('');
    };

    return (
        <div className="flex flex-col h-[75vh] bg-gray-100 rounded-lg border">
            {/* --- NEW, TWO-ROW FILTER LAYOUT --- */}
            <div className="p-4 border-b bg-white space-y-4">
                {/* First Row: Dates */}
                <div className="flex flex-wrap items-end gap-4">
                    <div className="text-sm font-semibold text-gray-600 self-center">Filter by:</div>
                    <div>
                        <label htmlFor="start-date" className="block text-xs text-gray-500">Publication Start Date</label>
                        <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-1 border rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-xs text-gray-500">Publication End Date</label>
                        <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-1 border rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    </div>
                </div>
                 {/* Second Row: Tags and Regions */}
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="tags" className="block text-xs text-gray-500">Tags (comma-separated)</label>
                        <input id="tags" type="text" placeholder="e.g., Payments, AML" value={tags} onChange={(e) => setTags(e.target.value)} className="p-1 border rounded-md text-sm w-full text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="regions" className="block text-xs text-gray-500">Regions (comma-separated)</label>
                        <input id="regions" type="text" placeholder="e.g., EU, US" value={regions} onChange={(e) => setRegions(e.target.value)} className="p-1 border rounded-md text-sm w-full text-gray-700 focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    </div>
                     {(startDate || endDate || tags || regions) && (
                        <button onClick={clearFilters} className="text-xs text-red-600 hover:underline flex items-center gap-1 self-center pb-1">
                            <XCircle size={14}/>
                            Clear All Filters
                        </button>
                    )}
                </div>
            </div>


            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role !== 'user' && (
                            <div className={`p-2 rounded-full text-white ${msg.role === 'ai' ? 'bg-red-600' : 'bg-red-600'}`}>
                                <Bot size={20} />
                            </div>
                        )}
                        <div className={`max-w-xl p-4 rounded-lg shadow-sm ${
                            msg.role === 'user' ? 'bg-red-500 text-white' : 
                            msg.role === 'ai' ? 'bg-white border text-gray-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                        {msg.role === 'user' && (
                           <div className="p-2 rounded-full bg-gray-300 text-gray-700">
                               <User size={20}/>
                           </div>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-red-600 text-white animate-pulse">
                           <Bot size={20}/>
                        </div>
                       <div className="bg-white border p-3 rounded-lg flex items-center gap-2 text-gray-700">
                           <Loader2 className="animate-spin" size={20}/>
                           <span>Thinking...</span>
                       </div>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t bg-white rounded-b-lg flex items-center gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about any document..."
                    // --- THE FONT COLOR FIX IS HERE ---
                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading} className="p-2 bg-red-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-red-700 flex items-center justify-center">
                    <Send size={20}/>
                </button>
            </form>
        </div>
    );
};