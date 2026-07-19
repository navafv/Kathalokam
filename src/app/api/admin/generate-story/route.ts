import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Initialize Supabase admin client with service role for write access
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Anthropic SDK client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { genre, episodes, theme, audience, length } = body

        // Map audio length to approximate Malayalam word counts (~100 words/min)
        const wordCountMap: Record<string, number> = {
            'Short (3–5 min)': 400,
            'Medium (8–10 min)': 900,
            'Long (15–20 min)': 1600,
        }
        const wordCount = wordCountMap[length] || 900

        const systemPrompt = `You are a professional Malayalam story writer. Write engaging, culturally rich stories in pure Malayalam script. Your stories should feel natural when read aloud by a text-to-speech system — use clear sentence structures, avoid complex compound words, and write in a conversational yet literary tone. Each episode should end with a cliffhanger or emotional hook to keep listeners coming back.`

        const userPrompt = `Write a complete ${genre} story in Malayalam with ${episodes} episodes.
Theme hint: ${theme || 'None provided, create an original compelling plot'}. Audience: ${audience}. Each episode should be ${length} minutes when read aloud (approximately ${wordCount} Malayalam words per episode).

Return ONLY a JSON object in this exact format, no explanation:
{
  "title_malayalam": "story title in Malayalam",
  "title_english": "English translation of the title",
  "description": "2-3 sentence description in English for admin reference",
  "cover_emoji": "one relevant emoji",
  "episodes": [
    {
      "episode_number": 1,
      "title_malayalam": "episode title in Malayalam",
      "script_text": "full episode script in Malayalam..."
    }
  ]
}`

        // Call Anthropic Claude API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            temperature: 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        })

        // Extract text content and clean potential markdown formatting
        const rawContent = response.content[0].type === 'text' ? response.content[0].text : ''
        const cleanedJson = rawContent
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/, '')
            .trim()

        const storyData = JSON.parse(cleanedJson)

        // 1. Insert Story into Supabase
        const { data: story, error: storyError } = await supabaseAdmin
            .from('stories')
            .insert({
                title_malayalam: storyData.title_malayalam,
                title_english: storyData.title_english,
                genre: genre.toLowerCase(),
                description: storyData.description,
                cover_emoji: storyData.cover_emoji || '📖',
                total_episodes: Number(episodes),
                status: 'draft',
            })
            .select('id')
            .single()

        if (storyError || !story) {
            throw new Error(`Supabase Story Insert Error: ${storyError?.message}`)
        }

        // 2. Prepare and Insert Episodes
        const episodesToInsert = storyData.episodes.map((ep: any) => ({
            story_id: story.id,
            episode_number: ep.episode_number,
            title_malayalam: ep.title_malayalam,
            script_text: ep.script_text,
            status: 'draft',
            ai_generated: true,
        }))

        const { error: episodesError } = await supabaseAdmin
            .from('episodes')
            .insert(episodesToInsert)

        if (episodesError) {
            throw new Error(`Supabase Episodes Insert Error: ${episodesError.message}`)
        }

        // 3. Log admin action
        await supabaseAdmin.from('admin_logs').insert({
            action: 'generate_script',
            story_id: story.id,
            notes: `AI Generated story "${storyData.title_english}" with ${episodes} episodes using claude-sonnet-4-6.`,
        })

        return NextResponse.json({
            success: true,
            story_id: story.id,
            story: storyData,
        })
    } catch (error: any) {
        console.error('Story Generation Failed:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'An unexpected error occurred.' },
            { status: 500 }
        )
    }
}