import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import BookingsPage from './pages/BookingsPage'
import FavoritesPage from './pages/FavoritesPage'
import PortsPage from './pages/PortsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import AdminPage from './pages/AdminPage'
import AdminLoginPage from './pages/AdminLoginPage'
import { getMe } from './services/api'
import { useTheme } from './contexts/ThemeContext'

function ProtectedRoute({ children, user, loading }) {
	if (loading) return null
	const hasToken = !!localStorage.getItem('accessToken')
	if (!hasToken || user === null) return <Navigate to="/login" replace />
	return children
}

export default function App() {
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const navigate = useNavigate()
	const { theme, toggleTheme } = useTheme()
	
	useEffect(() => {
		// Only load user if not on admin routes
		if (!window.location.pathname.startsWith('/admin')) {
			getMe()
				.then(u => setUser(u))
				.catch(() => setUser(null))
				.finally(() => setLoading(false))
		} else {
			setLoading(false)
		}
	}, [])

	const logout = () => {
		localStorage.removeItem('accessToken')
		setUser(null)
		navigate('/login')
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<nav className="nav">
				<Link className="link" to="/">
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M8 0L0 6v10h5v-6h6v6h5V6L8 0z" fill="currentColor"/>
					</svg>
					Map
				</Link>
				<Link className="link" to="/ports">
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="2" y="7" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<path d="M14 10v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
					</svg>
					Ports
				</Link>
				{user && (
					<>
						<Link className="link" to="/favorites">
							<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 13.35l-1.45-1.32C3.4 9.36 1 6.78 1 4.5 1 2.42 2.92 1 5 1c1.24 0 2.41.81 3 2.09C8.59 1.81 9.76 1 11 1c2.08 0 4 1.42 4 3.5 0 2.28-2.4 4.86-5.55 7.54L8 13.35z" fill="currentColor" opacity="0.7"/>
							</svg>
							Favorites
						</Link>
						<Link className="link" to="/bookings">
							<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
								<path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
							</svg>
							My Bookings
						</Link>
						<Link className="link" to="/subscriptions">
							<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 1L2 4v3c0 4.42 3.58 8 8 8s8-3.58 8-8V4l-6-3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
							</svg>
							Subscriptions
						</Link>
						{user.isAdmin && (
							<Link className="link" to="/admin">
								<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									<rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									<rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									<rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
								</svg>
								Admin
							</Link>
						)}
					</>
				)}
				<div className="spacer">
					<button className="btn btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
						{theme === 'dark' ? (
							<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<circle cx="8" cy="8" r="4" fill="currentColor"/>
								<path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.64 3.64l1.41 1.41M10.95 10.95l1.41 1.41M3.64 12.36l1.41-1.41M10.95 5.05l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
							</svg>
						) : (
							<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8 1v2M8 13v2M1 8h2M13 8h2M3.64 3.64l1.41 1.41M10.95 10.95l1.41 1.41M3.64 12.36l1.41-1.41M10.95 5.05l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
							</svg>
						)}
					</button>
					{user ? (
						<>
							<span className="muted nav-user" style={{ marginRight: 12 }}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									<path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
								</svg>
								Hi, {user.fullName || user.email}
							</span>
							<button className="btn btn-outline" onClick={logout}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l4-4-4-4M14 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								Logout
							</button>
						</>
					) : (
						<>
							<Link className="btn btn-outline" to="/login">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									<path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
								</svg>
								Login
							</Link>
							<Link className="btn btn-primary" to="/signup" style={{ marginLeft: 8 }}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
								</svg>
								Signup
							</Link>
						</>
					)}
				</div>
			</nav>
			<div style={{ flex: 1 }}>
				<Routes>
					<Route path="/" element={<MapPage user={user} />} />
					<Route path="/login" element={<LoginPage onLogin={setUser} />} />
					<Route path="/signup" element={<SignupPage onSignup={setUser} />} />
					<Route path="/ports" element={<PortsPage user={user} />} />
					<Route path="/favorites" element={<ProtectedRoute user={user} loading={loading}><FavoritesPage /></ProtectedRoute>} />
					<Route path="/bookings" element={<ProtectedRoute user={user} loading={loading}><BookingsPage /></ProtectedRoute>} />
					<Route path="/subscriptions" element={<ProtectedRoute user={user} loading={loading}><SubscriptionsPage /></ProtectedRoute>} />
					<Route path="/admin/login" element={<AdminLoginPage onAdminLogin={setUser} />} />
					<Route path="/admin" element={<AdminPage />} />
				</Routes>
			</div>
		</div>
	)
}



