import { Box, Container, Link as ChakraLink, useBreakpointValue, useDisclosure, Flex, Icon, Text, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Stack, Drawer, DrawerOverlay, DrawerContent, DrawerBody } from '@chakra-ui/react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, FileText, Settings, Database, History, Calendar, Cloud, Webhook, BarChart2, Workflow, Shield, LineChart as ChartLine } from 'lucide-react'
import { AdminHeader } from '../AdminHeader'

const NAV_ITEMS = [
  {
    title: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/admin' },
      { icon: Package, label: 'Produtos', to: '/admin/products' },
      { icon: ShoppingCart, label: 'Pedidos', to: '/admin/orders' },
    ]
  },
  {
    title: 'Relatórios',
    items: [
      { icon: FileText, label: 'Relatórios', to: '/admin/reports' },
      { icon: Calendar, label: 'Agendamentos', to: '/admin/scheduled-reports' },
    ]
  },
  {
    title: 'Integrações',
    items: [
      { icon: Cloud, label: 'Armazenamento', to: '/admin/storage' },
      { icon: Webhook, label: 'APIs Externas', to: '/admin/integrations' },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { icon: BarChart2, label: 'Análises', to: '/admin/analytics' },
      { icon: ChartLine, label: 'Previsões', to: '/admin/forecasts' },
    ]
  },
  {
    title: 'Automação',
    items: [
      { icon: Workflow, label: 'Workflows', to: '/admin/workflows' },
      { icon: Settings, label: 'Regras', to: '/admin/rules' },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { icon: Settings, label: 'Configurações', to: '/admin/settings' },
      { icon: Database, label: 'Backup', to: '/admin/backup' },
      { icon: History, label: 'Auditoria', to: '/admin/audit' },
      { icon: Shield, label: 'Segurança', to: '/admin/security' },
    ]
  },
]

function Sidebar({ onItemClick, isMobile }: { onItemClick?: () => void, isMobile?: boolean }) {
  const location = useLocation()
  
  // Encontrar o índice da seção ativa
  const activeIndex = NAV_ITEMS.findIndex(section => 
    section.items.some(item => item.to === location.pathname)
  )

  return (
    <Accordion 
      defaultIndex={isMobile ? [activeIndex] : undefined} // No mobile, abre apenas a seção ativa
      allowToggle // Permite apenas uma seção aberta por vez
      reduceMotion // Reduz animações para melhor performance
    >
      {NAV_ITEMS.map((section, sectionIndex) => {
        const hasActiveItem = section.items.some(item => item.to === location.pathname)
        
        return (
          <AccordionItem key={sectionIndex} border="none">
            <AccordionButton 
              py={2} 
              px={3}
              _hover={{ bg: 'gray.50' }}
              borderRadius="lg"
              bg={hasActiveItem ? 'gray.50' : 'transparent'}
            >
              <Box flex="1" textAlign="left">
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color={hasActiveItem ? 'brand.500' : 'gray.700'}
                >
                  {section.title}
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} px={2}>
              <Stack spacing={1}>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to
                  return (
                    <ChakraLink
                      key={item.to}
                      as={Link}
                      to={item.to}
                      display="flex"
                      alignItems="center"
                      gap={2}
                      px={2}
                      py={2}
                      color={isActive ? "brand.500" : "gray.700"}
                      bg={isActive ? "brand.50" : "transparent"}
                      _hover={{
                        bg: isActive ? "brand.50" : "gray.50",
                        color: isActive ? "brand.500" : "gray.900",
                      }}
                      borderRadius="lg"
                      onClick={onItemClick}
                      transition="all 0.2s"
                      fontSize="sm"
                    >
                      <Icon as={item.icon} size={18} />
                      <Text>{item.label}</Text>
                    </ChakraLink>
                  )
                })}
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

export function AdminLayout() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const showMobileMenu = useBreakpointValue({ base: true, md: false })
  const sidebarWidth = "200px" // Reduzido de 240px para 200px

  return (
    <Box minH="100vh">
      {/* Header */}
      <Box 
        position="fixed" 
        top={0} 
        left={0} 
        right={0} 
        zIndex={9999}
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        h="64px"
      >
        <AdminHeader onMenuClick={showMobileMenu ? () => isOpen ? onClose() : onOpen() : undefined} />
      </Box>
      
      <Flex pt="64px">
        {/* Sidebar Desktop */}
        {!showMobileMenu && (
          <Box 
            w={sidebarWidth} 
            bg="white" 
            borderRight="1px" 
            borderColor="gray.200" 
            h="calc(100vh - 64px)"
            position="fixed"
            top="64px"
            left={0}
            zIndex={1100}
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#CBD5E0',
                borderRadius: '24px',
              },
            }}
          >
            <Box p={3}>
              <Sidebar />
            </Box>
          </Box>
        )}
        
        {/* Drawer Mobile */}
        <Drawer
          isOpen={showMobileMenu && isOpen}
          placement="left"
          onClose={onClose}
        >
          <DrawerOverlay />
          <DrawerContent maxW={sidebarWidth}>
            <Box pt="64px">
              <DrawerBody p={3}>
                <Sidebar onItemClick={onClose} isMobile={true} />
              </DrawerBody>
            </Box>
          </DrawerContent>
        </Drawer>
        
        {/* Conteúdo Principal */}
        <Box 
          flex={1} 
          bg="gray.50" 
          p={{ base: 4, md: 6, lg: 8 }} 
          ml={showMobileMenu ? 0 : sidebarWidth}
          minH="calc(100vh - 64px)"
          position="relative"
        >
          <Container maxW="container.xl">
            <Outlet />
          </Container>
        </Box>
      </Flex>
    </Box>
  )
}