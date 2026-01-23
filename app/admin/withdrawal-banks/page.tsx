"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Plus,
    Trash2,
    LogOut,
    Image as ImageIcon,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Menu,
    Home,
    Settings,
    UploadCloud,
    Banknote,
    Building2,
    ChevronDown,
    Bell,
    ShieldCheck,
    Send,
    MessageSquare,
    BookOpen,
    Percent,
    UserX
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

const ETHIOPIAN_BANKS = [
    { name: "Commercial Bank of Ethiopia (CBE)", logo: "/banks/cbe.png" },
    { name: "Bank of Abyssinia (BoA)", logo: "/banks/boa.png" },
    { name: "Awash International Bank", logo: "/banks/awash.png" },
    { name: "Dashen Bank", logo: "/banks/dashen.png" },
    { name: "Wegagen Bank", logo: "/banks/wegagen.png" },
    { name: "Hibret Bank", logo: "/banks/hibret.png" },
    { name: "Zemen Bank", logo: "/banks/zemen.png" },
    { name: "Nib International Bank", logo: "/banks/nib.png" },
    { name: "Cooperative Bank of Oromia (CBO)", logo: "/banks/cbo.png" },
    { name: "TeleBirr", logo: "/banks/telebirr.png" },
    { name: "Safaricom M-Pesa", logo: "/banks/mpesa.png" },
];

export default function AdminWithdrawalBanks() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [withdrawalBanks, setWithdrawalBanks] = useState<any[]>([]);

    // Form State
    const [selectedBank, setSelectedBank] = useState("");
    const [bankFile, setBankFile] = useState<File | null>(null);
    const [bankPreview, setBankPreview] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const q = query(collection(db, "withdrawalBanks"), orderBy("createdAt", "desc"));
        const unsubscribeBanks = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWithdrawalBanks(data);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeBanks();
        };
    }, [router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBankFile(file);
            setBankPreview(URL.createObjectURL(file));
        }
    };

    const uploadToCloudinary = async (file: File) => {
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "Turner");

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "deve0w9bt";
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: uploadData }
        );

        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        return data.secure_url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBank) {
            setStatus({ type: "error", message: "Please select a bank." });
            return;
        }

        setUploading(true);
        setStatus({ type: "", message: "" });

        try {
            let logoUrl = bankPreview; // Could be from auto-selection
            if (bankFile) {
                logoUrl = await uploadToCloudinary(bankFile);
            }

            if (!logoUrl) {
                setStatus({ type: "error", message: "Bank logo is required." });
                setUploading(false);
                return;
            }

            await addDoc(collection(db, "withdrawalBanks"), {
                name: selectedBank,
                logoUrl: logoUrl,
                createdAt: new Date().toISOString()
            });

            setSelectedBank("");
            setBankFile(null);
            setBankPreview("");
            setStatus({ type: "success", message: "Withdrawal bank added successfully!" });
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to save withdrawal bank." });
        } finally {
            setUploading(false);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this bank?")) return;
        try {
            await deleteDoc(doc(db, "withdrawalBanks", id));
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

    // Navigation handled by AdminSidebar

    return (
        <div className="min-h-screen bg-[#F0F2F9] flex text-gray-900">
            {/* Sidebar Replaced */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <Menu size={24} className="text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Building2 size={20} />
                            <h2 className="text-sm font-black uppercase tracking-widest leading-none hidden sm:block">Withdrawal Banks</h2>
                        </div>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border border-indigo-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Withdrawal Banks ✨</h1>
                        <p className="text-gray-500 font-medium">Manage banks available for user withdrawals.</p>
                    </div>

                    {status.message && (
                        <div className={`mb-8 p-6 rounded-3xl flex items-center gap-4 border animate-in slide-in-from-top-4 duration-500 ${status.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"}`}>
                            {status.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            <span className="font-bold">{status.message}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        {/* Form Section */}
                        <div className="xl:col-span-5 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
                            <section className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-900/5 border border-white relative overflow-hidden">
                                <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                        <Plus size={20} />
                                    </div>
                                    Add New Withdrawal Bank
                                </h3>

                                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Bank</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                                <select
                                                    required
                                                    value={selectedBank}
                                                    onChange={(e) => {
                                                        const selectedBank = ETHIOPIAN_BANKS.find(b => b.name === e.target.value);
                                                        setSelectedBank(e.target.value);
                                                        if (selectedBank) setBankPreview(selectedBank.logo);
                                                    }}
                                                    className="w-full py-4 pl-12 pr-10 rounded-2xl bg-white border border-transparent focus:border-indigo-600/50 outline-none transition-all appearance-none font-bold text-gray-900"
                                                >
                                                    <option value="">Select an Ethiopian Bank...</option>
                                                    {ETHIOPIAN_BANKS.map(bank => (
                                                        <option key={bank.name} value={bank.name}>{bank.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bank Logo</label>
                                            <label className="group h-40 border-2 border-dashed border-gray-200 rounded-[2rem] hover:border-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative overflow-hidden bg-white">
                                                {bankPreview ? (
                                                    <img src={bankPreview} className="w-full h-full object-contain p-4" alt="Preview" />
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-all">
                                                            <UploadCloud size={32} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Upload Bank Logo</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full h-18 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" size={24} /> : (
                                            <>
                                                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                                                <span>Save Bank</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                    <Building2 size={180} className="text-indigo-600" />
                                </div>
                            </section>
                        </div>

                        {/* List Section */}
                        <div className="xl:col-span-7 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="flex items-center justify-between px-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                    Enabled Banks
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">{withdrawalBanks.length}</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {withdrawalBanks.map((bank) => (
                                    <div
                                        key={bank.id}
                                        className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-50 hover:shadow-2xl hover:shadow-indigo-900/10 transition-all group relative overflow-hidden animate-in zoom-in-95 duration-500"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 flex items-center justify-center p-3 group-hover:scale-105 transition-transform duration-500 shrink-0">
                                                {bank.logoUrl ? (
                                                    <img src={bank.logoUrl} className="w-full h-full object-contain" alt={bank.name} />
                                                ) : (
                                                    <Building2 size={32} className="text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight mb-2">{bank.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Withdrawal Enabled</p>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(bank.id)}
                                                className="p-3 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-2xl transition-all self-start"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {/* Decorative Icon */}
                                        <div className="absolute -bottom-8 -right-8 text-indigo-600/5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                                            <Building2 size={140} />
                                        </div>
                                    </div>
                                ))}

                                {withdrawalBanks.length === 0 && (
                                    <div className="col-span-full py-16 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                                        <Building2 size={48} className="mb-4 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-xs">No banks added yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
