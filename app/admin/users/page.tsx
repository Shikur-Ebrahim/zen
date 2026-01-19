"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
    Users,
    Search,
    TrendingUp,
    UserCheck,
    UserMinus,
    ChevronRight,
    Loader2,
    Menu,
    Smartphone,
    CreditCard,
    Wallet,
    Crown
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

interface UserData {
    id: string;
    phoneNumber: string;
    totalRecharge: number;
    balance: number;
    vip: number;
    email?: string;
    uid: string;
    createdAt?: string;
    country?: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("totalRecharge", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserData[];
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filter === 'all' ||
            (filter === 'active' && (user.totalRecharge || 0) > 0) ||
            (filter === 'inactive' && (user.totalRecharge || 0) === 0);
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: users.length,
        active: users.filter(u => (u.totalRecharge || 0) > 0).length,
        inactive: users.filter(u => (u.totalRecharge || 0) === 0).length,
        totalRecharge: users.reduce((acc, u) => acc + (u.totalRecharge || 0), 0)
    };

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
                            Manager / <span className="text-indigo-600">Users</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 p-1 rounded-full border-2 border-indigo-100 overflow-hidden">
                            <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <button
                            onClick={() => setFilter('all')}
                            className={`text-left transition-all ${filter === 'all' ? 'scale-[1.02]' : ''}`}
                        >
                            <div className={`bg-white p-3 md:p-4 rounded-2xl border flex items-center gap-3 transition-all ${filter === 'all' ? 'border-indigo-600 shadow-lg shadow-indigo-600/5 ring-1 ring-indigo-600/20' : 'border-gray-100 shadow-sm'}`}>
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                                    <Users size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Total Users</p>
                                    <p className="text-lg font-black text-gray-900 leading-tight">{stats.total}</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`text-left transition-all ${filter === 'active' ? 'scale-[1.02]' : ''}`}
                        >
                            <div className={`bg-white p-3 md:p-4 rounded-2xl border flex items-center gap-3 transition-all ${filter === 'active' ? 'border-emerald-600 shadow-lg shadow-emerald-600/5 ring-1 ring-emerald-600/20' : 'border-gray-100 shadow-sm'}`}>
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                                    <UserCheck size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Active</p>
                                    <p className="text-lg font-black text-gray-900 leading-tight">{stats.active}</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => setFilter('inactive')}
                            className={`text-left transition-all ${filter === 'inactive' ? 'scale-[1.02]' : ''}`}
                        >
                            <div className={`bg-white p-3 md:p-4 rounded-2xl border flex items-center gap-3 transition-all ${filter === 'inactive' ? 'border-rose-600 shadow-lg shadow-rose-600/5 ring-1 ring-rose-600/20' : 'border-gray-100 shadow-sm'}`}>
                                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 flex-shrink-0">
                                    <UserMinus size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Inactive</p>
                                    <p className="text-lg font-black text-gray-900 leading-tight">{stats.inactive}</p>
                                </div>
                            </div>
                        </button>
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-3 md:p-4 rounded-2xl shadow-lg shadow-indigo-600/20 text-white flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                <TrendingUp size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold text-indigo-100 uppercase tracking-widest mb-0.5 truncate">Total Assets</p>
                                <p className="text-lg font-black truncate">ETB {stats.totalRecharge.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by phone number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-white border border-gray-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-medium text-gray-900 shadow-sm"
                        />
                    </div>

                    {/* Users List */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-indigo-600" size={40} />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Users...</p>
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-white p-4 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 border-gray-50 bg-gray-100">
                                                <img
                                                    src="/avator profile.jpg"
                                                    alt="User"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${(user.totalRecharge || 0) > 0 ? 'bg-emerald-500' : 'bg-gray-300'
                                                }`}>
                                                {(user.totalRecharge || 0) > 0 ? (
                                                    <UserCheck size={10} className="text-white" />
                                                ) : (
                                                    <UserMinus size={10} className="text-white" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-gray-900 truncate">
                                                    {user.phoneNumber || "No Phone"}
                                                </h3>
                                                {user.vip > 0 && (
                                                    <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight border border-amber-100">
                                                        <Crown size={10} />
                                                        VIP {user.vip}
                                                    </div>
                                                )}
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${(user.totalRecharge || 0) > 0
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-gray-50 text-gray-400 border-gray-100'
                                                    }`}>
                                                    {(user.totalRecharge || 0) > 0 ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex items-center gap-8 px-8 border-x border-gray-50">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Recharge</p>
                                                <p className="font-black text-gray-900">ETB {(user.totalRecharge || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Balance</p>
                                                <p className="font-black text-indigo-600">ETB {(user.balance || 0).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group-hover:translate-x-1">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>

                                    {/* Mobile Quick Stats */}
                                    <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4 md:hidden">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                <CreditCard size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Recharge</p>
                                                <p className="text-xs font-black text-gray-900">ETB {(user.totalRecharge || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                                                <Wallet size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Balance</p>
                                                <p className="text-xs font-black text-gray-900">ETB {(user.balance || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-[10px]">No users found</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
