'use client';
import { useState, useEffect } from 'react';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { NotificationMessage } from '@/app/lib/types';

// List of your business divisions from the CSV
const BUSINESS_DIVISIONS = ["AMO", "COO Ops Americas", "COO Ops S&I", "GOTO Operations & COO", "IB Operations (BA)", "P&C Operations", "Treasury"];

export default function NotificationPage() {
    const [selectedDivision, setSelectedDivision] = useState<string>('');
    const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    useEffect(() => {
        if (!selectedDivision) return;

        setConnectionStatus('connecting');
        const wsUrl = `ws://${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/^https?:\/\//, '')}/ws/${selectedDivision}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`Connected to WebSocket as ${selectedDivision}`);
            setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
            console.log("Received message:", event.data);
            const newNotification: NotificationMessage = {
                id: new Date().toISOString(),
                text: event.data,
                timestamp: new Date().toLocaleTimeString()
            };
            setNotifications(prev => [newNotification, ...prev]);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setConnectionStatus('disconnected');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('disconnected');
        };

        // Cleanup on component unmount or when selectedDivision changes
        return () => {
            ws.close();
        };
    }, [selectedDivision]);

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900">Notification Center</h1>
                <p className="text-lg text-gray-600 mt-1">Simulates a real-time notification feed for a business division.</p>
            </header>

            <div className="p-4 bg-white rounded-lg shadow-sm border flex flex-wrap items-center gap-4">
                <label htmlFor="division-selector" className="font-semibold text-gray-700">Select Your Division:</label>
                <select
                    id="division-selector"
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="p-2 border text-gray-500 rounded-md"
                >
                    <option value="" disabled>-- Choose a Division --</option>
                    {BUSINESS_DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
                </select>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    {connectionStatus === 'connected' && <><Wifi className="text-green-500"/> Connected</>}
                    {connectionStatus === 'connecting' && <span className="animate-pulse">Connecting...</span>}
                    {connectionStatus === 'disconnected' && selectedDivision && <><WifiOff className="text-red-500"/> Disconnected</>}
                </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm border space-y-4 min-h-[50vh]">
                {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">
                        {selectedDivision ? "Waiting for notifications..." : "Please select a division to start listening."}
                    </p>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} className="p-4 bg-gray-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-4">
                            <Bell className="h-6 w-6 text-red-500 shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-800">{notif.text}</p>
                                <p className="text-xs text-gray-500 mt-1">{notif.timestamp}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
