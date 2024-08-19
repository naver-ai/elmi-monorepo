
export enum SignLanguageType{
    ASL="ASL",
    PSE="PSE"
}

export enum MainAudience {
    Deaf = "Deaf",
    Hearing = "Hearing"
}

export enum AgeGroup {
    Children = "Children",
    Adult = "Adult"
}

export enum LanguageProficiency {
    Novice = "Novice",
    Moderate = "Moderate",
    Expert = "Expert"
}

export enum SigningSpeed {
    Slow = "Slow",
    Moderate = "Moderate",
    Fast = "Fast"
}

export enum EmotionalLevel {
    Calm = "Calm",
    Moderate = "Moderate",
    Excited = "Excited"
}

export enum BodyLanguage {
    NotUsed = "NotUsed",
    Moderate = "Moderate",
    Rich = "Rich"
}

export enum ClassifierLevel {
    NotUsed = "NotUsed",
    Moderate = "Moderate",
    Rich = "Rich"
}

export interface ProjectConfiguration {
    main_audience: MainAudience; // Default: MainAudience.Deaf
    age_group: AgeGroup; // Default: AgeGroup.Adult
    main_language: SignLanguageType; // Default: SignLanguageType.ASL
    language_proficiency: LanguageProficiency; // Default: LanguageProficiency.Moderate
    signing_speed: SigningSpeed; // Default: SigningSpeed.Moderate
    emotional_level: EmotionalLevel; // Default: EmotionalLevel.Moderate
    body_language: BodyLanguage; // Default: BodyLanguage.Moderate
    classifier_level: ClassifierLevel; // Default: ClassifierLevel.Moderate
}

// Default values can be assigned when creating an instance of ProjectConfiguration
export const DEFAULT_PROJECT_CONFIG: ProjectConfiguration = {
    main_audience: MainAudience.Deaf,
    age_group: AgeGroup.Adult,
    main_language: SignLanguageType.ASL,
    language_proficiency: LanguageProficiency.Moderate,
    signing_speed: SigningSpeed.Moderate,
    emotional_level: EmotionalLevel.Moderate,
    body_language: BodyLanguage.Moderate,
    classifier_level: ClassifierLevel.Moderate
};
export interface User {
    id: string
    callable_name?: string | undefined
    sign_language?: SignLanguageType | undefined
}

export interface UserFullInfo extends User{
    alias: string
    passcode: string
}


export interface UserWithProjects extends UserFullInfo {
    projects: Array<ProjectInfo>
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

export interface LineTranslation{
    id: string
    line_id: string
    project_id: string
    gloss: string | undefined
    memo: string | undefined
}

export interface ChatThread{
    id: string
    line_id: string
    verse_ordering: number
    line_number: number
}

export enum MessageRole {
    User="user",
    Assistant="assistant"
}


export enum ChatIntent {
    Meaning="meaning",
    Glossing="glossing",
    Emoting="emoting",
    Timing="timing",
    Other="other"
}

export interface ThreadMessage {
    id: string
    thread_id: string
    role: MessageRole
    message: string
    intent?: ChatIntent | undefined
    message_metadata?: {[key:string]: any} | undefined
}

export enum InteractionType{

    EnterProject = "EnterProject",
    ExitProject = "ExitProject",
    
    PlaySong = "PlaySong",
    PauseSong = "PauseSong",

    SelectLine = "SelectLine",
    ExitLineMode = "ExitLineMode",
    
    EnterGloss = "EnterGloss",

    SelectAltGloss = "SelectAltGloss",

    StartNewThread = "StartNewThread",
    SendChatMessage = "SendChatMessage"
}

export interface InteractionLog {
    type: InteractionType
    metadata_json?: {[key:string]: any} | undefined
}

export interface InteractionLogORM extends InteractionLog {
    id: string

    timestamp: number
    local_timezone: string
}

export interface AltGlossesInfo {
    id: string
    base_gloss: string
    alt_glosses: Array<string>
    project_id: string
    line_id: string
}

export interface ProjectDetail {
    id: string
    last_accessed_at: string | undefined
    song: Song
    verses: Array<Verse>
    lines: Array<LyricLine>
    annotations: Array<LineAnnotation>
    inspections: Array<LineInspection>
    translations: Array<LineTranslation>
    logs?: Array<InteractionLogORM>
    threads?: Array<ChatThread>
    messages?: Array<ThreadMessage>
}
