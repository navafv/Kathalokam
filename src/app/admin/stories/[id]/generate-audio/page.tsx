'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Volume2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    ArrowLeft,
    XCircle,
    Check
} from 'lucide-react'

interface Episode {
    id: string
    episode_number: number
    title_malayalam: string
    status: string
}

interface Story {
    id: string
    title_malayalam: string
    title_english: string
    total_episodes: number
    status: string
}

export default function GenerateAudioPage({ params }: { params: { id: string } }) {
    const storyId = params.id
    const supabase = createClient()

    const [story, setStory] = useState<Story | null>(null)
    const [episodes, setEpisodes] = useState<Episode[]>([])

    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
    const [completed, setCompleted] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const [failedEpisodes, setFailedEpisodes] = useState<Array<{ episode_number: number; error: string }>>([])

    const fetchStoryData = async () => {
        try {
            setLoading(true)
            const { data: storyData, error: storyErr } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single()

            if (storyErr || !storyData) throw new Error('Story not found.')

            const { data: epData, error: epErr } = await supabase
                .from('episodes')
                .select('id, episode_number, title_malayalam, status')
                .eq('story_id', storyId)
                .order('episode_number', { ascending: true })

            if (epErr) throw new Error('Could not fetch episodes.')

            setStory(storyData)
            setEpisodes(epData || [])

            // If already published / all generated, mark completed
            const allDone = epData?.every((e) => e.status === 'audio_generated' || e.status === 'published')
            if (allDone && epData && epData.length > 0) {
                setCompleted(true)
            }
        } catch (err: any) {
            setError(err.message || 'Error initializing page.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStoryData()
    }, [storyId])

    const startAudioGeneration = async () => {
        setGenerating(true)
        setError(null)
        setFailedEpisodes([])
        setCompleted(false)

        // Simulate progress ticker UI while backend processes
        const tickerInterval = setInterval(() => {
            setCurrentEpisodeIndex((prev) => {
                if (prev < episodes.length - 1) return prev + 1
                return prev
            })
        }, 4500) // Advancing visual ticker roughly matching TTS latency

        try {
            const response = await fetch('/api/admin/generate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ story_id: storyId }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Audio synthesis API failed.')
            }

            if (data.errors && data.errors.length > 0) {
                setFailedEpisodes(data.errors)
            }

            await fetchStoryData()
            setCompleted(true)
        } catch (err: any) {
            setError(err.message || 'A network error occurred during audio generation.')
        } finally {
            clearInterval(tickerInterval)
            setGenerating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Loading Story Data...</span>
            </div>
        )
    }

    if (error && !story) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-md mx-auto my-12">
                <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-red-900">Initialization Error</h3>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <Link href={`/admin/stories/${storyId}`} className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg">
                    Back to Review
                </Link>
            </div>
        )
    }

    const activeEpisodeNum = episodes[currentEpisodeIndex]?.episode_number || 1
    const totalEpisodes = episodes.length

    return (
        <div className="max-w-3xl mx-auto space-y-8 font-sans py-6">
            {/* Back Button */}
            <div>
                <Link
                    href={`/admin/stories/${storyId}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Script Review</span>
                </Link>
            </div>

            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Volume2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Malayalam Audio Synthesis
                        </h1>
                        <p className="text-xs font-medium text-slate-500">
                            Powered by Google Cloud Wavenet-A Voice Engine
                        </p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{story?.title_malayalam}</h2>
                        <p className="text-xs text-slate-500">{story?.title_english} • {totalEpisodes} Episodes</p>
                    </div>
                    {!generating && !completed && (
                        <button
                            onClick={startAudioGeneration}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                            <Volume2 className="h-4 w-4 text-amber-400" />
                            <span>Start Audio Synthesis</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Generating Progress State */}
            {generating && (
                <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 text-center shadow-xl space-y-6 border border-slate-800 animate-in fade-in duration-300">
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                        <Loader2 className="h-16 w-16 animate-spin text-amber-400 absolute inset-0" />
                        <Volume2 className="h-6 w-6 text-white" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-3xl font-extrabold tracking-tight text-amber-400">
                            ഓഡിയോ തയ്യാറാക്കുന്നു...
                        </h3>
                        <p className="text-sm font-semibold text-slate-300">
                            Generating audio for episode {activeEpisodeNum} of {totalEpisodes}...
                        </p>
                        <p className="text-xs text-slate-400 max-w-md mx-auto pt-1">
                            Synthesizing natural Malayalam speech at 0.9x cadence and uploading MP3s to storage. Please do not close this window.
                        </p>
                    </div>

                    {/* Simple progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden max-w-sm mx-auto">
                        <div
                            className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round(((currentEpisodeIndex + 1) / totalEpisodes) * 100))}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !generating && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3 text-red-700">
                    <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                        <p className="font-bold">Audio Generation Error</p>
                        <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                        <button
                            onClick={startAudioGeneration}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Retry Generation</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Failed Episodes Warning Box */}
            {failedEpisodes.length > 0 && !generating && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                        <XCircle className="h-5 w-5 text-amber-600" />
                        <span>Some Episodes Failed Synthesis ({failedEpisodes.length})</span>
                    </div>
                    <div className="space-y-1.5 divide-y divide-amber-100 text-xs text-amber-700">
                        {failedEpisodes.map((err, idx) => (
                            <div key={idx} className="pt-1.5 flex justify-between items-center">
                                <span className="font-semibold">Episode {err.episode_number}</span>
                                <span className="text-amber-600">{err.error}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={startAudioGeneration}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Retry Failed Episodes</span>
                    </button>
                </div>
            )}

            {/* Completed Success State */}
            {completed && !generating && failedEpisodes.length === 0 && (
                <div className="bg-emerald-900 text-white rounded-2xl p-8 sm:p-10 text-center shadow-lg border border-emerald-800 space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-emerald-800 text-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Check className="h-8 w-8" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-tight text-white">
                            All audio ready! View published story →
                        </h3>
                        <p className="text-xs text-emerald-200">
                            All {totalEpisodes} episodes have been synthesized into MP3s, uploaded to Supabase Storage, and published live to users.
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                        <Link
                            href="/admin/stories"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-lg shadow transition"
                        >
                            <span>Back to Stories List</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Episode Status Checklist */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Episode Status Log
                </h3>
                <div className="divide-y divide-slate-100">
                    {episodes.map((ep) => {
                        const isDone = ep.status === 'audio_generated' || ep.status === 'published' || completed
                        const isFailed = failedEpisodes.some((f) => f.episode_number === ep.episode_number)
                        const isCurrentlyGenerating = generating && episodes[currentEpisodeIndex]?.id === ep.id

                        return (
                            <div key={ep.id} className="py-3.5 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 w-16">
                                        EP {ep.episode_number}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
                                    </span>
                                </div>

                                <div>
                                    {isFailed ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                            <XCircle className="h-3 w-3" /> Failed
                                        </span>
                                    ) : isDone ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                            <CheckCircle2 className="h-3 w-3" /> Ready
                                        </span>
                                    ) : isCurrentlyGenerating ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Synthesizing...
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}