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
    song_title: string
    song_artist: string
    song_description?: string | undefined
    last_accessed_at?: string | undefined
}

export interface Verse{
    id: string
    project_id: string
    name: string
}

export interface LyricLine{
    id: string
    verse_id: string
    line_number: number
    match_timestamp_start: number
    match_timestamp_end: number
}

export interface Project extends ProjectInfo {

}

