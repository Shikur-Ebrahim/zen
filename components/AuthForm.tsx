"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, Eye, EyeOff, ChevronDown, AlertCircle, Send, UserX, ShieldAlert } from "lucide-react";
import { countries, phoneValidationRules } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthForm() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"login" | "register">("register");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
        country: "Ethiopia",
        phonePrefix: "+251",
        phoneNumber: "",
    });

    const [supportLink, setSupportLink] = useState<string | null>(null);
    const [isAccountBlocked, setIsAccountBlocked] = useState(false);

    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "phoneNumber") {
            if (activeTab === "login") {
                setFormData((prev) => ({ ...prev, [name]: value }));
                return;
            }

            const numericValue = value.replace(/\D/g, "");
            const rules = phoneValidationRules[formData.country];

            if (!rules) {
                setFormData((prev) => ({ ...prev, [name]: numericValue }));
                return;
            }

            if (numericValue.length === 0) {
                setFormData((prev) => ({ ...prev, [name]: "" }));
                return;
            }

            if (rules.startsWith && !rules.startsWith.includes(numericValue[0])) {
                return;
            }

            const maxLength = Array.isArray(rules.length) ? rules.length[1] : rules.length;

            if (numericValue.length <= maxLength) {
                setFormData((prev) => ({ ...prev, [name]: numericValue }));
            }
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === "country") {
            const selectedCountry = countries.find((c) => c.name === value);
            if (selectedCountry) {
                setFormData((prev) => ({ ...prev, country: value, phonePrefix: selectedCountry.prefix, phoneNumber: "" }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (activeTab === "register") {
                const phoneNumber = formData.phoneNumber.replace(/\D/g, "");
                const rules = phoneValidationRules[formData.country];

                if (rules) {
                    if (Array.isArray(rules.length)) {
                        if (phoneNumber.length < rules.length[0] || phoneNumber.length > rules.length[1]) {
                            throw new Error(rules.errorMsg);
                        }
                    } else {
                        if (phoneNumber.length !== rules.length) {
                            throw new Error(rules.errorMsg);
                        }
                    }

                    if (rules.startsWith && !rules.startsWith.includes(phoneNumber[0])) {
                        throw new Error(rules.errorMsg);
                    }
                }

                const fullPhoneNumber = `${formData.phonePrefix}${formData.phoneNumber}`;
                const sanitizedPhone = fullPhoneNumber.replace(/\+/g, "").replace(/\s/g, "");
                const generatedEmail = `${sanitizedPhone}@dpm.app`;

                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Passwords do not match");
                }

                const userCredential = await createUserWithEmailAndPassword(auth, generatedEmail, formData.password);
                const user = userCredential.user;

                let inviterData = {
                    inviterA: "",
                    inviterB: "",
                    inviterC: "",
                    inviterD: ""
                };

                const searchParams = new URLSearchParams(window.location.search);
                const refParam = searchParams.get("ref");
                let refCode = refParam || localStorage.getItem("dpm_ref");

                if (refParam) {
                    localStorage.setItem("dpm_ref", refParam);
                }

                if (refCode) {
                    let normalizedRef = refCode.trim();
                    let foundInviter: any = null;

                    const uidDocSnap = await getDoc(doc(db, "users", normalizedRef));
                    if (uidDocSnap.exists()) {
                        foundInviter = uidDocSnap.data();
                    } else {
                        let phoneSearch = normalizedRef;
                        if (/^\d+$/.test(phoneSearch)) {
                            phoneSearch = "+" + phoneSearch;
                        }

                        const q = query(collection(db, "users"), where("phoneNumber", "==", phoneSearch));
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            foundInviter = querySnapshot.docs[0].data();
                        }
                    }

                    if (foundInviter) {
                        inviterData.inviterA = foundInviter.uid;
                        inviterData.inviterB = foundInviter.inviterA || "";
                        inviterData.inviterC = foundInviter.inviterB || "";
                        inviterData.inviterD = foundInviter.inviterC || "";
                    }
                }

                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: generatedEmail,
                    country: formData.country,
                    phoneNumber: fullPhoneNumber,
                    vip: 0,
                    balance: 0,
                    Recharge: 0,
                    totalRecharge: 0,
                    totalWithdrawal: 0,
                    teamIncome: 0,
                    taskIncome: 0,
                    teamSize: 0,
                    investedTeamSize: 0,
                    teamAssets: 0,
                    totalIncome: 0,
                    dailyIncome: 0,
                    inviterA: inviterData.inviterA,
                    inviterB: inviterData.inviterB,
                    inviterC: inviterData.inviterC,
                    inviterD: inviterData.inviterD,
                    createdAt: new Date().toISOString(),
                });

                const invitersToUpdate = [
                    { uid: inviterData.inviterA, level: "Level A" },
                    { uid: inviterData.inviterB, level: "Level B" },
                    { uid: inviterData.inviterC, level: "Level C" },
                    { uid: inviterData.inviterD, level: "Level D" }
                ].filter(i => i.uid);

                for (const inviter of invitersToUpdate) {
                    const inviterRef = doc(db, "users", inviter.uid);
                    await updateDoc(inviterRef, {
                        teamSize: increment(1)
                    });

                    const notifRef = doc(collection(db, "UserNotifications"));
                    await setDoc(notifRef, {
                        userId: inviter.uid,
                        type: "registration",
                        level: inviter.level,
                        message: `New user registered successfully in your ${inviter.level}.`,
                        fromUser: fullPhoneNumber || "A new member",
                        createdAt: Timestamp.now(),
                        read: false
                    });
                }

                setActiveTab("login");
                setFormData({ ...formData, password: "", confirmPassword: "" });

            } else {
                const input = formData.phoneNumber.trim();
                let userCredential;

                if (input.includes("@")) {
                    userCredential = await signInWithEmailAndPassword(auth, input, formData.password);
                } else {
                    const fullPhoneNumber = `${formData.phonePrefix}${input}`;
                    const sanitizedPhone = fullPhoneNumber.replace(/\+/g, "").replace(/\s/g, "");
                    const generatedEmail = `${sanitizedPhone}@dpm.app`;

                    userCredential = await signInWithEmailAndPassword(auth, generatedEmail, formData.password);
                }

                const user = userCredential.user;
                const idTokenResult = await user.getIdTokenResult(true);
                const isAdmin = !!idTokenResult.claims.admin;

                if (input.includes("@") && !isAdmin) {
                    await auth.signOut();
                    throw new Error("Unauthorized access.");
                }

                if (isAdmin) {
                    document.cookie = "is_admin=true; path=/; max-age=86400; SameSite=Strict";
                    router.push("/admin");
                    return;
                }

                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().isBlocked) {
                    await auth.signOut();
                    const tgSnap = await getDoc(doc(db, "telegram_links", "active"));
                    if (tgSnap.exists()) {
                        setSupportLink(tgSnap.data().teamLink || null);
                    }
                    setIsAccountBlocked(true);
                    setError("Your account has been restricted. Please contact support.");
                    setLoading(false);
                    return;
                }

                document.cookie = "is_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                router.push("/users/welcome");
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/network-request-failed' || err.message?.includes('network')) {
                setError("Connection lost. Please check your internet.");
                return;
            }
            if (!err.message?.includes("restricted") && !error?.includes("restricted")) {
                setSupportLink(null);
            }
            if (
                err.code === 'auth/invalid-credential' ||
                err.code === 'auth/user-not-found' ||
                err.code === 'auth/wrong-password' ||
                err.code === 'auth/invalid-email'
            ) {
                setError("Incorrect email or password.");
            }
            else if (err.code === 'auth/email-already-in-use') {
                setError("This phone number is already registered.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            }
            else {
                setError(err.message || "An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#FAF9F6]">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#C9A24D]/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[0%] right-[-10%] w-[60%] h-[60%] bg-[#8B5E3C]/5 blur-[100px] rounded-full"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[480px] min-h-screen md:min-h-0 flex flex-col justify-center relative z-10 px-4 md:px-0"
            >
                {/* Main Content Area */}
                <div className="bg-white/80 backdrop-blur-3xl md:rounded-[3.5rem] md:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col min-h-[90vh] md:min-h-0 shadow-xl">

                    {/* Logo Section */}
                    <div className="pt-20 pb-10 px-8 text-center">
                        <div className="flex justify-center mb-10">
                            <div className="w-44 h-44 relative group">
                                <div className="absolute inset-0 bg-gray-100/50 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-1000"></div>
                                <div className="w-full h-full rounded-2xl bg-white border border-gray-100 shadow-lg relative z-10 flex items-center justify-center p-4 overflow-hidden">
                                    <img
                                        src="/dpm-logo.png"
                                        alt="DPM Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">
                                {activeTab === "register" ? "Create Account" : "Welcome Back"}
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">
                                {activeTab === "register" ? "Join DPM Fragrances" : "Sign in to your account"}
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="relative flex p-1 bg-gray-100/80 rounded-2xl mt-12 mb-4 mx-4">
                            <motion.div
                                className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm border border-gray-200/50"
                                animate={{
                                    left: activeTab === "register" ? "4px" : "50%",
                                    width: "calc(50% - 8px)"
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            />
                            <button
                                onClick={() => setActiveTab("register")}
                                className={`flex-1 py-3 text-sm font-semibold transition-all relative z-10 ${activeTab === "register" ? "text-gray-900" : "text-gray-400"}`}
                            >
                                Register
                            </button>
                            <button
                                onClick={() => setActiveTab("login")}
                                className={`flex-1 py-3 text-sm font-semibold transition-all relative z-10 ${activeTab === "login" ? "text-gray-900" : "text-gray-400"}`}
                            >
                                Log In
                            </button>
                        </div>
                    </div>

                    {/* Form Container */}
                    <div className="px-8 pb-16">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.4 }}
                            >
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mb-8 p-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3"
                                    >
                                        <AlertCircle size={18} className="flex-shrink-0" />
                                        <span className="font-semibold">{error}</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Country Selector */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                            className="w-full px-5 py-4.5 rounded-2xl bg-gray-50 border border-gray-200 text-left flex items-center justify-between hover:bg-white transition-all outline-none"
                                        >
                                            <div className="flex items-center gap-3">
                                                {formData.country && (
                                                    <div className="relative w-6 h-4 rounded-sm overflow-hidden border border-gray-200">
                                                        <Image
                                                            src={countries.find(c => c.name === formData.country)?.flag || ""}
                                                            alt={formData.country}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    </div>
                                                )}
                                                <span className="text-gray-700 font-semibold">{formData.country}</span>
                                            </div>
                                            <ChevronDown size={18} className={`text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isCountryDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto no-scrollbar"
                                                >
                                                    {countries.map((c) => (
                                                        <button
                                                            key={c.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, country: c.name, phonePrefix: c.prefix, phoneNumber: "" }));
                                                                setIsCountryDropdownOpen(false);
                                                            }}
                                                            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                                        >
                                                            <div className="relative w-7 h-5 rounded-sm overflow-hidden border border-gray-100">
                                                                <Image src={c.flag} alt={c.name} fill className="object-cover" unoptimized />
                                                            </div>
                                                            <span className="text-gray-700 font-semibold">{c.name}</span>
                                                            <span className="ml-auto text-xs text-gray-400">{c.prefix}</span>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Input Fields */}
                                    <div className="space-y-4">
                                        <div className="flex bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-200 focus-within:bg-white transition-all">
                                            <div className="px-5 flex items-center bg-gray-100/50 text-gray-500 font-bold text-sm border-r border-gray-200 min-w-[80px] justify-center">
                                                {formData.phonePrefix}
                                            </div>
                                            <input
                                                type="text"
                                                name="phoneNumber"
                                                required
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                className="w-full px-5 py-4.5 bg-transparent outline-none text-gray-900 font-semibold placeholder:text-gray-400"
                                                placeholder={activeTab === "login" ? "Email or Phone" : "Phone Number"}
                                            />
                                        </div>

                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                required
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full px-5 py-4.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none text-gray-900 font-semibold placeholder:text-gray-400 focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all pr-14"
                                                placeholder="Password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>

                                        {activeTab === "register" && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="overflow-hidden"
                                            >
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required={activeTab === "register"}
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    className="w-full px-5 py-4.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none text-gray-900 font-semibold placeholder:text-gray-400 focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all"
                                                    placeholder="Confirm Password"
                                                />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-5 mt-8 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <span>{activeTab === "register" ? "Create Account" : "Sign In"}</span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>

                {/* Account Status Modal/Message */}
                <AnimatePresence>
                    {isAccountBlocked && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-10 px-8 text-center bg-white/40 backdrop-blur-xl py-8 rounded-[2.5rem] border border-white/50"
                        >
                            <ShieldAlert size={32} className="mx-auto text-red-500 mb-4" />
                            <p className="text-[#1A1A1A] font-black text-[10px] uppercase tracking-widest mb-6">Security Restriction Enabled</p>
                            {supportLink && (
                                <button
                                    onClick={() => window.open(supportLink.startsWith('http') ? supportLink : `https://t.me/${supportLink.replace('@', '')}`, '_blank')}
                                    className="px-10 py-4 bg-[#1A1A1A] text-white rounded-full font-black text-[9px] tracking-widest uppercase hover:bg-black transition-all"
                                >
                                    Engage Support
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
