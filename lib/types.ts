export type Role = 'student' | 'teacher'
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed'
export type EntryKind = 'answer' | 'correction' | 'comment' | 'class_note'

export interface Person { id: string; name: string; role: Role }

export interface Attachment {
  id: string
  entityType: 'material' | 'activity' | 'contribution' | 'notebook'
  entityId: string
  filePath: string
  fileName: string
  signedUrl?: string
  uploadedBy: string
  createdAt: string
}

export interface Contribution {
  id: string
  activityId: string
  author: Person
  kind: EntryKind
  body: string
  originalText?: string
  createdAt: string
  attachments: Attachment[]
}

export interface Activity {
  id: string
  title: string
  instructions: string
  actionType: string
  status: ActivityStatus
  dueDate?: string
  bookReference?: string
  materialId?: string
  materialTitle?: string
  createdBy: Person
  createdAt: string
  attachments: Attachment[]
}

export interface Material {
  id: string
  title: string
  description: string
  type: string
  category: string
  url?: string
  pinned: boolean
  createdBy: Person
  createdAt: string
  attachments: Attachment[]
}

export interface VocabularyItem {
  id: string
  term: string
  translation: string
  pronunciation: string
  notes: string
  classDate?: string
  createdBy: Person
  createdAt: string
}

export interface NotebookEntry {
  id: string
  title: string
  date: string
  topic: string
  notes: string
  relatedActivityId?: string
  createdBy: Person
  createdAt: string
  attachments: Attachment[]
}
