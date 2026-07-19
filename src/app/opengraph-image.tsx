import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'കഥാലോകം — സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Dynamically fetches the active TTF font from Google Fonts API
async function loadGoogleFont(fontFamily: string, text: string) {
    const url = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@700&text=${encodeURIComponent(text)}`
    const css = await (await fetch(url, {
        headers: {
            // Using an older User-Agent forces Google Fonts to return standard TrueType (.ttf) format required by Satori/OG
            'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
        },
    })).text()

    const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)
    if (resource) {
        const response = await fetch(resource[1])
        if (response.status === 200) {
            return await response.arrayBuffer()
        }
    }
    throw new Error('Failed to load font data from Google Fonts API')
}

export default async function Image() {
    // Dynamically load the exact Malayalam font buffer for the text we are rendering
    const fontData = await loadGoogleFont('Noto+Serif+Malayalam', 'കഥാലോകം സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ')

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1B4332',
                    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(212, 160, 23, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(253, 246, 236, 0.08) 0%, transparent 50%)',
                    color: '#FDF6EC',
                    fontFamily: '"Noto Serif Malayalam", serif',
                    padding: '60px',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        backgroundColor: '#D4A017',
                    }}
                />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '140px',
                        height: '140px',
                        borderRadius: '70px',
                        backgroundColor: 'rgba(253, 246, 236, 0.1)',
                        border: '3px solid #D4A017',
                        fontSize: '72px',
                        marginBottom: '32px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    📖
                </div>

                <div
                    style={{
                        fontSize: '84px',
                        fontWeight: 700,
                        color: '#FDF6EC',
                        letterSpacing: '-0.02em',
                        marginBottom: '16px',
                        textShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    }}
                >
                    കഥാലോകം
                </div>

                <div
                    style={{
                        fontSize: '32px',
                        color: '#D4A017',
                        fontWeight: 600,
                        marginBottom: '40px',
                    }}
                >
                    സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        fontSize: '20px',
                        color: 'rgba(253, 246, 236, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        padding: '12px 32px',
                        borderRadius: '40px',
                        border: '1px solid rgba(253, 246, 236, 0.15)',
                    }}
                >
                    <span>✨ 100% Free</span>
                    <span style={{ color: '#D4A017' }}>•</span>
                    <span>🎧 AI Narrated</span>
                    <span style={{ color: '#D4A017' }}>•</span>
                    <span>🚫 No Ads</span>
                </div>

                <div
                    style={{
                        position: 'absolute',
                        bottom: '24px',
                        fontSize: '18px',
                        color: 'rgba(253, 246, 236, 0.4)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}
                >
                    kathalokam.vercel.app
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Noto Serif Malayalam',
                    data: fontData,
                    style: 'normal',
                    weight: 700,
                },
            ],
        }
    )
}