"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Plus,
    Trash2,
    LogOut,
    Bell,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminNotifications() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [newNotification, setNewNotification] = useState("");
    const [notifLoading, setNotifLoading] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
            const notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifData);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeNotifs();
        };
    }, [router]);

    const handleAddNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNotification) return;
        setNotifLoading(true);
        try {
            await addDoc(collection(db, "notifications"), {
                text: newNotification,
                createdAt: new Date().toISOString()
            });
            setNewNotification("");
            setStatus({ type: "success", message: "Withdrawal alert published!" });
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to post notification." });
        } finally {
            setNotifLoading(false);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    const handleDeleteNotification = async (id: string) => {
        if (!confirm("Delete this withdrawal alert?")) return;
        try {
            await deleteDoc(doc(db, "notifications", id));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-purple-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FD] flex">
            {/* Sidebar */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 leading-none">Withdrawal Alerts</h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Notification Manager</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border border-purple-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <main className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Status Messages */}
                    {status.message && (
                        <div className={`p-6 rounded-3xl flex items-center gap-4 border animate-in slide-in-from-top-4 ${status.type === "success" ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                            }`}>
                            {status.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            <span className="font-bold">{status.message}</span>
                        </div>
                    )}

                    {/* Add Notification Form */}
                    <section className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-purple-900/5 border border-gray-50">
                        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                            <Bell className="text-purple-600" />
                            Direct Broadcast
                        </h2>
                        <form onSubmit={handleAddNotification} className="space-y-4">
                            <div className="relative">
                                <textarea
                                    value={newNotification}
                                    onChange={(e) => setNewNotification(e.target.value)}
                                    placeholder="Example: User ***452 just withdrew 5,000 ETB successfully!"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] p-6 text-gray-900 font-medium focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition-all resize-none h-32"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={notifLoading || !newNotification}
                                className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {notifLoading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                Broadcast Notification
                            </button>
                        </form>Section
                    </section>

                    {/* Notifications List */}
                    <section className="space-y-4 pb-20">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Live Feed</h3>
                            <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black">{notifications.length} ACTIVE</span>
                        </div>

                        {notifications.length > 0 ? (
                            <div className="grid gap-4">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-xl hover:shadow-purple-900/5 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                                <Bell size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{notif.text}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                    {new Date(notif.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteNotification(notif.id)}
                                            className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 bg-white rounded-[2.5rem] border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                                <Bell size={48} className="mb-4 opacity-10" />
                                <p className="font-black uppercase tracking-widest text-[10px]">No alerts live right now</p>
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}
