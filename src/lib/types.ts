export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'X / Twitter'
export type Niche = 'Lifestyle' | 'Fitness' | 'Gotowanie' | 'Gaming' | 'Beauty' | 'Biznes' | 'Inne'
export type ContentType = 'Reels' | 'Karuzela' | 'Stories' | 'Post'
export type Mood = 'Trend teraz' | 'Evergreen' | 'Zaskocz mnie'

export interface UserProfile {
  name: string
  platforms: Platform[]
  niches: Niche[]
}

export interface WorkflowState {
  platform: Platform | null
  contentType: ContentType | null
  mood: Mood | null
}

export interface ContentIdea {
  id: string
  title: string
  body: string
  tags: string[]
  hot: boolean
}

export interface HistoryItem {
  id: string
  ideas: ContentIdea[]
  platform: Platform
  contentType: ContentType
  mood: Mood
  createdAt: string
  saved: boolean
  used: boolean
}
