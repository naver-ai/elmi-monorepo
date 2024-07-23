export enum SignLanguageType{
    ASL="ASL",
    PSE="PSE"
}

export interface User {
    id: string
    callable_name: string
    sign_language: SignLanguageType
}

export interface ProjectInfo {
    id: string
    user_id: string
    song_id: string
    song_title: string
    song_artist: string
    song_description?: string | undefined
    last_accessed_at?: string | undefined
}

export interface Song {
    id: string
    artist: string
    description?: string
    title: string
    cover_image_stored: boolean
}

export interface TimestampRange{
    start_millis: number
    end_millis: number
}

export interface Verse extends TimestampRange{
    id: string
    song_id: string
    title?: string
    verse_ordering: number
}

export interface LyricLine extends TimestampRange{
    id: string
    verse_id: string
    song_id: string
    line_number: number
    lyric: string
    tokens: Array<string>
    timestamps: Array<TimestampRange>
}

export enum TranslationChallengeType{
    Poetic='poetic',
    Cultural='cultural',
    Broken='broken',
    Mismatch='mismatch'
}

export interface LineInspection{
    id: string
    line_id: string
    challenges: Array<TranslationChallengeType>
    description: string
}

export interface GlossDescription {
    gloss: string
    description: string
}

export interface LineAnnotation{
    id: string
    line_id: string
    project_id: string
    gloss: string
    gloss_description: string
    mood: Array<string>
    facial_expression: string
    body_gesture: string
    emotion_description: string

    gloss_alts: Array<GlossDescription>
}

