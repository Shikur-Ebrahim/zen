"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    Home,
    Wallet,
    Ship,
    Users,
    Bell,
    TrendingUp,
    Loader2,
    Shield,
    Package,
    ChevronLeft,
    Star,
    Sparkles,
    Zap,
    Clock,
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserProductsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Product State
    const [products, setProducts] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [fetchingProducts, setFetchingProducts] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        // Fetch Products - Smaller price at the top
        const qProducts = query(collection(db, "Products"), orderBy("price", "asc"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
            setFetchingProducts(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeProducts();
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-[#C9A24D]/20 border-t-[#C9A24D] rounded-full animate-spin"></div>
                    <Loader2 className="w-6 h-6 animate-spin text-[#C9A24D] absolute inset-0 m-auto" />
                </div>
            </div>
        );
    }

    const filteredProducts = products.filter(p => {
        if (activeCategory === "ALL") return true;

        const normalize = (c: string) => {
            if (!c) return "A";
            const val = c.toLowerCase().replace("level ", "").trim().toUpperCase();
            if (val === "1") return "A";
            if (val === "2") return "B";
            if (val === "3") return "C";
            return val;
        };

        return normalize(p.category) === normalize(activeCategory);
    });

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-44 overflow-x-hidden">
            {/* Ambient Background Elements - Subtle */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#C9A24D]/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] bg-[#8B5E3C]/5 blur-[100px] rounded-full"></div>
            </div>

            {/* Premium Glass Header */}
            <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-[#EDEDED] mx-auto max-w-lg shadow-sm">
                <div className="flex items-center gap-5">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push("/users/welcome")}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-[#EDEDED] text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-all shadow-sm"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                    </motion.button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight leading-tight text-[#1A1A1A]">Store</h1>
                        <span className="text-[10px] font-medium text-[#C9A24D] tracking-wider uppercase font-black">Zen Catalog</span>
                    </div>
                </div>
                <motion.div
                    initial={{ rotate: -10 }}
                    animate={{ rotate: 0 }}
                    className="w-12 h-12 relative p-1 bg-[#F9F9F9] rounded-2xl border border-[#EDEDED]"
                >
                    <img src="/zen-3d-logo.png" alt="Zen Logo" className="w-full h-full object-contain" />
                </motion.div>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto relative z-10">
                <div className="space-y-10">

                    {/* Elite Category Navigation */}
                    <div className="bg-[#F9F9F9] p-1.5 rounded-[2rem] border border-[#EDEDED] flex gap-1 justify-between items-center max-w-full overflow-x-auto no-scrollbar">
                        {[
                            { id: "ALL", label: "ALL" },
                            { id: "Level A", label: "LEVEL A" },
                            { id: "Level B", label: "LEVEL B" },
                            { id: "Level C", label: "LEVEL C" },
                            { id: "VIP", label: "VIP" }
                        ].map((cat, idx) => (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex-1 py-3 rounded-2xl text-[8px] font-black tracking-widest transition-all市场 whitespace-nowrap市场 ${activeCategory === cat.id
                                    ? "bg-[#C9A24D] text-white shadow-[0_10px_20px_rgba(201,162,77,0.2)] scale-[1.02]"
                                    : "text-[#1A1A1A]/30 hover:text-[#1A1A1A]/60"
                                    }`}
                            >
                                {cat.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Boutique Grid */}
                    <div className="pb-20">
                        {fetchingProducts ? (
                            <div className="py-32 flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-2 border-[#EDEDED] border-t-[#C9A24D] rounded-full animate-spin"></div>
                                <p className="text-[11px] font-black text-[#1A1A1A]/20 tracking-widest uppercase">Initializing Store</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-24 flex flex-col items-center justify-center bg-[#F9F9F9] rounded-[3rem] border border-[#EDEDED] italic text-[#1A1A1A]/20"
                            >
                                <Package size={48} className="mb-6 opacity-10" />
                                <p className="text-[10px] font-medium tracking-widest uppercase">No products in {activeCategory}</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {filteredProducts.map((product, idx) => (
                                        <motion.div
                                            key={product.id}
                                            layout
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                                            onClick={() => router.push(`/users/product/${product.id}`)}
                                            className="group relative bg-white rounded-[2.5rem] p-7 border border-[#EDEDED] active:scale-[0.98] transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-xl hover:border-[#EDEDED]/50"
                                        >
                                            {/* Luxury Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A24D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            {/* Tracking Bar - Enhanced Vibrant Colors */}
                                            {product.showTracking && (
                                                <div className="absolute top-0 left-0 right-0 z-20 p-4">
                                                    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-purple-200/50 shadow-xl shadow-purple-500/10">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
                                                                </div>
                                                                <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Selling Fast</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[#1A1A1A]">
                                                                <span className="text-purple-600">{Math.min(100, Math.round(((product.trackingCurrent || 0) / (product.trackingTarget || 100)) * 100))}%</span>
                                                                <span className="text-[#1A1A1A]/40 ml-1">Sold</span>
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-gradient-to-r from-purple-100 to-blue-100 rounded-full overflow-hidden shadow-inner">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, ((product.trackingCurrent || 0) / (product.trackingTarget || 100)) * 100)}%` }}
                                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                                                            ></motion.div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Product Image Stage */}
                                            <div className="aspect-[16/10] w-full rounded-[2rem] overflow-hidden bg-[#F9F9F9] relative shadow-inner border border-[#EDEDED] group-hover:border-[#C9A24D]/30 transition-all duration-500">
                                                {product.imageUrl ? (
                                                    <motion.img
                                                        whileHover={{ scale: 1.1 }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#EDEDED]">
                                                        <Package size={52} strokeWidth={1} />
                                                    </div>
                                                )}

                                                {/* Category Badge Floating */}
                                                <div className="absolute top-5 right-5 px-4 py-1.5 bg-white/90 backdrop-blur-xl border border-[#EDEDED] rounded-full shadow-sm">
                                                    <span className="text-[9px] font-black text-[#C9A24D] tracking-[0.15em]">{(product.category || "LEVEL A").toUpperCase()}</span>
                                                </div>
                                            </div>

                                            <div className="mt-8 space-y-8">
                                                {/* Header Info */}
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight leading-none">{product.name}</h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-medium text-[#1A1A1A]/20 tracking-wide block mb-1">Price</span>
                                                        <span className="text-2xl font-bold text-[#8B5E3C]">
                                                            {product.price?.toLocaleString()}
                                                            <span className="text-[10px] ml-1.5 text-[#8B5E3C]/60 font-bold tracking-tight">ETB</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* ROI Stats Grid */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-[#F9F9F9] rounded-2xl p-5 border border-[#EDEDED] flex flex-col gap-2">
                                                        <span className="text-[10px] font-medium text-[#1A1A1A]/40 tracking-wide">Daily Profit</span>
                                                        <p className="text-xl font-bold text-[#8B5E3C] leading-none">
                                                            {product.dailyIncome?.toLocaleString()}
                                                            <span className="text-[10px] ml-1.5 font-medium text-[#1A1A1A]/30">ETB</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-[#F9F9F9] rounded-2xl p-5 border border-[#EDEDED] flex flex-col gap-2">
                                                        <span className="text-[10px] font-medium text-[#1A1A1A]/40 tracking-wide">Duration</span>
                                                        <p className="text-xl font-bold text-[#8B5E3C] leading-none">
                                                            {product.contractPeriod}
                                                            <span className="text-[10px] ml-1.5 font-medium text-[#1A1A1A]/30">Days</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* CTA Button */}
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="w-full h-16 bg-[#C9A24D] rounded-[1.5rem] flex items-center justify-center shadow-[0_15px_30px_-5px_rgba(201,162,77,0.3)] hover:shadow-[#C9A24D]/40 transition-all border border-[#C9A24D]/10"
                                                >
                                                    <span className="text-[12px] font-black text-white tracking-[0.25em] uppercase">BUY</span>
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </main>

        </div>
    );
}
