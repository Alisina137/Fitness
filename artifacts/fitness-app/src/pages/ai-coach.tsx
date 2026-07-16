import React, { useState, useEffect, useRef } from "react";
import { useListConversations, useCreateConversation, useGetConversationMessages, useSendMessage } from "@workspace/api-client-react";
import { Send, Bot, User, Plus, MessageSquare, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AiCoachPage() {
  const { data: conversations, isLoading: loadingConvos, refetch: refetchConvos } = useListConversations();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const { data: messages, isLoading: loadingMessages, refetch: refetchMessages } = useGetConversationMessages(
    activeId || 0,
    { query: { enabled: !!activeId } }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    createConversation.mutate({ data: { title: "New Consultation" } }, {
      onSuccess: (newConv) => {
        refetchConvos();
        setActiveId(newConv.id);
      }
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;

    const messageContent = input;
    setInput("");

    sendMessage.mutate(
      { id: activeId, data: { content: messageContent } },
      {
        onSuccess: () => {
          refetchMessages();
          refetchConvos(); // Update lastMessageAt
        }
      }
    );
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-background overflow-hidden animate-in fade-in">
      {/* Desktop Sidebar - Chat History */}
      <div className="hidden md:flex w-80 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border flex justify-between items-center bg-card z-10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Core AI
          </h2>
          <Button size="icon" variant="ghost" onClick={handleNewChat} disabled={createConversation.isPending}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingConvos ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : conversations?.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 border",
                activeId === conv.id 
                  ? "bg-primary/10 border-primary/30 shadow-sm" 
                  : "bg-background border-transparent hover:border-border hover:bg-secondary/50"
              )}
            >
              <span className={cn(
                "text-sm font-bold truncate block",
                activeId === conv.id ? "text-primary" : "text-foreground"
              )}>{conv.title}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), "MMM d, HH:mm") : "New"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-background/50 relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border bg-card flex justify-between items-center z-10">
          <h2 className="font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Core AI
          </h2>
          <Button size="sm" variant="outline" onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-2" /> New
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 z-10">
          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 opacity-60">
              <div className="h-20 w-20 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Initialize Coaching Session</h2>
              <p className="text-muted-foreground">Select a conversation or start a new one to ask about form, nutrition, or modifications.</p>
              <Button onClick={handleNewChat} className="font-bold text-black">Start Diagnostics</Button>
            </div>
          ) : loadingMessages ? (
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <div key={i} className={cn("flex", i%2===0 ? "justify-end" : "justify-start")}>
                  <Skeleton className={cn("h-20 max-w-[70%] rounded-2xl", i%2===0 ? "w-64" : "w-96")} />
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              Session initialized. How can I optimize your training today?
            </div>
          ) : (
            messages?.map((msg) => {
              const isAi = msg.role === "assistant";
              return (
                <div key={msg.id} className={cn("flex w-full", isAi ? "justify-start" : "justify-end")}>
                  <div className={cn(
                    "flex gap-4 max-w-[85%] md:max-w-[70%]",
                    isAi ? "flex-row" : "flex-row-reverse"
                  )}>
                    <div className={cn(
                      "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                      isAi ? "bg-primary text-black" : "bg-secondary text-foreground"
                    )}>
                      {isAi ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      isAi 
                        ? "bg-card border border-border shadow-sm" 
                        : "bg-primary text-black font-medium"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {sendMessage.isPending && (
            <div className="flex justify-start w-full">
              <div className="flex gap-4 max-w-[80%]">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary text-black flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-2">
                  <span className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                  <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-background border-t border-border z-10">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about substitutions, macros, or form..."
              className="flex-1 bg-card border-border h-14 text-base rounded-full pl-6 shadow-sm focus-visible:ring-primary"
              disabled={!activeId || sendMessage.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-14 w-14 rounded-full shrink-0 bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20"
              disabled={!input.trim() || !activeId || sendMessage.isPending}
            >
              {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
