"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const isAuth = localStorage.getItem("admin_auth");
        if (isAuth === "kathalokam2024") {
            router.push("/admin");
        }
    }, [router]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === "kathalokam2024") {
            localStorage.setItem("admin_auth", "kathalokam2024");
            setError(false);
            router.push("/admin");
        } else {
            setError(true);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    കഥാലോകം
                </h1>
                <p className="mt-2 text-sm text-slate-500 font-medium">
                    Admin Control Portal
                </p>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
                <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 border border-slate-200 rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                            >
                                Security Passkey
                            </label>
                            <div className="mt-2 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter access password..."
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-shake">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>Invalid password. Please try again.</span>
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition"
                        >
                            <span>Enter Dashboard</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
