'use server'

export type ChatMode = 'preview' | 'code' | 'design' | 'database'

export {
  archiveChat,
  createChat,
  deleteChat,
  duplicateChat,
  getChat,
  getChatById,
  getChatsList,
  pinChat,
  renameChat,
  toggleChatArchive,
  toggleChatPin,
  updateChatTitle,
} from './chat'
