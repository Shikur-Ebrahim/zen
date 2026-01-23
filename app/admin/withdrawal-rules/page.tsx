"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    addDoc,
    deleteDoc,
    serverTimestamp,
    getDocs,
    where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Plus,
    Search,
    Phone,
    Loader2 as Loader,
    Trash2,
    Edit2,
    Save,
    X,
    Users as UsersIcon,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Check,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";

function WithdrawalRulesManagement() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [rules, setRules] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        active: true,
        targetAll: false,
        targetUsers: [] as string[]
    });

    // User Search State
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
        });

        // Rules Listener
        const qRules = query(collection(db, "withdrawal_rules"), orderBy("createdAt", "desc"));
        const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
            const rulesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRules(rulesData);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRules();
        };
    }, [router]);

    // Handle user search
    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            if (userSearchQuery.length < 3) {
                setSearchResults([]);
                return;
            }

            setSearchingUsers(true);
            try {
                const q = query(
                    collection(db, "users"),
                    where("phoneNumber", ">=", userSearchQuery),
                    where("phoneNumber", "<=", userSearchQuery + "\uf8ff")
                );
                const querySnapshot = await getDocs(q);
                const results = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSearchResults(results);
            } catch (error) {
                console.error("Error searching users:", error);
            } finally {
                setSearchingUsers(false);
            }
        }, 500);

        return () => clearTimeout(searchTimer);
    }, [userSearchQuery]);

    const handleSaveRule = async () => {
        if (!formData.title || !formData.message) {
            alert("Please fill in both title and message.");
            return;
        }

        setSaving(true);
        try {
            const ruleData = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (editingRuleId) {
                const ruleRef = doc(db, "withdrawal_rules", editingRuleId);
                await updateDoc(ruleRef, ruleData);
            } else {
                await addDoc(collection(db, "withdrawal_rules"), {
                    ...ruleData,
                    createdAt: serverTimestamp()
                });
            }

            resetForm();
        } catch (error) {
            console.error("Error saving rule:", error);
            alert("Failed to save rule.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm("Are you sure you want to delete this rule?")) return;

        try {
            await deleteDoc(doc(db, "withdrawal_rules", ruleId));
        } catch (error) {
            console.error("Error deleting rule:", error);
            alert("Failed to delete rule.");
        }
    };

    const toggleUserSelection = (userId: string) => {
        setFormData(prev => ({
            ...prev,
            targetUsers: prev.targetUsers.includes(userId)
                ? prev.targetUsers.filter(id => id !== userId)
                : [...prev.targetUsers, userId]
        }));
    };

    const handleSelectAllFound = () => {
        const resultIds = searchResults.map(u => u.id);
        const newTargetUsers = Array.from(new Set([...formData.targetUsers, ...resultIds]));
        setFormData(prev => ({ ...prev, targetUsers: newTargetUsers }));
        toast.success(`Added ${resultIds.length} users to targeting`);
    };

    const resetForm = () => {
        setFormData({
            title: "",
            message: "",
            active: true,
            targetAll: false,
            targetUsers: []
        });
        setEditingRuleId(null);
        setIsAdding(false);
        setUserSearchQuery("");
        setSearchResults([]);
    };

    const startEditing = (rule: any) => {
        setFormData({
            title: rule.title,
            message: rule.message,
            active: rule.active,
            targetAll: rule.targetAll || false,
            targetUsers: rule.targetUsers || []
        });
        setEditingRuleId(rule.id);
        setIsAdding(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-indigo-600">
                <Loader className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FD] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <Menu size={24} className="text-gray-600" />
                        </button>
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest hidden sm:block">
                            Manager / <span className="text-indigo-600">Withdrawal Rules</span>
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            if (isAdding) resetForm();
                            else setIsAdding(true);
                        }}
                        className={`px-6 py-2.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${isAdding
                            ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:scale-105"
                            }`}
                    >
                        {isAdding ? <X size={18} /> : <Plus size={18} />}
                        {isAdding ? "Cancel" : "New Rule"}
                    </button>
                </header>

                <main className="p-4 md:p-8 max-w-5xl mx-auto w-full">
                    {/* Welcome Card */}
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20 mb-8 overflow-hidden relative">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-black mb-2">Withdrawal Rules 🏧</h1>
                            <p className="text-white/80 font-medium">Create targeted messages that appear when users initiate a withdrawal.</p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    </div>

                    {isAdding ? (
                        /* Create/Edit Form */
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                {editingRuleId ? <Edit2 size={24} className="text-indigo-500" /> : <Plus size={24} className="text-indigo-500" />}
                                {editingRuleId ? "Edit Withdrawal Rule" : "Create New Rule"}
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Rule Title (Internal)</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g. Mandatory Partner Activation"
                                        className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">User-Facing Message</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                        placeholder="Describe the rule to the user..."
                                        rows={4}
                                        className="w-full p-6 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center gap-4 py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200">
                                        <div className="flex-1">
                                            <label className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Status</label>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Enable this rule platform-wide</p>
                                        </div>
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                                            className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${formData.active ? "bg-emerald-500" : "bg-slate-300"}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.active ? "left-7" : "left-1"}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4 py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200">
                                        <div className="flex-1">
                                            <label className="text-sm font-black text-slate-800 uppercase tracking-widest">Target All Users</label>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Broadcast to every member</p>
                                        </div>
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, targetAll: !prev.targetAll }))}
                                            className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${formData.targetAll ? "bg-indigo-600" : "bg-slate-300"}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.targetAll ? "left-7" : "left-1"}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* Target User Selection */}
                                {!formData.targetAll && (
                                    <div className="space-y-6 border-t border-slate-100 pt-8 animate-in fade-in slide-in-from-top-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Target Specific Users ({formData.targetUsers.length})</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Search and select individual accounts</p>
                                            </div>
                                            {searchResults.length > 0 && (
                                                <button
                                                    onClick={handleSelectAllFound}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                                >
                                                    Add All Results
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative group">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                value={userSearchQuery}
                                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                                placeholder="Search by phone number (e.g. 09...)"
                                                className="w-full h-14 pl-14 pr-6 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white font-bold transition-all shadow-inner placeholder:text-slate-300"
                                            />
                                            {searchingUsers && <Loader className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-indigo-600" />}
                                        </div>

                                        {/* Search Results */}
                                        {searchResults.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {searchResults.map(user => {
                                                    const isSelected = formData.targetUsers.includes(user.id);
                                                    return (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => toggleUserSelection(user.id)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isSelected
                                                                ? "bg-indigo-50 border-indigo-200"
                                                                : "bg-white border-gray-100 hover:border-gray-200"
                                                                }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                                                                <Phone size={18} />
                                                            </div>
                                                            <div className="text-left flex-1 min-w-0">
                                                                <p className="text-sm font-black text-gray-900 truncate">{user.phoneNumber}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase truncate">VIP {user.vip || 0}</p>
                                                            </div>
                                                            {isSelected && <CheckCircle2 size={18} className="text-indigo-600" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Selected Users Summary */}
                                        {formData.targetUsers.length > 0 && (
                                            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Selected User IDs</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.targetUsers.map(id => (
                                                        <div key={id} className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-gray-600 font-mono">{id.slice(0, 8)}...</span>
                                                            <button
                                                                onClick={() => toggleUserSelection(id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveRule}
                                    disabled={saving}
                                    className="w-full h-16 bg-indigo-600 text-white rounded-[1.8rem] font-black text-base uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-8 disabled:opacity-50"
                                >
                                    {saving ? <Loader className="animate-spin" /> : <Save size={20} />}
                                    {editingRuleId ? "Update Withdrawal Rule" : "Publish Withdrawal Rule"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Rules List */
                        <div className="space-y-4">
                            {rules.length === 0 ? (
                                <div className="py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                                    <AlertCircle size={48} className="opacity-10 mb-4" />
                                    <p className="font-bold uppercase tracking-widest text-xs">No withdrawal rules created yet</p>
                                </div>
                            ) : (
                                rules.map(rule => (
                                    <div
                                        key={rule.id}
                                        className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-all ${rule.active ? "border-gray-100" : "border-gray-200 bg-gray-50/50"}`}
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black text-gray-900 uppercase">{rule.title}</h3>
                                                    {rule.active ? (
                                                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">Active</span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-200 uppercase tracking-widest">Disabled</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 text-sm font-medium leading-relaxed italic line-clamp-2">
                                                    "{rule.message}"
                                                </p>
                                                <div className="flex items-center gap-4 pt-2">
                                                    {rule.targetAll ? (
                                                        <div className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-black uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">
                                                            <UsersIcon size={12} />
                                                            Global Rule
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">
                                                            <UsersIcon size={12} />
                                                            {rule.targetUsers?.length || 0} Segmented Users
                                                        </div>
                                                    )}
                                                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-l border-slate-200 pl-4">
                                                        Updated {rule.updatedAt?.toDate().toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex sm:flex-col gap-2">
                                                <button
                                                    onClick={() => startEditing(rule)}
                                                    className="flex-1 sm:w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title="Edit Rule"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRule(rule.id)}
                                                    className="flex-1 sm:w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                    title="Delete Rule"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function WithdrawalRulesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white text-indigo-600">
                <Loader className="w-12 h-12 animate-spin" />
            </div>
        }>
            <WithdrawalRulesManagement />
        </Suspense>
    );
}
