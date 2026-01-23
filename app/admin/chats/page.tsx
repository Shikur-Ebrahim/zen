"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    getDocs,
    limit,
    addDoc,
    where,
    deleteDoc,
    writeBatch
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Send,
    Loader2,
    MessageSquare,
    Search,
    MoreVertical,
    CheckCheck,
    Phone,
    User,
    ArrowLeft,
    Trash2,
    CheckSquare,
    Square,
    X,
    CheckCircle,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminChatDashboard() {
    const router = useRouter();
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [admin, setAdmin] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [modalConfig, setModalConfig] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: "danger" | "warning";
    }>({
        show: false,
        title: "",
        message: "",
        onConfirm: () => { },
        type: "danger"
    });
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasScrolledToUnread = useRef<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setAdmin(user);
        });

        // Real-time chat list listener
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, orderBy("lastTimestamp", "desc"));

        const unsubscribeChats = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChats(chatList);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeChats();
        };
    }, [router]);

    // Listener for messages when a chat is selected
    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            hasScrolledToUnread.current = null;
            return;
        }

        const messagesRef = collection(db, "chats", selectedChat.id, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Check if we should scroll to unread
            const unreadCount = selectedChat.unreadCountAdmin || 0;
            const shouldScrollToUnread = unreadCount > 0 && hasScrolledToUnread.current !== selectedChat.id;

            setMessages(msgs);

            if (shouldScrollToUnread) {
                // Initial scroll to unread section
                hasScrolledToUnread.current = selectedChat.id;
                setTimeout(() => {
                    if (scrollRef.current) {
                        const container = scrollRef.current;
                        const messageElements = container.querySelectorAll('.message-bubble');
                        const targetIndex = msgs.length - unreadCount;
                        if (messageElements[targetIndex]) {
                            messageElements[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            scrollToBottom(true);
                        }
                    }
                }, 300);
            } else {
                scrollToBottom(true);
            }

            // Mark as read for admin
            markAsRead(selectedChat.id);
        });

        return () => unsubscribeMessages();
    }, [selectedChat]);

    // Auto-scroll on new messages
    const scrollToBottom = (smooth = true) => {
        if (scrollRef.current) {
            const container = scrollRef.current;

            const scroll = () => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            };

            // Immediate scroll
            scroll();

            // Multiple frames to catch layout shifts
            requestAnimationFrame(scroll);

            // Safety timeouts
            setTimeout(scroll, 50);
            setTimeout(scroll, 200);
            setTimeout(scroll, 500);
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom(true);
        }
    }, [messages]);

    const markAsRead = async (userId: string) => {
        try {
            await setDoc(doc(db, "chats", userId), {
                unreadCountAdmin: 0
            }, { merge: true });
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sending) return;

        setSending(true);
        const text = newMessage.trim();
        setNewMessage("");

        try {
            // 1. Add message
            const messagesRef = collection(db, "chats", selectedChat.id, "messages");
            await addDoc(messagesRef, {
                text,
                senderId: "admin",
                timestamp: serverTimestamp()
            });

            // 2. Update chat summary
            const chatRef = doc(db, "chats", selectedChat.id);
            await setDoc(chatRef, {
                lastMessage: text,
                lastTimestamp: serverTimestamp(),
                unreadCountUser: (await getDoc(chatRef)).data()?.unreadCountUser || 0 + 1,
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteConversation = async (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        setModalConfig({
            show: true,
            title: "Delete Conversation",
            message: "Are you sure you want to delete this entire conversation? This action cannot be undone.",
            type: "danger",
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, show: false }));
                setDeleting(userId);
                try {
                    // Delete all messages first
                    const msgsRef = collection(db, "chats", userId, "messages");
                    const msgsSnap = await getDocs(msgsRef);
                    const batch = writeBatch(db);
                    msgsSnap.docs.forEach((doc) => batch.delete(doc.ref));
                    await batch.commit();

                    // Delete main chat doc
                    await deleteDoc(doc(db, "chats", userId));
                    if (selectedChat?.id === userId) setSelectedChat(null);
                } catch (error) {
                    console.error("Error deleting conversation:", error);
                } finally {
                    setDeleting(null);
                }
            }
        });
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!selectedChat || !confirm("Delete this message?")) return;

        try {
            await deleteDoc(doc(db, "chats", selectedChat.id, "messages", msgId));
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedChat || selectedMessages.size === 0) return;

        setModalConfig({
            show: true,
            title: "Delete Messages",
            message: `Are you sure you want to delete ${selectedMessages.size} selected message(s)?`,
            type: "danger",
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, show: false }));
                const batch = writeBatch(db);
                selectedMessages.forEach((msgId) => {
                    batch.delete(doc(db, "chats", selectedChat.id, "messages", msgId));
                });

                try {
                    await batch.commit();
                    setSelectedMessages(new Set());
                    setSelectionMode(false);
                } catch (error) {
                    console.error("Error bulk deleting:", error);
                }
            }
        });
    };

    const toggleMessageSelection = (msgId: string) => {
        const next = new Set(selectedMessages);
        if (next.has(msgId)) next.delete(msgId);
        else next.add(msgId);
        setSelectedMessages(next);
    };

    const formatTime = (ts: any) => {
        if (!ts) return "";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredChats = chats.filter(chat =>
        chat.userPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.userId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-purple-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#F8F9FD] flex overflow-hidden relative">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
                {/* Left Column: Chat List */}
                <aside className={`
                ${selectedChat ? "hidden md:flex" : "flex"}
                w-full md:w-[400px] flex-col bg-white border-r border-gray-100 h-full z-20
                animate-in slide-in-from-left duration-300
            `}>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="md:hidden w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                                >
                                    <Menu size={20} />
                                </button>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">Support Inbox</h1>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs">
                                {chats.filter(c => c.unreadCountAdmin > 0).length}
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-600/20 focus:bg-white transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10">
                        {filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`
                                w-full p-4 rounded-3xl flex items-center gap-4 transition-all cursor-pointer
                                ${selectedChat?.id === chat.id
                                        ? "bg-purple-600 text-white shadow-xl shadow-purple-600/30 lg:active:scale-95"
                                        : "bg-white hover:bg-gray-50 text-gray-900"
                                    }
                            `}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm relative shrink-0 overflow-hidden ${selectedChat?.id === chat.id ? "bg-white/20" : "bg-gray-50"
                                    }`}>
                                    <img
                                        src="/avator profile.jpg"
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                    {chat.unreadCountAdmin > 0 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white">
                                            {chat.unreadCountAdmin}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className={`text-sm font-bold truncate ${selectedChat?.id === chat.id ? "text-white" : "text-gray-900"}`}>
                                            {chat.userPhone || "User"}
                                        </p>
                                        <p className={`text-[10px] font-medium ${selectedChat?.id === chat.id ? "text-white/70" : "text-gray-400"}`}>
                                            {formatTime(chat.lastTimestamp)}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className={`text-xs truncate max-w-[150px] ${selectedChat?.id === chat.id ? "text-white/80" : "text-gray-500"}`}>
                                            {chat.lastMessage || "No messages yet"}
                                        </p>
                                        <button
                                            onClick={(e) => handleDeleteConversation(chat.id, e)}
                                            disabled={deleting === chat.id}
                                            className={`p-1.5 rounded-lg transition-colors ${selectedChat?.id === chat.id ? "hover:bg-white/20 text-white/50 hover:text-white" : "hover:bg-red-50 text-gray-300 hover:text-red-500"}`}
                                        >
                                            {deleting === chat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredChats.length === 0 && (
                            <div className="flex flex-col items-center justify-center pt-20 text-gray-400 text-center px-6">
                                <MessageSquare size={48} className="mb-4 opacity-10" />
                                <p className="text-xs font-black uppercase tracking-widest">No conversations found</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Right Column: Chat Window */}
                <main className={`
                ${selectedChat ? "flex" : "hidden md:flex"}
                flex-1 flex-col h-full relative bg-white z-10
                animate-in slide-in-from-right duration-300 md:animate-none
            `}>
                    {selectedChat ? (
                        <>
                            {/* Header */}
                            <header className="px-5 md:px-8 py-4 md:py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                <div className="flex items-center gap-4 md:gap-5">
                                    <button
                                        onClick={() => setSelectedChat(null)}
                                        className="md:hidden w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/20 overflow-hidden">
                                        <img
                                            src="/avator profile.jpg"
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-gray-900 text-sm md:text-lg leading-none mb-1 uppercase tracking-tight truncate max-w-[150px] md:max-w-none">
                                            {selectedChat.userPhone}
                                        </h2>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Active</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    {(selectionMode || selectedMessages.size > 0) ? (
                                        <>
                                            <button
                                                onClick={handleDeleteSelected}
                                                className="px-4 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 animate-in zoom-in-95 duration-200"
                                            >
                                                <Trash2 size={14} />
                                                Delete {selectedMessages.size > 0 ? `(${selectedMessages.size})` : ""}
                                            </button>
                                            <button
                                                onClick={() => { setSelectionMode(false); setSelectedMessages(new Set()); }}
                                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setSelectionMode(true)}
                                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                                            >
                                                <CheckSquare size={18} />
                                            </button>
                                            <button className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                                                <Phone size={18} />
                                            </button>
                                            <button className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </header>

                            {/* Messages Area */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-5 md:p-10 space-y-4 md:space-y-6 bg-[#F8F9FD]/50"
                            >
                                {messages.map((msg, idx) => {
                                    const isMe = msg.senderId === "admin";
                                    const isSelected = selectedMessages.has(msg.id);
                                    return (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex items-center gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} cursor-pointer group message-bubble`}
                                            onClick={() => toggleMessageSelection(msg.id)}
                                        >
                                            {(selectionMode || selectedMessages.size > 0) && (
                                                <div className={`shrink-0 transition-all ${isSelected ? "text-purple-600 scale-110" : "text-gray-300 opacity-50"}`}>
                                                    {isSelected ? <CheckCircle size={20} /> : <Square size={20} />}
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                                <div className={`
                                                group relative px-4 md:px-6 py-3 md:py-4 rounded-3xl text-[13px] md:text-sm font-medium leading-relaxed shadow-sm transition-all duration-200
                                                ${isMe
                                                        ? (isSelected ? "bg-purple-700" : "bg-purple-600") + " text-white rounded-tr-none shadow-xl shadow-purple-600/10"
                                                        : (isSelected ? "bg-purple-50 border-purple-200" : "bg-white border-gray-100") + " text-gray-800 rounded-tl-none border"
                                                    }
                                                ${isSelected ? "ring-2 ring-purple-600 ring-offset-2" : "hover:border-purple-200"}
                                            `}>
                                                    {msg.text}
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-1 px-1">
                                                    <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                    {isMe && <CheckCheck size={12} className="text-purple-600" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Input */}
                            <div className="p-4 md:p-8 bg-white border-t border-gray-100">
                                <form
                                    onSubmit={handleSendMessage}
                                    className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4 bg-gray-50 p-1.5 md:p-2 rounded-[2rem] border border-gray-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-600/10 transition-all shadow-inner"
                                >
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 h-12 md:h-14 bg-transparent border-none outline-none pl-4 md:pl-6 text-sm font-medium"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className={`
                                        h-12 md:h-14 px-4 md:px-8 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 transition-all
                                        ${newMessage.trim() && !sending
                                                ? "bg-purple-600 text-white shadow-xl shadow-purple-600/30 active:scale-95"
                                                : "bg-gray-200 text-gray-400"
                                            }
                                    `}
                                    >
                                        {sending ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <>
                                                <span className="hidden md:block text-xs font-black uppercase tracking-widest">Send Response</span>
                                                <Send size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-20 text-center animate-in fade-in duration-500">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2.5rem] md:rounded-[3rem] bg-purple-50 flex items-center justify-center text-purple-600 mb-6 md:mb-8 border border-purple-100">
                                <MessageSquare size={36} className="md:size-[40px]" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 md:mb-4 tracking-tight uppercase">Support Desk</h2>
                            <p className="text-gray-400 max-w-xs md:max-w-sm font-medium text-xs md:text-sm leading-relaxed">
                                Select a user conversation to start chatting.
                            </p>
                        </div>
                    )}
                </main>
                {/* Confirmation Modal */}
                {modalConfig.show && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                        <div
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
                        ></div>
                        <div className="relative bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300 border border-gray-100">
                            <div className="p-8 text-center">
                                <div className={`w-16 h-16 rounded-[2rem] mx-auto mb-6 flex items-center justify-center ${modalConfig.type === "danger" ? "bg-red-50 text-red-500" : "bg-purple-50 text-purple-600"}`}>
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{modalConfig.title}</h3>
                                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                    {modalConfig.message}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50/50 flex flex-col gap-2 border-t border-gray-100">
                                <button
                                    onClick={modalConfig.onConfirm}
                                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                                    ${modalConfig.type === "danger"
                                            ? "bg-red-600 text-white shadow-xl shadow-red-600/30 active:scale-[0.98] hover:bg-red-700"
                                            : "bg-purple-600 text-white shadow-xl shadow-purple-600/30 active:scale-[0.98] hover:bg-purple-700"
                                        }
                                `}
                                >
                                    Confirm Action
                                </button>
                                <button
                                    onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
                                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

