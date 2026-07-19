import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const episodeId = params.id

        // 1. Fetch episode and parent story context
        const { data: episode, error: fetchError } = await supabaseAdmin
            .from('episodes')
            .select('*, stories(*)')
            .eq('id', episodeId)
            .single()

        if (fetchError || !episode) {
            throw new Error(`Could not find episode: ${fetchError?.message}`)
        }

        const story = episode.stories

        // 2. Build Claude regeneration prompt
        const systemPrompt = `You are a professional Malayalam story writer. Rewrite this specific episode script in pure, natural Malayalam script. Use clear conversational yet literary syntax optimized for Text-to-Speech narration. End the episode with an emotional hook or cliffhanger.`

        const userPrompt = `We are regenerating Episode ${episode.episode_number} ("${episode.title_malayalam || 'Untitled'}") for the ${story.genre} story titled "${story.title_english}" (${story.title_malayalam}).
Story Description: ${story.description}

Please write a fresh, engaging script for Episode ${episode.episode_number} in pure Malayalam.
Return ONLY a JSON object in this exact format with no extra markdown or explanations:
{
  "title_malayalam": "updated episode title in Malayalam",
  "script_text": "the complete rewritten Malayalam script..."
}`

        // 3. Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            temperature: 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        })

        const rawContent = response.content[0].type === 'text' ? response.content[0].text : ''
        const cleanedJson = rawContent
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/, '')
            .trim()

        const regeneratedData = JSON.parse(cleanedJson)

        // 4. Update episode in Supabase
        const { data: updatedEpisode, error: updateError } = await supabaseAdmin
            .from('episodes')
            .update({
                title_malayalam: regeneratedData.title_malayalam || episode.title_malayalam,
                script_text: regeneratedData.script_text,
                status: 'draft', // Reset to draft on regeneration
            })
            .eq('id', episodeId)
            .select('*')
            .single()

        if (updateError) {
            throw new Error(`Failed to update episode: ${updateError.message}`)
        }

        // 5. Log action
        await supabaseAdmin.from('admin_logs').insert({
            action: 'generate_script',
            story_id: story.id,
            episode_id: episodeId,
            notes: `Regenerated script for Episode ${episode.episode_number} using claude-sonnet-4-6.`,
        })

        return NextResponse.json({ success: true, episode: updatedEpisode })
    } catch (error: any) {
        console.error('Episode Regeneration Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Regeneration failed' },
            { status: 500 }
        )
    }
}