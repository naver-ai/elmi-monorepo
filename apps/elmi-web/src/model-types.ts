export enum SignLanguageType{
    ASL="ASL",
    PSE="PSE"
}

export interface User {
    id: string
    callable_name: string
    sign_language: SignLanguageType
}

export interface Project {
    id: string
    user_id: string
    song_title: string
    song_artist: string
    song_description?: string | undefined
}