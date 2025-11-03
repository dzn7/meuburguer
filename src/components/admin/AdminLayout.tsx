'use client'

import { useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  Receipt,
  AddCircle,
  Inventory,
  Assessment,
  Logout,
  DarkMode,
  LightMode,
} from '@mui/icons-material'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useTheme as useNextTheme } from 'next-themes'

const drawerWidth = 280

type AdminLayoutProps = {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { logout } = useAdminAuth()
  const { theme, setTheme } = useNextTheme()
  const router = useRouter()
  const pathname = usePathname()
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
  }

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
    { text: 'Pedidos', icon: <Receipt />, path: '/admin/pedidos' },
    { text: 'Novo Pedido', icon: <AddCircle />, path: '/admin/pedidos/novo' },
    { text: 'Produtos', icon: <Inventory />, path: '/admin/produtos' },
    { text: 'Adicionais', icon: <AddCircle />, path: '/admin/adicionais' },
    { text: 'Relatórios', icon: <Assessment />, path: '/admin/relatorios' },
  ]

  const drawer = (
    <Box className="h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      <Box className="p-6 flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <Image
          src="/assets/meuburger.png"
          alt="Meu Burguer"
          width={40}
          height={40}
          className="object-contain"
        />
        <Typography variant="h6" className="font-bold text-zinc-900 dark:text-white">
          Meu Burguer
        </Typography>
      </Box>
      <List className="p-3">
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding className="mb-1">
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => {
                // Fechar drawer mobile imediatamente
                if (mobileOpen) {
                  handleDrawerToggle()
                }
                // Navegar
                router.push(item.path)
              }}
              className={`rounded-lg transition-all duration-200 ${
                pathname === item.path
                  ? 'bg-dourado-100 dark:bg-dourado-900/30 text-dourado-700 dark:text-dourado-400'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'transparent',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'transparent',
                },
              }}
            >
              <ListItemIcon
                className={
                  pathname === item.path
                    ? 'text-dourado-600 dark:text-dourado-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  className: 'font-medium',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppBar
        position="fixed"
        elevation={0}
        className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'transparent',
          '&.MuiAppBar-root': {
            backgroundColor: 'transparent !important',
          },
        }}
      >
        <Toolbar 
          className="flex justify-between px-4 md:px-6 h-16"
          sx={{
            backgroundColor: 'transparent',
            minHeight: '64px !important',
          }}
        >
          <Box className="flex items-center gap-3 md:gap-4">
            <IconButton
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              className="text-zinc-700 dark:text-white md:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              sx={{
                color: '#3f3f46',
                '&:hover': {
                  backgroundColor: '#f4f4f5',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
            <Box>
              <Typography
                variant="h6"
                noWrap
                component="div"
                className="text-zinc-900 dark:text-white font-semibold text-lg md:text-xl"
                sx={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {pathname === '/admin/dashboard' && 'Dashboard'}
                {pathname === '/admin/pedidos' && 'Gerenciar Pedidos'}
                {pathname === '/admin/pedidos/novo' && 'Novo Pedido'}
                {pathname.includes('/admin/pedidos/') && pathname.includes('/editar') && 'Editar Pedido'}
                {pathname.includes('/admin/pedidos/') && !pathname.includes('/editar') && !pathname.includes('/novo') && 'Detalhes do Pedido'}
              </Typography>
              <Typography 
                variant="caption" 
                className="text-zinc-500 dark:text-zinc-400 text-xs hidden sm:block mt-0.5"
                sx={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 400,
                }}
              >
                Meu Burguer Admin
              </Typography>
            </Box>
          </Box>
          <Box className="flex items-center gap-1">
            <IconButton
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 
                       transition-colors rounded-lg"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <LightMode className="w-5 h-5" /> : <DarkMode className="w-5 h-5" />}
            </IconButton>
            <IconButton onClick={handleMenuClick} className="ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Avatar className="bg-gradient-to-br from-amber-500 to-amber-600 text-white w-8 h-8 md:w-9 md:h-9 text-xs md:text-sm font-bold shadow-sm border-2 border-amber-200 dark:border-amber-700">
                A
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              className="mt-2"
              PaperProps={{
                className: 'mt-2 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800',
              }}
            >
              <MenuItem 
                onClick={handleLogout} 
                className="gap-3 text-sm px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Logout fontSize="small" />
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="menu navegação"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950"
        sx={{
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

