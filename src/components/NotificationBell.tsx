import { useEffect, useState } from 'react'
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
  Icon,
} from '@chakra-ui/react'
import { Bell, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

type Notification = Database['public']['Tables']['notifications']['Row']

const NOTIFICATION_ICONS = {
  order_status: CheckCircle,
  payment: AlertCircle,
  system: Info,
  alert: AlertTriangle,
}

const NOTIFICATION_COLORS = {
  order_status: 'green',
  payment: 'blue',
  system: 'gray',
  alert: 'orange',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const toast = useToast()

  useEffect(() => {
    fetchNotifications()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.user()?.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Show toast for new notifications
          toast({
            title: payload.new.title,
            description: payload.new.content,
            status: NOTIFICATION_COLORS[payload.new.type] as any,
            duration: 5000,
            isClosable: true,
            icon: <Icon as={NOTIFICATION_ICONS[payload.new.type]} />,
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
            <Text fontWeight="bold">Notifications</Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => markAsRead()}
              >
                Mark all as read
              </Button>
            )}
          </Box>
        </PopoverHeader>
        <PopoverBody maxH="400px" overflowY="auto">
          <Stack spacing={2}>
            {notifications.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={4}>
                No notifications
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
                  display="flex"
                  gap={3}
                >
                  <Box color={`${NOTIFICATION_COLORS[notification.type]}.500`} mt={1}>
                    <Icon as={NOTIFICATION_ICONS[notification.type]} size={20} />
                  </Box>
                  <Box flex={1}>
                    <Text fontWeight="medium">{notification.title}</Text>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      {notification.content}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {format(parseISO(notification.created_at), "dd/MM/yyyy 'at' HH:mm", { locale: ptBR })}
                    </Text>
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}