import { useState, useEffect } from 'react'
import {
  Box,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Stack,
  Text,
  Badge,
  Button,
  useToast,
} from '@chakra-ui/react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

type Notification = {
  id: string
  created_at: string
  title: string
  content: string
  type: 'order_status' | 'payment' | 'system'
  read: boolean
  data?: Record<string, any>
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const toast = useToast()

  useEffect(() => {
    fetchNotifications()

    // Inscrever para atualizações em tempo real
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Mostrar toast para novas notificações
          toast({
            title: newNotification.title,
            description: newNotification.content,
            status: 'info',
            duration: 5000,
            isClosable: true,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select()
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  async function markAsRead(id?: string) {
    try {
      let query = supabase
        .from('notifications')
        .update({ read: true })

      if (id) {
        query = query.eq('id', id)
      } else {
        query = query.eq('read', false)
      }

      const { error } = await query

      if (error) throw error

      if (id) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            icon={<Bell size={20} />}
            variant="ghost"
          />
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              colorScheme="red"
              borderRadius="full"
              minW="5"
              textAlign="center"
            >
              {unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent width="400px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Text fontWeight="bold">Notificações</Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => markAsRead()}
              >
                Marcar todas como lidas
              </Button>
            )}
          </Box>
        </PopoverHeader>
        <PopoverBody maxH="400px" overflowY="auto">
          <Stack spacing={2}>
            {notifications.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={4}>
                Nenhuma notificação
              </Text>
            ) : (
              notifications.map(notification => (
                <Box
                  key={notification.id}
                  p={3}
                  bg={notification.read ? 'white' : 'gray.50'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <Text fontWeight="medium">{notification.title}</Text>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    {notification.content}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {format(new Date(notification.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                </Box>
              ))
            )}
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}