'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Edit3,
    Clock,
    BookOpen,
    Volume2,
    AlertCircle,
    Loader2,
    FileText,
    Sparkles,
    Check
} from 'lucide-react'

interface Episode {
    id: string
    story_id: string
    episode_number: number
    title_malayalam: string
    script_text: string
    status: 'draft' | 'approved' | 'audio_generated' | 'published'
    duration_seconds: number | null
}

interface Story {
    id: string
    title_malayalam: string
    title_english: string
    genre: string
    description: string
    cover_emoji: string
    total_episodes: number
    status: string
    created_at: string
}

export default function StoryReviewPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const supabase = createClient()
    const storyId = params.id

    const [story, setStory] = useState<Story | null>(null)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null) // Stores episode ID or action name

    // Modals & Edit States
    const [showAudioModal, setShowAudioModal] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [newTitleMalayalam, setNewTitleMalayalam] = useState('')
    const [newTitleEnglish, setNewTitleEnglish] = useState('')

    const fetchStoryData = async () => {
        try {
            setLoading(true)
            const { data: storyData, error: storyErr } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single()

            if (storyErr || !storyData) throw new Error('Story not found.')

            const { data: episodesData, error: epErr } = await supabase
                .from('episodes')
                .select('*')
                .eq('story_id', storyId)
                .order('episode_number', { ascending: true })

            if (epErr) throw new Error('Failed to load episodes.')

            setStory(storyData)
            setNewTitleMalayalam(storyData.title_malayalam)
            setNewTitleEnglish(storyData.title_english || '')
            setEpisodes(episodesData || [])

            // Select episode 1 by default if none selected
            if (!selectedEpisode && episodesData && episodesData.length > 0) {
                setSelectedEpisode(episodesData[0])
            } else if (selectedEpisode) {
                // Refresh selected episode data
                const updatedSelected = episodesData?.find((e) => e.id === selectedEpisode.id)
                if (updatedSelected) setSelectedEpisode(updatedSelected)
            }
        } catch (err: any) {
            setError(err.message || 'Error loading story details.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStoryData()
    }, [storyId])

    // Word count & Read time calculation (Malayalam average: 120 words per minute)
    const calculateStats = (text?: string) => {
        if (!text) return { words: 0, readTimeMinutes: 0 }
        const words = text.trim().split(/\s+/).filter(Boolean).length
        const readTimeMinutes = Math.max(1, Math.ceil(words / 120))
        return { words, readTimeMinutes }
    }

    // --- ACTIONS ---

    const handleApproveEpisode = async (episodeId: string) => {
        try {
            setActionLoading(`approve-${episodeId}`)
            const res = await fetch(`/api/admin/episodes/${episodeId}/approve`, { method: 'PATCH' })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error)
            await fetchStoryData()
        } catch (err: any) {
            alert(`Error approving episode: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const handleRegenerateEpisode = async (episodeId: string) => {
        if (!confirm('Are you sure? This will overwrite the current script with a newly generated version from Claude AI.')) return
        try {
            setActionLoading(`regenerate-${episodeId}`)
            const res = await fetch(`/api/admin/episodes/${episodeId}/regenerate`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error)
            await fetchStoryData()
        } catch (err: any) {
            alert(`Error regenerating episode: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const handleRejectEpisode = async (episodeId: string) => {
        if (!confirm('Mark this episode as draft/rejected?')) return
        try {
            setActionLoading(`reject-${episodeId}`)
            const { error: rejectErr } = await supabase
                .from('episodes')
                .update({ status: 'draft' })
                .eq('id', episodeId)
            if (rejectErr) throw rejectErr
            await fetchStoryData()
        } catch (err: any) {
            alert(`Error rejecting episode: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const handleApproveAllAndPublish = async () => {
        try {
            setActionLoading('approve-all')
            const res = await fetch(`/api/admin/stories/${storyId}/approve-all`, { method: 'PATCH' })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error)
            await fetchStoryData()
            setShowAudioModal(true) // Show confirmation modal
        } catch (err: any) {
            alert(`Failed to approve story: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const handleRejectStory = async () => {
        if (!confirm('Are you sure you want to reject this entire story?')) return
        try {
            setActionLoading('reject-story')
            const { error: rejErr } = await supabase
                .from('stories')
                .update({ status: 'rejected' })
                .eq('id', storyId)
            if (rejErr) throw rejErr
            await fetchStoryData()
        } catch (err: any) {
            alert(`Error rejecting story: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const handleUpdateTitle = async () => {
        try {
            setActionLoading('update-title')
            const { error: updErr } = await supabase
                .from('stories')
                .update({
                    title_malayalam: newTitleMalayalam,
                    title_english: newTitleEnglish,
                })
                .eq('id', storyId)
            if (updErr) throw updErr
            setIsEditingTitle(false)
            await fetchStoryData()
        } catch (err: any) {
            alert(`Failed to update title: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Approved</span>
            case 'audio_generated':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Volume2 className="h-3 w-3" /> Audio Ready</span>
            case 'published':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Check className="h-3 w-3" /> Published</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="h-3 w-3" /> Draft</span>
        }
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Loading Story Scripts...</span>
            </div>
        )
    }

    if (error || !story) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-md mx-auto my-12">
                <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-red-900">Failed to Load Story</h3>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <Link href="/admin/stories" className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg">
                    Return to Stories
                </Link>
            </div>
        )
    }

    const activeStats = calculateStats(selectedEpisode?.script_text)

    return (
        <div className="space-y-8 font-sans pb-24 relative">
            {/* Floating Back Button */}
            <Link
                href="/admin/stories"
                aria-label="Back to All Stories"
                className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-3.5 rounded-full shadow-xl hover:bg-slate-800 hover:scale-105 transition duration-200 flex items-center justify-center border border-slate-700"
            >
                <ArrowLeft className="h-5 w-5" />
            </Link>

            {/* Top Header Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Title & Metadata */}
                    <div className="flex items-start gap-4 flex-1">
                        <span className="text-4xl p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm flex-shrink-0">
                            {story.cover_emoji || '📖'}
                        </span>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="uppercase text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md tracking-wider">
                                    {story.genre}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {story.total_episodes} Episodes
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-400">
                                    Created {new Date(story.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <div className="ml-auto sm:ml-2">
                                    {getStatusBadge(story.status)}
                                </div>
                            </div>

                            {/* Title Edit Form vs Display */}
                            {isEditingTitle ? (
                                <div className="space-y-3 mt-3 max-w-lg bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Malayalam Title</label>
                                        <input
                                            type="text"
                                            value={newTitleMalayalam}
                                            onChange={(e) => setNewTitleMalayalam(e.target.value)}
                                            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">English Title</label>
                                        <input
                                            type="text"
                                            value={newTitleEnglish}
                                            onChange={(e) => setNewTitleEnglish(e.target.value)}
                                            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleUpdateTitle}
                                            disabled={actionLoading === 'update-title'}
                                            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => setIsEditingTitle(false)}
                                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                        {story.title_malayalam}
                                    </h1>
                                    <p className="text-sm font-medium text-slate-500 mt-0.5">
                                        {story.title_english}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                        {!isEditingTitle && (
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit Title</span>
                            </button>
                        )}

                        <button
                            onClick={handleRejectStory}
                            disabled={actionLoading === 'reject-story' || story.status === 'rejected'}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-50"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject Story</span>
                        </button>

                        <button
                            onClick={handleApproveAllAndPublish}
                            disabled={actionLoading === 'approve-all' || story.status === 'approved'}
                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-lg transition disabled:opacity-50"
                        >
                            {actionLoading === 'approve-all' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            <span>Approve All & Publish</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Two Column Layout: Left (Episodes List) | Right (Selected Script) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Episode Cards List (4 Cols on Desktop) */}
                <div className="lg:col-span-4 space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                        Episodes List ({episodes.length})
                    </h2>
                    <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1">
                        {episodes.map((ep) => {
                            const isSelected = selectedEpisode?.id === ep.id
                            const epStats = calculateStats(ep.script_text)
                            const isApproving = actionLoading === `approve-${ep.id}`
                            const isRegenerating = actionLoading === `regenerate-${ep.id}`

                            return (
                                <div
                                    key={ep.id}
                                    onClick={() => setSelectedEpisode(ep)}
                                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${isSelected
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Episode {ep.episode_number}
                                            </span>
                                            <h3 className="font-bold text-base line-clamp-1 mt-0.5">
                                                {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
                                            </h3>
                                        </div>
                                        <div>
                                            {getStatusBadge(ep.status)}
                                        </div>
                                    </div>

                                    <div className={`flex items-center justify-between text-xs pt-2 border-t ${isSelected ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-500'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" /> {epStats.words} words
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> ~{epStats.readTimeMinutes} min
                                            </span>
                                        </div>

                                        {/* Quick Episode Action Buttons */}
                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            {ep.status !== 'approved' && (
                                                <button
                                                    onClick={() => handleApproveEpisode(ep.id)}
                                                    disabled={isApproving}
                                                    title="Approve Episode"
                                                    className={`p-1.5 rounded-md transition ${isSelected
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        }`}
                                                >
                                                    {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleRegenerateEpisode(ep.id)}
                                                disabled={isRegenerating}
                                                title="Regenerate Script with AI"
                                                className={`p-1.5 rounded-md transition ${isSelected
                                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                    }`}
                                            >
                                                {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right Column: Selected Episode Script & Review Controls (8 Cols on Desktop) */}
                <div className="lg:col-span-8">
                    {selectedEpisode ? (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">

                            {/* Selected Episode Banner */}
                            <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Episode {selectedEpisode.episode_number} Review
                                        </span>
                                        {getStatusBadge(selectedEpisode.status)}
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                                        {selectedEpisode.title_malayalam || `എപ്പിസോഡ് ${selectedEpisode.episode_number}`}
                                    </h2>
                                </div>

                                {/* Per-Episode Action Controls */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleRegenerateEpisode(selectedEpisode.id)}
                                        disabled={actionLoading === `regenerate-${selectedEpisode.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition"
                                    >
                                        {actionLoading === `regenerate-${selectedEpisode.id}` ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                        )}
                                        <span>Regenerate</span>
                                    </button>

                                    <button
                                        onClick={() => handleRejectEpisode(selectedEpisode.id)}
                                        disabled={actionLoading === `reject-${selectedEpisode.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                        <span>Reject</span>
                                    </button>

                                    {selectedEpisode.status !== 'approved' ? (
                                        <button
                                            onClick={() => handleApproveEpisode(selectedEpisode.id)}
                                            disabled={actionLoading === `approve-${selectedEpisode.id}`}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-lg transition"
                                        >
                                            {actionLoading === `approve-${selectedEpisode.id}` ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            )}
                                            <span>Approve Episode</span>
                                        </button>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <Check className="h-4 w-4" />
                                            <span>Approved</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Word Count & Reading Time Bar */}
                            <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
                                <div className="flex items-center gap-4">
                                    <span>Malayalam Script Word Count: <strong className="text-slate-900">{activeStats.words}</strong></span>
                                    <span>•</span>
                                    <span>Estimated Read Time: <strong className="text-slate-900">~{activeStats.readTimeMinutes} mins</strong> <span className="text-[10px] text-slate-400">(at 120 wpm)</span></span>
                                </div>
                            </div>

                            {/* Scrollable Script Box (Larger Malayalam Font) */}
                            <div className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[650px] bg-white">
                                {actionLoading === `regenerate-${selectedEpisode.id}` ? (
                                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                                        <p className="text-sm font-semibold text-slate-700">AI is rewriting this episode in pure Malayalam...</p>
                                        <span className="text-xs">This ensures optimal cadence for Text-to-Speech narration.</span>
                                    </div>
                                ) : (
                                    <div className="prose max-w-none text-slate-800 text-lg sm:text-xl leading-relaxed font-serif whitespace-pre-wrap select-text">
                                        {selectedEpisode.script_text || 'No script generated yet.'}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center text-slate-400">
                            <BookOpen className="h-10 w-10 mb-2 stroke-1" />
                            <p className="text-sm font-medium text-slate-600">Select an episode from the left list to review its script.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Audio Generation Confirmation Modal */}
            {showAudioModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 text-center">
                            Story Approved! Generate audio now?
                        </h3>
                        <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
                            All episodes have been marked as approved. You can now send these scripts to Google Cloud TTS to synthesize natural Malayalam narration.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    setShowAudioModal(false)
                                    router.push(`/admin/stories/${storyId}/generate-audio`)
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                            >
                                <Volume2 className="h-4 w-4 text-amber-400" />
                                <span>Generate Audio</span>
                            </button>

                            <button
                                onClick={() => setShowAudioModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}