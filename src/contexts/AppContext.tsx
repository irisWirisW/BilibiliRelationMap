import React, { createContext, useContext } from 'react'
import { App } from 'antd'
import type { MessageInstance } from 'antd/es/message/interface'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm'
import type { NotificationInstance } from 'antd/es/notification/interface'

interface AppContextType {
  message: MessageInstance
  modal: Omit<ModalStaticFunctions, 'warn'>
  notification: NotificationInstance
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message, modal, notification } = App.useApp()

  return (
    <AppContext.Provider value={{ message, modal, notification }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
