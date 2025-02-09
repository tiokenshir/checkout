import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Grid,
  Card,
  CardHeader,
  CardBody,
  Text,
  Select,
  Stack,
  Button,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Flex,
  IconButton,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { format, subDays, startOfDay, endOfDay, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export function AdminDashboard() {
  const [period, setPeriod] = useState('7')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [totalSales, setTotalSales] = useState(0)
  const [salesByDay, setSalesByDay] = useState<any[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([])
  const [salesByProduct, setSalesByProduct] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day')
  const toast = useToast()
  const bgCard = useColorModeValue('white', 'gray.800')

  useEffect(() => {
    fetchData()
  }, [period, viewMode])

  async function fetchData() {
    try {
      setLoading(true)
      const startDate = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd')
      
      // Fetch orders with products
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            name,
            price
          )
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError
      
      setOrders(ordersData)
      
      // Calculate total sales
      const total = ordersData.reduce((sum, order) => sum + order.total_amount, 0)
      setTotalSales(total)

      // Calculate sales by period
      const periodData = viewMode === 'day' 
        ? Array.from({ length: parseInt(period) }, (_, i) => {
            const date = subDays(new Date(), i)
            const ordersOfDay = ordersData.filter(order => {
              const orderDate = new Date(order.created_at)
              return orderDate >= startOfDay(date) && orderDate <= endOfDay(date)
            })
            return {
              date: format(date, 'dd/MM', { locale: ptBR }),
              total: ordersOfDay.reduce((sum, order) => sum + order.total_amount, 0),
              count: ordersOfDay.length,
            }
          }).reverse()
        : Array.from({ length: 12 }, (_, i) => {
            const date = subMonths(new Date(), i)
            const monthStart = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1))
            const monthEnd = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0))
            
            const ordersOfMonth = ordersData.filter(order => {
              const orderDate = new Date(order.created_at)
              return orderDate >= monthStart && orderDate <= monthEnd
            })
            return {
              date: format(date, 'MMM/yy', { locale: ptBR }),
              total: ordersOfMonth.reduce((sum, order) => sum + order.total_amount, 0),
              count: ordersOfMonth.length,
            }
          }).reverse()

      setSalesByDay(periodData)

      // Calculate orders by status
      const statusCount = ordersData.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setOrdersByStatus(Object.entries(statusCount).map(([name, value]) => ({
        name,
        value,
      })))

      // Calculate sales by product
      const productSales = ordersData.reduce((acc, order) => {
        const existing = acc.find(item => item.name === order.products.name)
        if (existing) {
          existing.total += order.total_amount
          existing.count += 1
        } else {
          acc.push({
            name: order.products.name,
            total: order.total_amount,
            count: 1,
          })
        }
        return acc
      }, [] as any[])

      setSalesByProduct(productSales.sort((a, b) => b.total - a.total))
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Box mb={6}>
        <Flex 
          justify="space-between" 
          align="center" 
          mb={6}
          direction={{ base: "column", sm: "row" }}
          gap={4}
        >
          <Heading size="lg">Dashboard</Heading>
          <Flex gap={4}>
            <Select
              w={{ base: "full", sm: "200px" }}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </Select>
            <IconButton
              aria-label="Atualizar"
              icon={<RefreshCw size={20} />}
              onClick={fetchData}
              isLoading={loading}
            />
          </Flex>
        </Flex>

        {/* Cards em Grid Responsivo */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
          <Card bg={bgCard}>
            <CardBody>
              <Stat>
                <StatLabel>Vendas Totais</StatLabel>
                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>
                  R$ {totalSales.toFixed(2)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  23.36%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgCard}>
            <CardBody>
              <Stat>
                <StatLabel>Pedidos</StatLabel>
                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>
                  {orders.length}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  9.05%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgCard}>
            <CardBody>
              <Stat>
                <StatLabel>Ticket Médio</StatLabel>
                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>
                  R$ {(totalSales / (orders.length || 1)).toFixed(2)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  12.48%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgCard}>
            <CardBody>
              <Stat>
                <StatLabel>Taxa de Conversão</StatLabel>
                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>
                  {((orders.filter(o => o.status === 'paid').length / orders.length) * 100).toFixed(1)}%
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  3.38%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Gráficos */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Gráfico de Vendas */}
          <Card bg={bgCard}>
            <CardHeader>
              <Heading size="md">Vendas por Período</Heading>
            </CardHeader>
            <CardBody>
              <Tabs>
                <TabList>
                  <Tab onClick={() => setViewMode('day')}>Diário</Tab>
                  <Tab onClick={() => setViewMode('month')}>Mensal</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={0} pt={4}>
                    <Box h="300px">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#0ea5e9"
                            fill="#0ea5e9"
                            fillOpacity={0.1}
                            name="Total"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </TabPanel>

                  <TabPanel p={0} pt={4}>
                    <Box h="300px">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                          <Bar dataKey="total" fill="#0ea5e9" name="Total" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>

          {/* Status dos Pedidos */}
          <Card bg={bgCard}>
            <CardHeader>
              <Heading size="md">Status dos Pedidos</Heading>
            </CardHeader>
            <CardBody>
              <Box h="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardBody>
          </Card>

          {/* Top Produtos */}
          <Card bg={bgCard}>
            <CardHeader>
              <Heading size="md">Top Produtos</Heading>
            </CardHeader>
            <CardBody>
              <Box h="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByProduct.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Bar dataKey="total" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Box>
    </Box>
  )
}