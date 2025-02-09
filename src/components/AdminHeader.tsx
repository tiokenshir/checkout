import { Box, Flex, Avatar, Text, Stack, IconButton, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react'
import { Settings, LogOut, Menu as MenuIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { NotificationCenter } from './NotificationCenter'
import { useNavigate } from 'react-router-dom'

type AdminHeaderProps = {
  onMenuClick?: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <Box
      bg="white"
      px={6}
      py={2}
      borderBottom="1px"
      borderColor="gray.200"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center" h="full">
        {/* Perfil do usuário */}
        <Flex align="center" gap={4}>
          {/* Menu button for mobile */}
          {onMenuClick && (
            <IconButton
              aria-label="Menu"
              icon={<MenuIcon size={20} />}
              variant="ghost"
              onClick={onMenuClick}
              display={{ base: 'flex', md: 'none' }}
            />
          )}
          
          <Avatar
            size="md"
            name={user?.user_metadata?.name || user?.email}
            src={user?.user_metadata?.avatar_url}
          />
          <Stack spacing={0}>
            <Text fontWeight="bold">{user?.user_metadata?.name || 'Configure seu perfil'}</Text>
            <Text fontSize="sm" color="gray.600">Administrador</Text>
          </Stack>
        </Flex>

        {/* Ações */}
        <Flex align="center" gap={2}>
          <NotificationCenter />
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<Settings size={20} />}
              variant="ghost"
            />
            <MenuList>
              <MenuItem onClick={() => navigate('/admin/profile')}>
                Meu Perfil
              </MenuItem>
              <MenuItem onClick={signOut}>
                Sair
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    </Box>
  )
}