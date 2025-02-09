import { supabase } from '../lib/supabase'

type NotificationType = 'order_status' | 'payment' | 'system'

type NotificationData = {
  title: string
  content: string
  type: NotificationType
  data?: Record<string, any>
}

export async function createNotification(notification: NotificationData) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        read: false,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)

    if (error) throw error
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

export async function deleteNotification(id: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}