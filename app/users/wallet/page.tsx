"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ArrowRight,
    Shield,
    History,
    Gem,
    Activity,
    Coins,
    ClipboardList,
    Star,
    ArrowLeftRight,
    Banknote,
    Loader2,
    ChevronLeft,
    RefreshCcw
} from "lucide-react";

export default function WalletPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cardBgImage, setCardBgImage] = useState<string | null>(null);
    const [productImages, setProductImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isResetting, setIsResetting] = useState(false);

    const [refreshing, setRefreshing] = useState(false);
    const [hasRateUpdate, setHasRateUpdate] = useState(false);
    const [lastSeenRateUpdate, setLastSeenRateUpdate] = useState<number>(0);

    const fetchProductData = async (uid: string) => {
        try {
            const ordersRef = collection(db, "UserOrders");
            const q = query(
                ordersRef,
                where("userId", "==", uid)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Sort client-side to avoid needing a composite index
                const docs = [...querySnapshot.docs].sort((a, b) => {
                    const timeA = a.data().createdAt?.seconds || 0;
                    const timeB = b.data().createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                // Fetch images for ALL products
                const imagePromises = docs.map(async (orderDoc) => {
                    const orderData = orderDoc.data();
                    if (orderData.productId) {
                        const productRef = doc(db, "Products", orderData.productId);
                        const productSnap = await getDoc(productRef);
                        if (productSnap.exists()) {
                            return productSnap.data().imageUrl || null;
                        }
                    }
                    return null;
                });

                const resolvedImages = await Promise.all(imagePromises);
                const validImages = resolvedImages.filter((img): img is string => img !== null);

                setProductImages(validImages);

                // Keep cardBgImage logic for potential backward compatibility or other uses, 
                // setting it to the most recent product image
                if (validImages.length > 0) {
                    setCardBgImage(validImages[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching product data:", error);
        }
    };

    const handleRefresh = async () => {
        if (!user) return;
        setRefreshing(true);
        await fetchProductData(user.uid);
        // Simulate a small delay for visual feedback if fetch is too fast
        await new Promise(resolve => setTimeout(resolve, 500));
        setRefreshing(false);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Real-time subscription to user data
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeData = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                    // Get last seen rate update timestamp
                    const lastSeen = doc.data().lastSeenRateUpdate || 0;
                    setLastSeenRateUpdate(lastSeen);
                }
                setLoading(false);
            });

            // Real-time subscription to currency rates
            const ratesRef = doc(db, "Settings", "currency");
            const unsubscribeRates = onSnapshot(ratesRef, (doc) => {
                if (doc.exists()) {
                    const rateData = doc.data();
                    const lastUpdate = rateData.lastUpdated || 0;

                    // Check if there's a new update that user hasn't seen
                    if (lastUpdate > lastSeenRateUpdate && lastSeenRateUpdate > 0) {
                        setHasRateUpdate(true);
                    }
                }
            });

            // Fetch product images
            await fetchProductData(currentUser.uid);

            return () => {
                unsubscribeData();
                unsubscribeRates();
            };
        });

        return () => unsubscribe();
    }, [router, lastSeenRateUpdate]);

    // Auto-slide effect for product images
    useEffect(() => {
        if (productImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => prev + 1);
        }, 3000);

        return () => clearInterval(interval);
    }, [productImages.length]);

    const hasImages = productImages.length > 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-pink-50 flex flex-col overflow-hidden text-slate-900 select-none font-sans">
            {/* Header */}
            <header className="px-6 pt-12 pb-2 flex items-center justify-between z-20">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-pink-100 shadow-sm border border-pink-200 flex items-center justify-center text-[#3E2723] active:scale-95 transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-[#3E2723] tracking-wide uppercase">My Wallet</span>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-10 h-10 rounded-full bg-pink-100 shadow-sm border border-pink-200 flex items-center justify-center text-[#3E2723] active:scale-95 transition-all disabled:opacity-50"
                >
                    <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
                </button>
            </header>

            <main className="flex-1 flex flex-col px-5 pt-4 space-y-6 overflow-y-auto pb-32 no-scrollbar">

                {/* 1. Premium Balance Card */}
                <section className="relative animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative w-full aspect-[1.8/1] rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/20 group">
                        {/* Dynamic Background with Auto-Slide */}
                        {hasImages ? (
                            <div className="absolute inset-0 overflow-hidden z-0 rounded-[2rem]">
                                <div
                                    className="flex h-full w-full"
                                    style={{
                                        transform: `translateX(-${currentImageIndex * 100}%)`,
                                        transition: isResetting ? 'none' : 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    onTransitionEnd={() => {
                                        if (currentImageIndex >= productImages.length) {
                                            setIsResetting(true);
                                            setCurrentImageIndex(0);
                                            setTimeout(() => setIsResetting(false), 50);
                                        }
                                    }}
                                >
                                    {/* Clone first image at the end for seamless loop */}
                                    {[...productImages, productImages[0]].map((img, index) => (
                                        <div
                                            key={index}
                                            className="flex-shrink-0 w-full h-full bg-cover bg-center"
                                            style={{ backgroundImage: `url(${img})` }}
                                        ></div>
                                    ))}
                                </div>
                                {/* Optional: Indicators could go here if needed, but keeping it clean for now */}
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#3E2723] via-[#5D4037] to-[#6D4C41] z-0"></div>
                        )}

                        {/* Decorative elements (only if NO image) */}
                        {!hasImages && (
                            <>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                            </>
                        )}

                        {/* Card Content */}
                        <div className={`relative z-10 h-full flex flex-col justify-between p-6 pointer-events-none ${hasImages ? 'text-slate-900' : 'text-white'}`}>
                            <div className="flex justify-between items-start">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${hasImages ? 'bg-white/80 border-slate-200' : 'bg-white/10 border-white/10'}`}>
                                    <Gem size={12} className={hasImages ? "text-amber-500" : "text-yellow-300"} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${hasImages ? 'opacity-100' : 'opacity-90'}`}>Premium Asset</span>
                                </div>
                                <Shield size={16} className={hasImages ? "text-slate-900/40" : "text-white/60"} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className={`text-xs font-medium uppercase tracking-widest ${hasImages ? 'text-slate-700' : 'text-white/80'}`}>Total Balance</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tight drop-shadow-sm">
                                        {Number(userData?.balance || 0).toLocaleString()}
                                    </span>
                                    <span className={`text-sm font-bold ${hasImages ? 'text-slate-600' : 'text-white/80'}`}>ETB</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* 2. Primary Actions Grid */}
                <section className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    {/* Recharge */}
                    <button
                        onClick={() => router.push("/users/recharge")}
                        className="flex flex-col items-center gap-3 group"
                    >
                        <div className="w-20 h-20 rounded-[1.8rem] bg-pink-100 shadow-xl shadow-pink-200 border border-pink-200 flex items-center justify-center relative overflow-hidden group-active:scale-95 transition-all duration-300">
                            <div className="absolute inset-0 bg-pink-200/50 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <img
                                src="/assets/wallet_recharge_3d.png"
                                alt="Recharge"
                                className="w-14 h-14 object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <span className="text-xs font-bold text-[#3E2723] tracking-wide">Recharge</span>
                    </button>

                    {/* Withdraw */}
                    <button
                        onClick={() => router.push("/users/withdraw")}
                        className="flex flex-col items-center gap-3 group"
                    >
                        <div className="w-20 h-20 rounded-[1.8rem] bg-pink-100 shadow-xl shadow-pink-200 border border-pink-200 flex items-center justify-center relative overflow-hidden group-active:scale-95 transition-all duration-300">
                            <div className="absolute inset-0 bg-pink-200/50 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <img
                                src="/assets/wallet_withdraw_3d.png"
                                alt="Withdraw"
                                className="w-14 h-14 object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <span className="text-xs font-bold text-[#3E2723] tracking-wide">Withdraw</span>
                    </button>

                    {/* Exchange */}
                    <button
                        onClick={() => router.push("/users/exchange")}
                        className="flex flex-col items-center gap-3 group"
                    >
                        <div className="w-20 h-20 rounded-[1.8rem] bg-pink-100 shadow-xl shadow-pink-200 border border-pink-200 flex items-center justify-center relative overflow-hidden group-active:scale-95 transition-all duration-300">
                            <div className="absolute inset-0 bg-pink-200/50 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <img
                                src="/assets/wallet_exchange_3d.png"
                                alt="Exchange"
                                className="w-14 h-14 object-contain drop-shadow-md transform group-hover:rotate-180 transition-transform duration-700"
                            />
                        </div>
                        <span className="text-xs font-bold text-[#3E2723] tracking-wide">Exchange</span>
                    </button>
                </section>

                {/* 3. Detailed Income Stats */}
                <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <h3 className="text-xs font-black text-[#3E2723]/60 uppercase tracking-widest pl-2">Financial Insights</h3>

                    {/* Team Revenue */}
                    {/* Team Revenue - Advanced Card */}
                    <div className="bg-[#3E2723] rounded-[2rem] p-5 shadow-xl shadow-[#3E2723]/30 border border-[#3E2723] flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-white/10"></div>

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-2 shadow-sm">
                                <img
                                    src="/assets/team_income_3d.png"
                                    alt="Team"
                                    className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Team Income</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-white">
                                        {Number(userData?.teamIncome || 0).toLocaleString()}
                                    </span>
                                    <div className="w-6 h-6 relative perspective-1000">
                                        <img
                                            src="/assets/advanced_3d_coin.png"
                                            alt="Coin"
                                            className="w-full h-full object-contain animate-[spin_3s_linear_infinite] drop-shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Task Revenue - Advanced Card (Fixed Icons) */}
                    <div className="bg-[#3E2723] rounded-[2rem] p-5 shadow-xl shadow-[#3E2723]/30 border border-[#3E2723] flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-white/10"></div>

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                <ClipboardList size={32} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Zen Stars</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-white">
                                        {Number(userData?.stars || 0).toLocaleString()}
                                    </span>
                                    {/* Rotating Transparent Star */}
                                    <Star size={24} className="text-amber-400 fill-amber-400 animate-[spin_4s_linear_infinite]" />
                                </div>
                            </div>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Exchange Rate Card (New) */}
                    <div
                        onClick={() => router.push("/users/currency-rates")}
                        className="bg-[#3E2723] rounded-[2rem] p-5 shadow-xl shadow-[#3E2723]/30 border border-[#3E2723] flex items-center justify-between relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-white/10"></div>

                        {/* Notification Badge */}
                        {hasRateUpdate && (
                            <div className="absolute -top-2 -right-2 z-30">
                                <div className="relative">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                                        <span className="text-[10px] font-black text-white">!</span>
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4 relative z-10">
                            {/* Icon Stack */}
                            <div className="w-16 h-16 relative">
                                <div className="absolute inset-0 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-violet-400 shadow-sm z-10">
                                    <ArrowLeftRight size={32} />
                                </div>
                                {/* Floating Background Elements representing assets */}
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-white shadow-sm z-20 animate-bounce delay-700">
                                    <Star size={14} className="text-amber-500 fill-amber-500" />
                                </div>
                                <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-white shadow-sm z-20 animate-bounce">
                                    <Banknote size={14} className="text-blue-500" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Exchange Rates</span>
                                    {hasRateUpdate && (
                                        <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">Updated!</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-white">ETB</span>
                                    <span className="text-white/40">•</span>
                                    <span className="text-sm font-bold text-white">Coin</span>
                                    <span className="text-white/40">•</span>
                                    <span className="text-sm font-bold text-white">Star</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
