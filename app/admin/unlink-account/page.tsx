"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    updateDoc,
    deleteDoc,
    doc
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Home,
    ImageIcon,
    Banknote,
    Building2,
    ShieldCheck,
    Bell,
    Percent,
    Send,
    MessageSquare,
    BookOpen,
    Settings,
    Search,
    Loader2,
    Pencil,
    Trash2,
    Save,
    X,
    UserX,
    CreditCard,
    Menu
} from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminUnlinkAccount() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [banks, setBanks] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        holderName: "",
        accountNumber: ""
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const q = query(collection(db, "Bank"), orderBy("linkedAt", "desc"));
        const unsubscribeBanks = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBanks(data);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeBanks();
        };
    }, [router]);

    const handleLogout = async () => {
        localStorage.removeItem("admin_session");
        await signOut(auth);
        router.push("/");
    };

    const startEditing = (bank: any) => {
        setEditingId(bank.id);
        setEditForm({
            holderName: bank.holderName,
            accountNumber: bank.accountNumber
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm({ holderName: "", accountNumber: "" });
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateDoc(doc(db, "Bank", id), {
                holderName: editForm.holderName,
                accountNumber: editForm.accountNumber
            });
            toast.success("Bank account updated successfully");
            setEditingId(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update bank account");
        }
    };

    const handleUnlink = async (id: string) => {
        if (!confirm("Are you sure you want to unlink (delete) this bank account? The user will need to link again.")) return;

        try {
            await deleteDoc(doc(db, "Bank", id));
            toast.success("Bank account unlinked successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to unlink bank account");
        }
    };

    const filteredBanks = banks.filter(bank =>
        bank.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.holderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.accountNumber?.includes(searchTerm)
    );


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-indigo-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar */}
            {/* Sidebar Replaced */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40">
                    <h1 className="text-xl font-black text-slate-900">Unlink Account</h1>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Menu size={24} />
                    </button>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Unlink Account</h2>
                                <p className="text-slate-500 font-medium mt-1">Manage user bank accounts and unlinking requests</p>
                            </div>

                            {/* Search Bar */}
                            <div className="relative w-full md:w-96">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by phone number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Accounts List */}
                        {/* Accounts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredBanks.length === 0 ? (
                                <div className="col-span-full py-24 bg-white rounded-[2rem] border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <Search size={32} />
                                    </div>
                                    <p className="font-bold">No accounts found matching "{searchTerm}"</p>
                                </div>
                            ) : (
                                filteredBanks.map((bank) => (
                                    <div key={bank.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 group">
                                        {/* Header: Phone & Actions */}
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100">
                                                    <img src="/avator profile.jpg" alt="Profile" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Phone Number</p>
                                                    <p className="font-black text-slate-900 text-lg tracking-tight">{bank.phoneNumber || "No Phone"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {editingId === bank.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdate(bank.id)}
                                                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                            title="Save Changes"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditing(bank)}
                                                        className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                                                        title="Edit Details"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUnlink(bank.id)}
                                                    className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Unlink Account"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content: Bank & Account Details */}
                                        <div className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                                            {/* Bank Info */}
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank</p>
                                                <div className="flex items-center gap-2">
                                                    {bank.bankLogoUrl && (
                                                        <img src={bank.bankLogoUrl} alt={bank.bankName} className="w-5 h-5 object-contain" />
                                                    )}
                                                    <span className="text-xs font-black text-slate-700">{bank.bankName}</span>
                                                </div>
                                            </div>

                                            {/* Account Holder */}
                                            <div className="flex flex-col items-start gap-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holder Name</p>
                                                {editingId === bank.id ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.holderName}
                                                        onChange={(e) => setEditForm({ ...editForm, holderName: e.target.value })}
                                                        className="w-full px-2 py-1 rounded-lg border border-indigo-200 text-xs font-bold focus:outline-none focus:border-indigo-500 text-left bg-white"
                                                    />
                                                ) : (
                                                    <span className="text-xs font-black text-slate-700 text-left">{bank.holderName}</span>
                                                )}
                                            </div>

                                            {/* Account Number */}
                                            <div className="flex flex-col items-start gap-1 pt-2 border-t border-slate-200 border-dashed">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Number</p>
                                                {editingId === bank.id ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.accountNumber}
                                                        onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                                                        className="w-full px-2 py-1 rounded-lg border border-indigo-200 text-sm font-black text-indigo-600 focus:outline-none focus:border-indigo-500 text-left bg-white font-mono"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-black text-indigo-600 font-mono tracking-wider text-left">{bank.accountNumber}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function LogOut(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
    )
}
