import { useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Stack,
  Select,
  Button,
  Grid,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
} from '@chakra-ui/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { Download, FileText } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { generateReport } from '../../utils/reports'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export function Reports() {
  const toast = useToast()
  const [period, setPeriod] = useState('7')
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState('sales')
  const [reportData, setReportData] = useState<any[]>([])

  async function fetchReportData() {
    setLoading(true)
    try {
      const startDate = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd')
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          products (*)
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      setReportData(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadReport() {
    try {
      setLoading(true)
      const reportUrl = await generateReport(reportType, reportData)
      
      // Create download link
      const link = document.createElement('a')
      link.href = reportUrl
      link.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  // Sales by Product Chart
  const salesByProduct = reportData.reduce((acc, order) => {
    const existing = acc.find(item => item.name === order.products.name)
    if (existing) {
      existing.value += order.total_amount
      existing.count += 1
    } else {
      acc.push({
        name: order.products.name,
        value: order.total_amount,
        count: 1,
      })
    }
    return acc
  }, [] as any[]).sort((a, b) => b.value - a.value)

  // Sales by Day Chart
  const salesByDay = Array.from({ length: parseInt(period) }, (_, i) => {
    const date = subDays(new Date(), i)
    const ordersOfDay = reportData.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= startOfDay(date) && orderDate <= endOfDay(date)
    })
    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      total: ordersOfDay.reduce((sum, order) => sum + order.total_amount, 0),
      count: ordersOfDay.length,
    }
  }).reverse()

  // Status Distribution Chart
  const statusDistribution = reportData.reduce((acc, order) => {
    const existing = acc.find(item => item.name === order.status)
    if (existing) {
      existing.value += 1
    } else {
      acc.push({
        name: order.status,
        value: 1,
      })
    }
    return acc
  }, [] as any[])

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Heading>Reports</Heading>
        <Stack direction="row" spacing={4}>
          <Select
            w="200px"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="15">Last 15 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Button
            leftIcon={<Download size={20} />}
            onClick={handleDownloadReport}
            isLoading={loading}
          >
            Download Report
          </Button>
        </Stack>
      </Box>

      <Tabs>
        <TabList>
          <Tab>Sales Overview</Tab>
          <Tab>Products Analysis</Tab>
          <Tab>Customer Insights</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Stack spacing={8}>
              {/* Sales Over Time */}
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={6}>Sales Over Time</Heading>
                <Box h="400px">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#0ea5e9"
                        name="Total Sales"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              {/* Status Distribution */}
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={6}>Order Status Distribution</Heading>
                <Box h="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              {/* Recent Orders */}
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={6}>Recent Orders</Heading>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Customer</Th>
                      <Th>Product</Th>
                      <Th isNumeric>Amount</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {reportData.slice(0, 5).map((order) => (
                      <Tr key={order.id}>
                        <Td>
                          {format(parseISO(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </Td>
                        <Td>{order.customers.name}</Td>
                        <Td>{order.products.name}</Td>
                        <Td isNumeric>R$ {order.total_amount.toFixed(2)}</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              order.status === 'paid' ? 'green' :
                              order.status === 'pending' ? 'yellow' :
                              'red'
                            }
                          >
                            {order.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Stack>
          </TabPanel>

          <TabPanel>
            <Stack spacing={8}>
              {/* Top Products */}
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={6}>Top Products by Revenue</Heading>
                <Box h="400px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByProduct}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                      <Bar dataKey="value" fill="#0ea5e9" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              {/* Product Performance */}
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={6}>Product Performance</Heading>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Product</Th>
                      <Th isNumeric>Sales</Th>
                      <Th isNumeric>Revenue</Th>
                      <Th isNumeric>Avg. Price</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {salesByProduct.map((product) => (
                      <Tr key={product.name}>
                        <Td>{product.name}</Td>
                        <Td isNumeric>{product.count}</Td>
                        <Td isNumeric>R$ {product.value.toFixed(2)}</Td>
                        <Td isNumeric>R$ {(product.value / product.count).toFixed(2)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Stack>
          </TabPanel>

          <TabPanel>
            <Stack spacing={8}>
              {/* Customer Overview */}
              <Grid templateColumns="repeat(3, 1fr)" gap={6}>
                <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                  <Text fontSize="sm" color="gray.500">Total Customers</Text>
                  <Text fontSize="3xl" fontWeight="bold">
                    {new Set(reportData.map(order => order.customer_id)).size}
                  </Text>
                </Box>

                <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                  <Text fontSize="sm" color="gray.500">Average Order Value</Text>
                  <Text fontSize="3xl" fontWeight="bold">
                    R$ {(reportData.reduce((sum, order) => sum + order.total_amount, 0) / reportData.length).toFixed(2)}
                  </Text>
                </Box>

                <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                  <Text fontSize="sm" color="gray.500">Repeat Customers</Text>
                  <Text fontSize="3xl" fontWeight="bold">
                    {Object.values(reportData.reduce((acc, order) => {
                      acc[order.customer_id] = (acc[order.customer_id] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)).filter(count => count > 1).length}
                  </Text>
                </Box>
              </Grid>

              {/* Top Customers */}
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={6}>Top Customers</Heading>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Customer</Th>
                      <Th>Email</Th>
                      <Th isNumeric>Orders</Th>
                      <Th isNumeric>Total Spent</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.values(reportData.reduce((acc, order) => {
                      if (!acc[order.customer_id]) {
                        acc[order.customer_id] = {
                          name: order.customers.name,
                          email: order.customers.email,
                          orders: 0,
                          total: 0,
                        }
                      }
                      acc[order.customer_id].orders += 1
                      acc[order.customer_id].total += order.total_amount
                      return acc
                    }, {} as Record<string, any>))
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 10)
                      .map((customer, index) => (
                        <Tr key={index}>
                          <Td>{customer.name}</Td>
                          <Td>{customer.email}</Td>
                          <Td isNumeric>{customer.orders}</Td>
                          <Td isNumeric>R$ {customer.total.toFixed(2)}</Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
              </Box>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}