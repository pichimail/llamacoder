'use client';

import { useEffect, useState } from 'react';
import { ChatTopbar } from '@/components/workspace/chat-topbar';
import { ChatsList } from '@/components/chats-list';
import { getChatsList } from '@/app/actions/chat';
import { Loader2 } from 'lucide-react';

export default function ChatsPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const result = await getChatsList();
      setChats(result.all || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ChatTopbar
        chatTitle="All Chats"
        onShare={() => console.log('Share')}
        onCreatePR={() => console.log('Create PR')}
      />
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ChatsList chats={chats} onUpdate={loadChats} />
      )}
    </div>
  );
}
