'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
    Sparkles,
    BookOpen,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    RotateCcw
} from 'lucide-react'

interface GeneratedStory {
    title_malayalam: string
    title_english: string
    description: string
    cover_emoji: string
    episodes: Array<{
        episode_number: number
        title_malayalam: string
        script_text: string
    }>
}

export default function GenerateStoryPage() {
    const [formData, setFormData] = useState({
        genre: 'thriller',
        episodes: 5,
        theme: '',
        audience: 'General',
        length: 'Medium (8–10 min)',
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{ story_id: string; story: GeneratedStory } | null>(null)

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const response = await fetch('/api/admin/generate-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to generate story script.')
            }

            setResult({ story_id: data.story_id, story: data.story })
        } catch (err: any) {
            setError(err.message || 'An unexpected network error occurred.')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setResult(null)
        setError(null)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 font-sans">
            {/* Page Header */}
            <div className="border-b border-slate-100 pb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-slate-900" />
                    <span>AI Story Script Generator</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Configure parameters to generate culturally rich Malayalam audio story scripts using Claude AI.
                </p>
            </div>

            {/* Loading State Overlay / Spinner */}
            {loading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-4">
                    <Loader2 className="h-10 w-10 text-slate-900 animate-spin mx-auto" />
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-900">കഥ സൃഷ്ടിക്കുന്നു...</h3>
                        <p className="text-xs text-slate-400">
                            Writing culturally nuanced Malayalam scripts. This may take 30–60 seconds...
                        </p>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold">Generation Failed</p>
                        <p className="mt-0.5 text-xs text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Success Card */}
            {result && !loading && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                    <div className="p-6 sm:p-8 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <span className="text-4xl p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                {result.story.cover_emoji}
                            </span>
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Draft Created
                                </span>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {result.story.title_malayalam}
                                </h2>
                                <p className="text-sm font-medium text-slate-600">
                                    {result.story.title_english} • <span className="text-slate-900 font-semibold">{formData.episodes} Episodes</span>
                                </p>
                            </div>
                        </div>

                        <Link
                            href={`/admin/stories/${result.story_id}`}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-slate-800 transition flex-shrink-0"
                        >
                            <span>Review & Approve</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Story Description & Preview */}
                    <div className="p-6 sm:p-8 space-y-6">
                        <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                English Reference Blurb
                            </h4>
                            <p className="text-sm text-slate-700 mt-1 italic">
                                "{result.story.description}"
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Episode 1 Preview: {result.story.episodes[0]?.title_malayalam}
                                </h4>
                                <span className="text-[11px] text-slate-400">First 200 characters</span>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm leading-relaxed font-serif">
                                {result.story.episodes[0]?.script_text.slice(0, 200)}...
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={resetForm}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Generate Another Story</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Form */}
            {!loading && !result && (
                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Genre Selector */}
                        <div>
                            <label htmlFor="genre" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Genre
                            </label>
                            <select
                                id="genre"
                                name="genre"
                                value={formData.genre}
                                onChange={handleInputChange}
                                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                            >
                                <option value="thriller">Thriller</option>
                                <option value="romance">Romance</option>
                                <option value="mystery">Mystery</option>
                                <option value="comedy">Comedy</option>
                                <option value="drama">Drama</option>
                                <option value="horror">Horror</option>
                                <option value="fantasy">Fantasy</option>
                            </select>
                        </div>

                        {/* Number of Episodes */}
                        <div>
                            <label htmlFor="episodes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Number of Episodes (1–20)
                            </label>
                            <input
                                type="number"
                                id="episodes"
                                name="episodes"
                                min="1"
                                max="20"
                                value={formData.episodes}
                                onChange={handleInputChange}
                                required
                                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Target Audience */}
                        <div>
                            <label htmlFor="audience" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Target Audience
                            </label>
                            <select
                                id="audience"
                                name="audience"
                                value={formData.audience}
                                onChange={handleInputChange}
                                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                            >
                                <option value="General">General</option>
                                <option value="Adults">Adults</option>
                                <option value="Kids">Kids</option>
                            </select>
                        </div>

                        {/* Story Length */}
                        <div>
                            <label htmlFor="length" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Episode Length
                            </label>
                            <select
                                id="length"
                                name="length"
                                value={formData.length}
                                onChange={handleInputChange}
                                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                            >
                                <option value="Short (3–5 min)">Short (3–5 min)</option>
                                <option value="Medium (8–10 min)">Medium (8–10 min)</option>
                                <option value="Long (15–20 min)">Long (15–20 min)</option>
                            </select>
                        </div>
                    </div>

                    {/* Story Theme / Idea */}
                    <div>
                        <label htmlFor="theme" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Story Theme / Plot Hint <span className="text-slate-400 font-normal">(Optional, English)</span>
                        </label>
                        <textarea
                            id="theme"
                            name="theme"
                            rows={4}
                            value={formData.theme}
                            onChange={handleInputChange}
                            placeholder="e.g., An old ancestral home in Wayanad has a mysterious radio that only broadcasts news from 50 years in the future..."
                            className="mt-2 block w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 placeholder-slate-400"
                        />
                        <p className="mt-1.5 text-xs text-slate-400">
                            Provide plot devices, character names, or settings. Claude will expand this into pure Malayalam script.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
                        >
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <span>Generate Story</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}