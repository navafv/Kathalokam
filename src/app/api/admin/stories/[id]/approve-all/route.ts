import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const storyId = params.id

        // 1. Approve all draft episodes for this story
        const { error: epError } = await supabaseAdmin
            .from('episodes')
            .update({ status: 'approved' })
            .eq('story_id', storyId)
            .eq('status', 'draft')

        if (epError) throw new Error(`Failed to approve episodes: ${epError.message}`)

        // 2. Approve the main story
        const { data: story, error: storyError } = await supabaseAdmin
            .from('stories')
            .update({ status: 'approved' })
            .eq('id', storyId)
            .select('*')
            .single()

        if (storyError) throw new Error(`Failed to approve story: ${storyError.message}`)

        // 3. Log action
        await supabaseAdmin.from('admin_logs').insert({
            action: 'approve',
            story_id: storyId,
            notes: `Approved story "${story.title_english}" and all associated episodes.`,
        })

        return NextResponse.json({ success: true, story })
    } catch (error: any) {
        console.error('Approve All Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed bulk approval' },
            { status: 500 }
        )
    }
}