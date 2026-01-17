"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    getDocs,
    limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Send,
    Loader2,
    MessageSquare,
    Check,
    CheckCheck,
    Image as ImageIcon,
    Paperclip
} from "lucide-react";

export default function UserChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [guidelines, setGuidelines] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasScrolledToUnread = useRef(false);
    const initialUnreadCount = useRef(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        // Real-time guidelines listener with error handling
        const unsubscribeGuidelines = onSnapshot(collection(db, "guidelines"), (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            const order = ["welcome", "goal", "recharge", "product", "invite"];
            const sorted = data.sort((a: any, b: any) => {
                const indexA = order.indexOf(String(a.id));
                const indexB = order.indexOf(String(b.id));
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            });
            setGuidelines(sorted);
        }, (error) => {
            console.error("Guidelines listener failed:", error);
        });

        let unsubscribeMessages: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            try {
                // Fetch user data for chat info
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUserData(userSnap.data());
                }

                // Fetch initial unread count once
                const chatSnap = await getDoc(doc(db, "chats", currentUser.uid));
                if (chatSnap.exists()) {
                    initialUnreadCount.current = chatSnap.data().unreadCountUser || 0;
                } else {
                    // If no chat doc yet, it's not loading anymore
                    setLoading(false);
                }

                // Real-time messages listener
                const messagesRef = collection(db, "chats", currentUser.uid, "messages");
                const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));

                unsubscribeMessages = onSnapshot(q, (snapshot) => {
                    const msgs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    const shouldScrollToUnread = initialUnreadCount.current > 0 && !hasScrolledToUnread.current;

                    setMessages(msgs);
                    setLoading(false);

                    if (shouldScrollToUnread) {
                        hasScrolledToUnread.current = true;
                        setTimeout(() => {
                            if (scrollRef.current) {
                                const container = scrollRef.current;
                                const bubbles = container.querySelectorAll('.message-bubble');
                                const targetIdx = msgs.length - initialUnreadCount.current;
                                if (bubbles[targetIdx]) {
                                    bubbles[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                } else {
                                    scrollToBottom(true);
                                }
                            }
                        }, 500); // More delay for guidelines/images
                    } else {
                        scrollToBottom(true);
                    }

                    // Clear unread count for user when they open the chat
                    updateUnreadCount(currentUser.uid).catch(console.error);
                }, (error) => {
                    console.error("Messages listener failed:", error);
                    setLoading(false);
                });
            } catch (error) {
                console.error("Error initializing chat:", error);
                setLoading(false);
            }
        }, (error) => {
            console.error("Auth observer failed:", error);
            setLoading(false);
        });

        // Safety timeout to prevent permanent loading state
        const loadingTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribeAuth();
            unsubscribeGuidelines();
            clearTimeout(loadingTimeout);
            if (unsubscribeMessages) unsubscribeMessages();
        };
    }, [router, mounted]);

    // Auto-scroll to bottom
    const scrollToBottom = (smooth = true) => {
        if (scrollRef.current) {
            const container = scrollRef.current;

            const performScroll = () => {
                const bubbles = container.querySelectorAll('.message-bubble');
                if (bubbles.length > 0) {
                    const lastBubble = bubbles[bubbles.length - 1];
                    lastBubble.scrollIntoView({
                        behavior: smooth ? 'smooth' : 'auto',
                        block: 'end'
                    });
                } else {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: smooth ? 'smooth' : 'auto'
                    });
                }
            };

            // Immediate
            performScroll();

            // Catch late renders
            setTimeout(performScroll, 100);
            setTimeout(performScroll, 300);
            setTimeout(performScroll, 800);
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom(true);
        }
    }, [messages, guidelines]);

    const updateUnreadCount = async (uid: string) => {
        try {
            const chatRef = doc(db, "chats", uid);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                await setDoc(chatRef, {
                    unreadCountUser: 0
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error updating unread count:", error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        const text = newMessage.trim();
        setNewMessage("");

        try {
            // 1. Add message to sub-collection
            const messagesRef = collection(db, "chats", user.uid, "messages");
            await addDoc(messagesRef, {
                text,
                senderId: user.uid,
                timestamp: serverTimestamp()
            });

            // 2. Update chat summary for admin inbox
            const chatRef = doc(db, "chats", user.uid);
            const chatSnap = await getDoc(chatRef);
            const currentUnread = chatSnap.exists() ? (chatSnap.data().unreadCountAdmin || 0) : 0;

            await setDoc(chatRef, {
                lastMessage: text,
                lastTimestamp: serverTimestamp(),
                userId: user.uid,
                userPhone: userData?.phone || user.email || "Unknown User",
                unreadCountAdmin: currentUnread + 1,
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            if (isNaN(date.getTime())) return "";
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    if (!mounted || loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#0e0e0e] flex flex-col max-w-lg mx-auto shadow-2xl overflow-hidden relative border-x border-[#1c1c1e]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#1c1c1e]/90 backdrop-blur-xl border-b border-[#2c2c2e] px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center text-gray-300 hover:text-white active:scale-90 transition-transform"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center overflow-hidden border border-[#3a3a3c]">
                                <img src="/zen-3d-logo.png" className="w-full h-full object-cover" alt="Support" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1c1c1e] rounded-full"></div>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-none mb-1 tracking-wide">Customer Support</h1>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-blue-400">online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <main
                ref={scrollRef}
                className="flex-1 px-4 overflow-y-auto space-y-2 py-4 custom-scrollbar"
                style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url("/assets/chat-bg-pattern.png")', backgroundBlendMode: 'overlay', backgroundSize: '300px' }}
            >
                {/* Fallback pattern if image missing is just dark bg handled by parent class */}

                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-700">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-[#1c1c1e] flex items-center justify-center text-[#3a3a3c]">
                            <MessageSquare size={40} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-sm font-bold text-gray-200">No messages yet</h2>
                            <p className="text-[11px] text-gray-500">Start the conversation</p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user.uid;
                    return (
                        <div key={msg.id || idx}>
                            <div
                                className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-200 mb-2 message-bubble`}
                            >
                                <div className={`max-w-[85%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                    <div className={`
                                        px-4 py-2 rounded-2xl text-[15px] leading-relaxed
                                        ${isMe
                                            ? "bg-[#8774e1] text-white rounded-tr-sm" // Telegram-ish purple/blue for self
                                            : "bg-[#212121] text-white rounded-tl-sm" // Dark gray for other
                                        }
                                    `}>
                                        {msg.text}
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 px-1 opacity-60">
                                        <span className="text-[10px] text-gray-400">
                                            {formatTime(msg.timestamp)}
                                        </span>
                                        {isMe && (
                                            <CheckCheck size={12} className="text-[#8774e1]" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Show Guidelines after the FIRST message ONLY */}
                            {idx === 0 && guidelines.length > 0 && (
                                <div className="space-y-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 px-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-px bg-[#2c2c2e] flex-1"></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">FAQ</span>
                                        <div className="h-px bg-[#2c2c2e] flex-1"></div>
                                    </div>
                                    {guidelines.map((guide) => (
                                        <div key={guide.id} className="bg-[#1c1c1e] rounded-xl overflow-hidden border border-[#2c2c2e]">
                                            {guide.imageUrl && (
                                                <div className="w-full h-32 overflow-hidden relative">
                                                    <img
                                                        src={guide.imageUrl}
                                                        alt={guide.id}
                                                        className="w-full h-full object-cover opacity-80"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] to-transparent"></div>
                                                </div>
                                            )}
                                            <div className="p-4 space-y-1">
                                                <h3 className="text-sm font-bold text-gray-200">
                                                    {guide.id === 'welcome' ? 'Welcome' :
                                                        guide.id === 'goal' ? 'Our Goal' :
                                                            guide.id === 'recharge' ? 'Recharge Guide' :
                                                                guide.id === 'product' ? 'Buying Products' :
                                                                    guide.id === 'invite' ? 'Inviting Friends' : guide.id}
                                                </h3>
                                                <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                                                    {guide.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3 mt-4">
                                        <div className="h-px bg-[#2c2c2e] flex-1"></div>
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">History</span>
                                        <div className="h-px bg-[#2c2c2e] flex-1"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>

            {/* Input Area */}
            <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-[#2c2c2e] p-3 safe-area-bottom z-50 shrink-0">
                <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2"
                >
                    <button
                        type="button"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
                    >
                        <Paperclip size={22} />
                    </button>

                    <div className="flex-1 bg-[#101010] rounded-[1.25rem] min-h-[44px] flex items-center px-4 border border-[#2c2c2e]">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message..."
                            className="w-full bg-transparent border-none outline-none text-white placeholder-gray-500 text-[15px]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0
                            ${newMessage.trim() && !sending
                                ? "bg-[#8774e1] text-white active:scale-95"
                                : "text-[#8774e1] bg-transparent opacity-50"
                            }
                        `}
                    >
                        {sending ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <Send size={24} className={newMessage.trim() ? "" : "ml-0.5"} />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
