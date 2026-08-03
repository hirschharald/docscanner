export interface Document {
  id: string
  name: string
  dataUrl: string
  type: 'scan' | 'upload'
  createdAt: number
  tags: string[]
}

export type Theme = 'light' | 'dark'

export interface AppState {
  documents: Document[]
  theme: Theme
}
