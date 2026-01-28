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
    orderBy,
    updateDoc
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
    User,
    Hash,
    ChevronDown,
    Building2,
    Edit3,
    Power,
    Bell,
    ShieldCheck,
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

export default function AdminPaymentMethods() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        methodName: "",
        bankName: "",
        holderName: "",
        accountNumber: "",
        bankDetailType: "regular",
        logoUrl: "",
        bankLogoUrl: "",
        status: "active" as "active" | "inactive"
    });
    const [methodFile, setMethodFile] = useState<File | null>(null);
    const [bankFile, setBankFile] = useState<File | null>(null);
    const [methodPreview, setMethodPreview] = useState<string>("");
    const [bankPreview, setBankPreview] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const q = query(collection(db, "paymentMethods"), orderBy("createdAt", "desc"));
        const unsubscribeMethods = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPaymentMethods(data);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeMethods();
        };
    }, [router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "method" | "bank") => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === "method") {
                setMethodFile(file);
                setMethodPreview(URL.createObjectURL(file));
            } else {
                setBankFile(file);
                setBankPreview(URL.createObjectURL(file));
            }
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
        if (!formData.methodName || !formData.bankName || !formData.holderName || !formData.accountNumber) {
            setStatus({ type: "error", message: "Please fill all required fields correctly." });
            return;
        }

        setUploading(true);
        setStatus({ type: "", message: "" });

        try {
            let finalMethodLogo = formData.logoUrl;
            let finalBankLogo = formData.bankLogoUrl;

            if (methodFile) finalMethodLogo = await uploadToCloudinary(methodFile);
            if (bankFile) finalBankLogo = await uploadToCloudinary(bankFile);

            if (editingId) {
                await updateDoc(doc(db, "paymentMethods", editingId), {
                    ...formData,
                    logoUrl: finalMethodLogo || "",
                    bankLogoUrl: finalBankLogo || "",
                    updatedAt: new Date().toISOString()
                });
                setStatus({ type: "success", message: "Payment method updated successfully!" });
            } else {
                await addDoc(collection(db, "paymentMethods"), {
                    ...formData,
                    logoUrl: finalMethodLogo || "",
                    bankLogoUrl: finalBankLogo || "",
                    createdAt: new Date().toISOString()
                });
                setStatus({ type: "success", message: "Payment method added successfully!" });
            }

            handleCancelEdit();
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: `Failed to ${editingId ? 'update' : 'save'} payment method.` });
        } finally {
            setUploading(false);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    const handleEdit = (method: any) => {
        setFormData({
            methodName: method.methodName,
            bankName: method.bankName,
            holderName: method.holderName,
            accountNumber: method.accountNumber,
            bankDetailType: method.bankDetailType || "regular",
            logoUrl: method.logoUrl || "",
            bankLogoUrl: method.bankLogoUrl || "",
            status: method.status || "active"
        });
        setEditingId(method.id);
        setMethodPreview(method.logoUrl || "");
        setBankPreview(method.bankLogoUrl || "");

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setFormData({
            methodName: "",
            bankName: "",
            holderName: "",
            accountNumber: "",
            bankDetailType: "regular",
            logoUrl: "",
            bankLogoUrl: "",
            status: "active"
        });
        setEditingId(null);
        setMethodFile(null);
        setBankFile(null);
        setMethodPreview("");
        setBankPreview("");
    };

    // Simplified form logic - no multi-account needed anymore

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this payment method?")) return;
        try {
            await deleteDoc(doc(db, "paymentMethods", id));
        } catch (err) {
            console.error(err);
        }
    };

    const toggleStatus = async (method: any) => {
        try {
            const newStatus = method.status === "active" ? "inactive" : "active";
            await updateDoc(doc(db, "paymentMethods", method.id), {
                status: newStatus
            });
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
                            <Banknote size={20} />
                            <h2 className="text-sm font-bold uppercase tracking-widest leading-none hidden sm:block">Payment methods</h2>
                        </div>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border border-indigo-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Payment Gateways ✨</h1>
                        <p className="text-gray-500 font-medium">Add and manage collection bank accounts for user recharges.</p>
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
                                        <Plus size={20} className={editingId ? "rotate-45" : ""} />
                                    </div>
                                    {editingId ? "Edit payment method" : "Add new bank"}
                                </h3>

                                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                    {/* SECTION 1: METHOD NAME & LOGO */}
                                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method Name</label>
                                            <div className="relative group">
                                                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. DGS"
                                                    value={formData.methodName}
                                                    onChange={(e) => setFormData({ ...formData, methodName: e.target.value })}
                                                    className="w-full py-4 pl-12 pr-4 rounded-2xl bg-white border border-transparent focus:border-indigo-600/50 outline-none transition-all font-bold text-gray-900"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Method Logo Image</label>
                                            <label className="group h-32 border-2 border-dashed border-gray-200 rounded-[2rem] hover:border-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative overflow-hidden bg-white">
                                                {methodPreview ? (
                                                    <img src={methodPreview} className="w-full h-full object-contain p-4" alt="Preview" />
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-all">
                                                            <UploadCloud size={24} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select logo</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, "method")} className="hidden" />
                                            </label>
                                        </div>
                                    </div>

                                    {/* SECTION 2: BANK DATA (Automatically Reveal) */}
                                    {(formData.methodName || methodPreview) && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 ease-out">
                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2" />

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Bank Dropdown</label>
                                                <div className="relative group">
                                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                                    <select
                                                        required
                                                        value={formData.bankName}
                                                        onChange={(e) => {
                                                            const selectedBank = ETHIOPIAN_BANKS.find(b => b.name === e.target.value);
                                                            setFormData({
                                                                ...formData,
                                                                bankName: e.target.value,
                                                                bankLogoUrl: selectedBank?.logo || formData.bankLogoUrl
                                                            });
                                                            if (selectedBank) setBankPreview(selectedBank.logo);
                                                        }}
                                                        className="w-full py-4 pl-12 pr-10 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-600/50 outline-none transition-all appearance-none font-bold text-gray-900"
                                                    >
                                                        <option value="">Select a Bank...</option>
                                                        {ETHIOPIAN_BANKS.map(bank => (
                                                            <option key={bank.name} value={bank.name}>{bank.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                                </div>
                                            </div>

                                            {formData.bankName && (
                                                <div className="space-y-2 animate-in zoom-in-95 duration-300">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bank Logo / Icon</label>
                                                    <label className="group h-32 border-2 border-dashed border-gray-200 rounded-[2rem] hover:border-indigo-600 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative overflow-hidden bg-white/50">
                                                        {bankPreview ? (
                                                            <img src={bankPreview} className="w-full h-full object-contain p-4" alt="Bank Preview" />
                                                        ) : (
                                                            <>
                                                                <div className="p-2 bg-white rounded-xl text-slate-400 group-hover:text-indigo-600 transition-all">
                                                                    <UploadCloud size={20} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Bank Logo</span>
                                                            </>
                                                        )}
                                                        <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, "bank")} className="hidden" />
                                                    </label>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Holder Name</label>
                                                <div className="relative group">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Holder Full Name"
                                                        value={formData.holderName}
                                                        onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                                                        className="w-full py-4 pl-12 pr-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-600/50 outline-none transition-all font-bold text-gray-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                                                <div className="relative group">
                                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Account digits only"
                                                        value={formData.accountNumber}
                                                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                                        className="w-full py-4 pl-12 pr-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-600/50 outline-none transition-all font-bold text-gray-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Page Theme Layout</label>
                                                <div className="relative group">
                                                    <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                                    <select
                                                        required
                                                        value={formData.bankDetailType}
                                                        onChange={(e) => setFormData({ ...formData, bankDetailType: e.target.value })}
                                                        className="w-full py-4 pl-12 pr-10 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-600/50 outline-none transition-all appearance-none font-bold text-gray-900"
                                                    >
                                                        <option value="">Select a theme...</option>
                                                        <option value="regular">Regular theme</option>
                                                        <option value="express">Express theme</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className="w-full h-18 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group"
                                            >
                                                {uploading ? <Loader2 className="animate-spin" size={24} /> : (
                                                    <>
                                                        {editingId ? <CheckCircle2 size={22} /> : <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" />}
                                                        <span>{editingId ? "Update Payment Method" : "Add Payment Method"}</span>
                                                    </>
                                                )}
                                            </button>

                                            {editingId && (
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="w-full h-18 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-500 font-black rounded-[1.5rem] transition-all flex items-center justify-center gap-3 mt-2"
                                                >
                                                    Cancel Editing
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                                    Active accounts
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold">{paymentMethods.length}</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {paymentMethods.map((method) => (
                                    <div
                                        key={method.id}
                                        className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-50 hover:shadow-2xl hover:shadow-indigo-900/10 transition-all group relative overflow-hidden animate-in zoom-in-95 duration-500"
                                    >
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="w-20 h-20 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-500">
                                                {method.logoUrl ? (
                                                    <img src={method.logoUrl} className="w-full h-full object-contain" alt="Bank" />
                                                ) : (
                                                    <Building2 size={32} className="text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => toggleStatus(method)}
                                                    title={method.status === "active" ? "Deactivate" : "Activate"}
                                                    className={`p-3 rounded-2xl transition-all ${method.status === "active"
                                                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                        }`}
                                                >
                                                    <Power size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(method)}
                                                    title="Edit Method"
                                                    className="p-3 bg-indigo-50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all"
                                                >
                                                    <Settings size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(method.id)}
                                                    className="p-3 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-2xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`w-2 h-2 rounded-full ${method.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{method.status}</p>
                                                </div>
                                                <h4 className="text-xl font-black text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{method.methodName}</h4>
                                            </div>

                                            <div className="p-5 bg-gray-50/50 rounded-3xl space-y-4 backdrop-blur-sm">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank</p>
                                                        <div className="flex items-center gap-2">
                                                            {method.bankLogoUrl && (
                                                                <img src={method.bankLogoUrl} className="w-5 h-5 object-contain rounded-md" alt="Bank" />
                                                            )}
                                                            <p className="text-xs font-black text-gray-800">{method.bankName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Holder</p>
                                                        <p className="text-xs font-black text-gray-800">{method.holderName}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A/C Number</p>
                                                        <p className="text-sm font-black text-indigo-600 tracking-wider">
                                                            {method.accountNumber}
                                                        </p>
                                                    </div>
                                                    {method.bankDetailType && (
                                                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</p>
                                                            <p className="text-[10px] font-black text-indigo-400 capitalize">{method.bankDetailType}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Decorative Icon */}
                                        <div className="absolute -bottom-8 -right-8 text-indigo-600/5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                                            <Building2 size={140} />
                                        </div>
                                    </div>
                                ))}

                                {paymentMethods.length === 0 && (
                                    <div className="col-span-full py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                            <Banknote size={40} className="text-indigo-200" />
                                        </div>
                                        <p className="font-black uppercase tracking-widest text-xs mb-2">Inventory Empty</p>
                                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Add your first payment method to get started</p>
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
