import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as googleTTS from 'google-tts-api'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { story_id } = await request.json()

        if (!story_id) {
            return NextResponse.json({ success: false, error: 'story_id is required' }, { status: 400 })
        }

        // 1. Fetch all approved episodes for the story
        const { data: episodes, error: fetchError } = await supabaseAdmin
            .from('episodes')
            .select('*')
            .eq('story_id', story_id)
            .eq('status', 'approved')
            .order('episode_number', { ascending: true })

        if (fetchError || !episodes || episodes.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No approved episodes found for audio generation.' },
                { status: 404 }
            )
        }

        let processedCount = 0
        let failedCount = 0
        const errors: Array<{ episode_number: number; error: string }> = []

        // 2. Process each episode sequentially
        for (const ep of episodes) {
            try {
                if (!ep.script_text || ep.script_text.trim() === '') {
                    throw new Error('Script text is empty.')
                }

                // Automatically split long script into chunks and fetch free base64 audio
                const audioChunks = await googleTTS.getAllAudioBase64(ep.script_text, {
                    lang: 'ml', // Malayalam
                    slow: false, // Set to true if you want slower narration
                    host: 'https://translate.google.com',
                    timeout: 15000,
                    splitPunct: ',.?!—\n', // Splits cleanly at Malayalam sentence breaks
                })

                if (!audioChunks || audioChunks.length === 0) {
                    throw new Error('Failed to generate free audio chunks.')
                }

                // Convert all base64 chunks into Buffers and combine them into one MP3 file
                const audioBuffer = Buffer.concat(
                    audioChunks.map((chunk) => Buffer.from(chunk.base64, 'base64'))
                )

                // 3. Upload combined MP3 to Supabase Storage
                const filePath = `stories/${story_id}/episode-${ep.episode_number}.mp3`

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('audio-stories')
                    .upload(filePath, audioBuffer, {
                        contentType: 'audio/mpeg',
                        upsert: true,
                    })

                if (uploadError) {
                    throw new Error(`Storage upload failed: ${uploadError.message}`)
                }

                // Get Public URL
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('audio-stories')
                    .getPublicUrl(filePath)

                // 4. Calculate word count & estimate duration (Malayalam ~120 words/min -> wordCount / 2)
                const wordCount = ep.script_text.trim().split(/\s+/).filter(Boolean).length
                const durationSeconds = Math.max(10, Math.ceil(wordCount / 2))

                // Update Episode in Supabase
                const { error: updateError } = await supabaseAdmin
                    .from('episodes')
                    .update({
                        audio_url: publicUrl,
                        duration_seconds: durationSeconds,
                        status: 'audio_generated',
                    })
                    .eq('id', ep.id)

                if (updateError) {
                    throw new Error(`Database update failed: ${updateError.message}`)
                }

                processedCount++
            } catch (err: any) {
                console.error(`Failed episode ${ep.episode_number}:`, err)
                failedCount++
                errors.push({
                    episode_number: ep.episode_number,
                    error: err.message || 'Unknown synthesis error',
                })
            }
        }

        // 5. If at least one episode processed and none failed, publish the story
        if (processedCount > 0 && failedCount === 0) {
            await supabaseAdmin
                .from('stories')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', story_id)
        }

        // 6. Log admin action
        await supabaseAdmin.from('admin_logs').insert({
            action: 'generate_audio',
            story_id: story_id,
            notes: `Free Audio generated: ${processedCount} succeeded, ${failedCount} failed using google-tts-api.`,
        })

        return NextResponse.json({
            success: true,
            episodes_processed: processedCount,
            episodes_failed: failedCount,
            errors: errors,
        })
    } catch (error: any) {
        console.error('Audio Generation Fatal Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Server error during audio generation.' },
            { status: 500 }
        )
    }
}