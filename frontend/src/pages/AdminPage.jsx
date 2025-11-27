import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminStats, getAdminPorts, createAdminPort, updateAdminPort, deleteAdminPort, getAdminUsers, updateAdminUser, getAdminBookings, getMe } from '../services/api'
import LocationPicker from '../components/LocationPicker'

export default function AdminPage() {
	const navigate = useNavigate()
	const [activeTab, setActiveTab] = useState('dashboard')
	const [stats, setStats] = useState(null)
	const [ports, setPorts] = useState([])
	const [users, setUsers] = useState([])
	const [bookings, setBookings] = useState([])
	const [loading, setLoading] = useState(true) // Start with loading true to prevent rendering before auth check
	const [error, setError] = useState('')
	const [user, setUser] = useState(null)
	const [authChecked, setAuthChecked] = useState(false) // Track if auth check is complete
	const [isCreatingPort, setIsCreatingPort] = useState(false) // Track if we're in create mode
	
	// Port form state
	const [editingPort, setEditingPort] = useState(null)
	const [portForm, setPortForm] = useState({
		name: '',
		city: '',
		address: '',
		latitude: '',
		longitude: '',
		connectorType: '',
		powerKw: '',
		imageUrl: '',
		schedules: Array.from({ length: 7 }, (_, i) => ({ weekday: i, open: '08:00', close: '22:00' }))
	})
	const [imageFile, setImageFile] = useState(null)
	const [imagePreview, setImagePreview] = useState('')

	useEffect(() => {
		// Check if user is logged in and is admin
		const checkAdminAccess = async () => {
			const token = localStorage.getItem('accessToken')
			if (!token) {
				navigate('/admin/login', { replace: true })
				return
			}
			
			try {
				const currentUser = await getMe()
				if (!currentUser || !currentUser.isAdmin) {
					// Not an admin, redirect to admin login
					localStorage.removeItem('accessToken')
					localStorage.removeItem('adminToken')
					navigate('/admin/login', { replace: true })
					return
				}
				setUser(currentUser)
				setAuthChecked(true)
				await loadDashboard()
			} catch (err) {
				// Token invalid or expired
				localStorage.removeItem('accessToken')
				localStorage.removeItem('adminToken')
				navigate('/admin/login', { replace: true })
			}
		}
		
		checkAdminAccess()
	}, [navigate])

	const loadDashboard = async () => {
		setError('')
		setLoading(true)
		try {
			const statsData = await getAdminStats()
			setStats(statsData)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to load dashboard')
		} finally {
			setLoading(false)
		}
	}

	const loadPorts = async () => {
		setLoading(true)
		setError('')
		try {
			const portsData = await getAdminPorts()
			setPorts(portsData)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to load ports')
		} finally {
			setLoading(false)
		}
	}

	const loadUsers = async () => {
		setLoading(true)
		setError('')
		try {
			const usersData = await getAdminUsers()
			setUsers(usersData)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to load users')
		} finally {
			setLoading(false)
		}
	}

	const loadBookings = async () => {
		setLoading(true)
		setError('')
		try {
			const bookingsData = await getAdminBookings()
			setBookings(bookingsData)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to load bookings')
		} finally {
			setLoading(false)
		}
	}

	const handleTabChange = (tab) => {
		setActiveTab(tab)
		setError('')
		if (tab === 'ports') {
			loadPorts()
		} else if (tab === 'users') {
			loadUsers()
		} else if (tab === 'bookings') {
			loadBookings()
		} else if (tab === 'dashboard') {
			loadDashboard()
		}
	}

	const handleCreatePort = () => {
		setEditingPort(null)
		setIsCreatingPort(true)
		setPortForm({
			name: '',
			city: '',
			address: '',
			latitude: '',
			longitude: '',
			connectorType: '',
			powerKw: '',
			imageUrl: '',
			schedules: Array.from({ length: 7 }, (_, i) => ({ weekday: i, open: '08:00', close: '22:00' }))
		})
		setImageFile(null)
		setImagePreview('')
	}

	const handleEditPort = (port) => {
		setEditingPort(port)
		setIsCreatingPort(false)
		const schedules = port.schedules || []
		const scheduleMap = {}
		schedules.forEach(s => {
			scheduleMap[s.weekday] = { weekday: s.weekday, open: s.open, close: s.close }
		})
		
		setPortForm({
			name: port.name || '',
			city: port.city || '',
			address: port.address || '',
			latitude: port.latitude?.toString() || '',
			longitude: port.longitude?.toString() || '',
			connectorType: port.connectorType || '',
			powerKw: port.powerKw?.toString() || '',
			imageUrl: port.imageUrl || '',
			schedules: Array.from({ length: 7 }, (_, i) => 
				scheduleMap[i] ? { ...scheduleMap[i], weekday: i } : { weekday: i, open: '08:00', close: '22:00' }
			)
		})
		setImageFile(null)
		setImagePreview(port.imageUrl || '')
	}

	const handleImageChange = (e) => {
		const file = e.target.files[0]
		if (file) {
			setImageFile(file)
			const reader = new FileReader()
			reader.onloadend = () => {
				setImagePreview(reader.result)
			}
			reader.readAsDataURL(file)
		}
	}

	const handleLocationChange = (lat, lng) => {
		setPortForm({
			...portForm,
			latitude: lat.toString(),
			longitude: lng.toString()
		})
	}

	const handleSavePort = async () => {
		setError('')
		if (!portForm.latitude || !portForm.longitude) {
			setError('Please select a location on the map')
			return
		}
		
		try {
			let imageUrl = null
			
			// Upload image if a new file is selected
			if (imageFile) {
				const formData = new FormData()
				formData.append('image', imageFile)
				try {
					const uploadResponse = await fetch('/api/admin/upload-image', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
						},
						body: formData
					})
					if (uploadResponse.ok) {
						const uploadData = await uploadResponse.json()
						imageUrl = uploadData.imageUrl
					} else {
						const errorData = await uploadResponse.json().catch(() => ({}))
						throw new Error(errorData.message || 'Failed to upload image')
					}
				} catch (uploadErr) {
					// If upload fails, keep existing image if editing
					console.error('Image upload failed:', uploadErr)
					const errorMsg = uploadErr.message || 'Failed to upload image'
					if (editingPort && editingPort.imageUrl) {
						// Keep existing image URL if editing, but show warning
						imageUrl = editingPort.imageUrl
						setError(`Image upload failed: ${errorMsg}. Keeping existing image.`)
						// Don't return, allow the save to continue with existing image
					} else {
						// Don't save image if upload failed for new port
						imageUrl = null
						setError(`Image upload failed: ${errorMsg}. Please try again or continue without image.`)
						return
					}
				}
			} else {
				// No new image selected
				if (editingPort) {
					// When editing, preserve existing image URL from the original port
					// portForm.imageUrl might be empty if user cleared it, so check original port
					imageUrl = portForm.imageUrl !== undefined ? portForm.imageUrl : (editingPort.imageUrl || '')
				} else {
					// When creating, use empty string if no image
					imageUrl = ''
				}
			}

			// Validate required fields
			if (!portForm.name || !portForm.name.trim()) {
				setError('Port name is required')
				return
			}
			if (!portForm.city || !portForm.city.trim()) {
				setError('City is required')
				return
			}

			// Ensure all schedules have weekday field
			const schedulesWithWeekday = portForm.schedules.map((schedule, idx) => ({
				weekday: schedule.weekday !== undefined ? schedule.weekday : idx,
				open: schedule.open || '08:00',
				close: schedule.close || '22:00'
			}))

			const portData = {
				name: portForm.name.trim(),
				city: portForm.city.trim(),
				address: portForm.address?.trim() || '',
				latitude: parseFloat(portForm.latitude),
				longitude: parseFloat(portForm.longitude),
				connectorType: portForm.connectorType || '',
				powerKw: portForm.powerKw ? parseFloat(portForm.powerKw) : null,
				imageUrl: imageUrl || '',
				schedules: schedulesWithWeekday
			}

			if (editingPort) {
				await updateAdminPort(editingPort.id, portData)
			} else {
				await createAdminPort(portData)
			}
			
			await loadPorts()
			setEditingPort(null)
			setIsCreatingPort(false)
			setPortForm({
				name: '',
				city: '',
				address: '',
				latitude: '',
				longitude: '',
				connectorType: '',
				powerKw: '',
				imageUrl: '',
				schedules: Array.from({ length: 7 }, (_, i) => ({ weekday: i, open: '08:00', close: '22:00' }))
			})
			setImageFile(null)
			setImagePreview('')
		} catch (err) {
			console.error('Error saving port:', err)
			const errorMessage = err.response?.data?.message || err.message || 'Failed to save port'
			setError(errorMessage)
		}
	}

	const handleDeletePort = async (portId) => {
		if (!confirm('Are you sure you want to delete this port?')) return
		try {
			await deleteAdminPort(portId)
			await loadPorts()
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to delete port')
		}
	}

	const handleToggleUserAdmin = async (user) => {
		try {
			await updateAdminUser(user.id, { isAdmin: !user.isAdmin })
			await loadUsers()
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update user')
		}
	}

	const formatDate = (isoString) => {
		if (!isoString) return 'N/A'
		const date = new Date(isoString)
		return date.toLocaleString('en-US', { 
			year: 'numeric', 
			month: 'short', 
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		})
	}

	const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


	// Show loading state while checking authentication or loading data
	if (!authChecked || loading) {
		return (
			<div className="page-container">
				<div className="loading">
					{!authChecked ? 'Verifying admin access...' : 'Loading admin panel...'}
				</div>
			</div>
		)
	}

	// If we get here and there's no user, we're being redirected
	if (!user) {
		return null
	}

	return (
		<div className="page-container">
			<div className="page-header">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<h1>Admin Panel</h1>
						<p>Manage ports, users, and monitor bookings</p>
					</div>
					<button 
						className="btn btn-outline"
						onClick={() => {
							localStorage.removeItem('accessToken')
							localStorage.removeItem('adminToken')
							navigate('/admin/login')
						}}
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l4-4-4-4M14 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						Logout
					</button>
				</div>
			</div>

			{error && (
				<div className="error-message" style={{ marginBottom: 24 }}>
					{error}
				</div>
			)}

			<div className="admin-tabs">
				<button 
					className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
					onClick={() => handleTabChange('dashboard')}
				>
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
						<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
					</svg>
					Dashboard
				</button>
				<button 
					className={`admin-tab ${activeTab === 'ports' ? 'active' : ''}`}
					onClick={() => handleTabChange('ports')}
				>
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
						<rect x="2" y="7" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<path d="M14 10v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
					</svg>
					Ports
				</button>
				<button 
					className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
					onClick={() => handleTabChange('users')}
				>
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
					</svg>
					Users
				</button>
				<button 
					className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
					onClick={() => handleTabChange('bookings')}
				>
					<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
						<rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
					</svg>
					Bookings
				</button>
			</div>

			<div className="admin-content">
				{activeTab === 'dashboard' && stats && (
					<div className="admin-dashboard">
						<div className="stats-grid">
							<div className="stat-card">
								<div className="stat-icon" style={{ background: 'rgba(79, 140, 255, 0.1)', color: 'var(--primary)' }}>
									<svg width="24" height="24" viewBox="0 0 16 16" fill="none">
										<circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
										<path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									</svg>
								</div>
								<div className="stat-content">
									<div className="stat-value">{stats.totalUsers}</div>
									<div className="stat-label">Total Users</div>
								</div>
							</div>
							<div className="stat-card">
								<div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
									<svg width="24" height="24" viewBox="0 0 16 16" fill="none">
										<rect x="2" y="7" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
										<path d="M14 10v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
									</svg>
								</div>
								<div className="stat-content">
									<div className="stat-value">{stats.totalPorts}</div>
									<div className="stat-label">Total Ports</div>
									<div className="stat-sublabel">{stats.activePorts} active</div>
								</div>
							</div>
							<div className="stat-card">
								<div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
									<svg width="24" height="24" viewBox="0 0 16 16" fill="none">
										<rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
										<path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
									</svg>
								</div>
								<div className="stat-content">
									<div className="stat-value">{stats.totalBookings}</div>
									<div className="stat-label">Total Bookings</div>
									<div className="stat-sublabel">{stats.todayBookings} today</div>
								</div>
							</div>
							<div className="stat-card">
								<div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
									<svg width="24" height="24" viewBox="0 0 16 16" fill="none">
										<path d="M8 1L2 4v3c0 4.42 3.58 8 8 8s8-3.58 8-8V4l-6-3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
									</svg>
								</div>
								<div className="stat-content">
									<div className="stat-value">{stats.activeSubscriptions}</div>
									<div className="stat-label">Active Subscriptions</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'ports' && (
					<div className="admin-ports">
						<div className="admin-section-header">
							<h2>Ports Management</h2>
							<button className="btn btn-primary" onClick={handleCreatePort}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
									<path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
								</svg>
								Add New Port
							</button>
						</div>

						{(editingPort || isCreatingPort) && (
							<div className="admin-form-card">
								<h3>{editingPort ? 'Edit Port' : 'Create New Port'}</h3>
								<div className="admin-form-grid">
									<div className="form-group">
										<label>Name *</label>
										<input
											type="text"
											value={portForm.name}
											onChange={(e) => setPortForm({ ...portForm, name: e.target.value })}
											placeholder="Port Name"
										/>
									</div>
									<div className="form-group">
										<label>City *</label>
										<input
											type="text"
											value={portForm.city}
											onChange={(e) => setPortForm({ ...portForm, city: e.target.value })}
											placeholder="City"
										/>
									</div>
									<div className="form-group">
										<label>Address</label>
										<input
											type="text"
											value={portForm.address}
											onChange={(e) => setPortForm({ ...portForm, address: e.target.value })}
											placeholder="Street Address"
										/>
									</div>
									<div className="form-group" style={{ gridColumn: '1 / -1' }}>
										<label>Location * (Click on map to select or drag marker)</label>
										<LocationPicker
											latitude={portForm.latitude}
											longitude={portForm.longitude}
											onLocationChange={handleLocationChange}
											height="400px"
										/>
										<div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
											<div style={{ flex: 1 }}>
												<label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Latitude</label>
												<input
													type="number"
													step="any"
													value={portForm.latitude}
													onChange={(e) => setPortForm({ ...portForm, latitude: e.target.value })}
													placeholder="33.8983"
													style={{ width: '100%' }}
												/>
											</div>
											<div style={{ flex: 1 }}>
												<label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Longitude</label>
												<input
													type="number"
													step="any"
													value={portForm.longitude}
													onChange={(e) => setPortForm({ ...portForm, longitude: e.target.value })}
													placeholder="35.5097"
													style={{ width: '100%' }}
												/>
											</div>
										</div>
									</div>
									<div className="form-group" style={{ gridColumn: '1 / -1' }}>
										<label>Port Image</label>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
											<input
												type="file"
												accept="image/*"
												onChange={handleImageChange}
												style={{ padding: '8px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}
											/>
											{(imagePreview || portForm.imageUrl) && (
												<div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
													<img
														src={imagePreview || portForm.imageUrl}
														alt="Port preview"
														style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1.5px solid var(--border)' }}
													/>
													<button
														type="button"
														onClick={() => {
															setImageFile(null)
															setImagePreview('')
															setPortForm({ ...portForm, imageUrl: '' })
														}}
														style={{
															position: 'absolute',
															top: '8px',
															right: '8px',
															background: 'rgba(0, 0, 0, 0.7)',
															color: 'white',
															border: 'none',
															borderRadius: '50%',
															width: '32px',
															height: '32px',
															cursor: 'pointer',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center'
														}}
													>
														<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
															<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
														</svg>
													</button>
												</div>
											)}
										</div>
									</div>
									<div className="form-group">
										<label>Connector Type</label>
										<select
											value={portForm.connectorType}
											onChange={(e) => setPortForm({ ...portForm, connectorType: e.target.value })}
										>
											<option value="">Select Type</option>
											<option value="Type2">Type 2</option>
											<option value="CCS">CCS</option>
											<option value="CHAdeMO">CHAdeMO</option>
											<option value="Tesla">Tesla</option>
										</select>
									</div>
									<div className="form-group">
										<label>Power (kW)</label>
										<input
											type="number"
											step="any"
											value={portForm.powerKw}
											onChange={(e) => setPortForm({ ...portForm, powerKw: e.target.value })}
											placeholder="22.0"
										/>
									</div>
								</div>
								<div className="admin-schedules">
									<h4>Operating Hours</h4>
									<div className="schedules-grid">
										{portForm.schedules.map((schedule, idx) => (
											<div key={idx} className="schedule-row">
												<div className="schedule-day">{weekdays[schedule.weekday]}</div>
												<input
													type="time"
													value={schedule.open}
													onChange={(e) => {
														const newSchedules = [...portForm.schedules]
														newSchedules[idx] = { ...newSchedules[idx], weekday: idx, open: e.target.value }
														setPortForm({ ...portForm, schedules: newSchedules })
													}}
												/>
												<span>to</span>
												<input
													type="time"
													value={schedule.close}
													onChange={(e) => {
														const newSchedules = [...portForm.schedules]
														newSchedules[idx] = { ...newSchedules[idx], weekday: idx, close: e.target.value }
														setPortForm({ ...portForm, schedules: newSchedules })
													}}
												/>
											</div>
										))}
									</div>
								</div>
								<div className="admin-form-actions">
									<button className="btn btn-outline" onClick={() => {
										setEditingPort(null)
										setIsCreatingPort(false)
										setPortForm({
											name: '',
											city: '',
											address: '',
											latitude: '',
											longitude: '',
											connectorType: '',
											powerKw: '',
											imageUrl: '',
											schedules: Array.from({ length: 7 }, (_, i) => ({ weekday: i, open: '08:00', close: '22:00' }))
										})
										setImageFile(null)
										setImagePreview('')
									}}>
										Cancel
									</button>
									<button className="btn btn-primary" onClick={handleSavePort}>
										{editingPort ? 'Update Port' : 'Create Port'}
									</button>
								</div>
							</div>
						)}

						<div className="admin-table-container">
							<table className="admin-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>Name</th>
										<th>City</th>
										<th>Location</th>
										<th>Type</th>
										<th>Power</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{ports.map(port => (
										<tr key={port.id}>
											<td>{port.id}</td>
											<td>{port.name}</td>
											<td>{port.city}</td>
											<td>{port.latitude?.toFixed(4)}, {port.longitude?.toFixed(4)}</td>
											<td>{port.connectorType || 'N/A'}</td>
											<td>{port.powerKw ? `${port.powerKw} kW` : 'N/A'}</td>
											<td>
												<span className={`status-badge ${port.isActive ? 'active' : 'inactive'}`}>
													{port.isActive ? 'Active' : 'Inactive'}
												</span>
											</td>
											<td>
												<button className="btn-icon" onClick={() => handleEditPort(port)} title="Edit">
													<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
														<path d="M11.5 2.5L13.5 4.5L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
													</svg>
												</button>
												<button className="btn-icon" onClick={() => handleDeletePort(port.id)} title="Delete">
													<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
														<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
													</svg>
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === 'users' && (
					<div className="admin-users">
						<div className="admin-section-header">
							<h2>Users Management</h2>
						</div>
						<div className="admin-table-container">
							<table className="admin-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>Name</th>
										<th>Email</th>
										<th>Role</th>
										<th>Bookings</th>
										<th>Favorites</th>
										<th>Subscriptions</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{users.map(user => (
										<tr key={user.id}>
											<td>{user.id}</td>
											<td>{user.fullName || 'N/A'}</td>
											<td>{user.email}</td>
											<td>
												<span className={`status-badge ${user.isAdmin ? 'admin' : 'user'}`}>
													{user.isAdmin ? 'Admin' : 'User'}
												</span>
											</td>
											<td>{user.bookingsCount || 0}</td>
											<td>{user.favoritesCount || 0}</td>
											<td>{user.subscriptionsCount || 0}</td>
											<td>
												<button 
													className="btn btn-sm"
													onClick={() => handleToggleUserAdmin(user)}
												>
													{user.isAdmin ? 'Remove Admin' : 'Make Admin'}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === 'bookings' && (
					<div className="admin-bookings">
						<div className="admin-section-header">
							<h2>Bookings Monitor</h2>
						</div>
						<div className="admin-table-container">
							<table className="admin-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>User</th>
										<th>Port</th>
										<th>Time Slot</th>
										<th>Amount</th>
										<th>Payment</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									{bookings.map(booking => (
										<tr key={booking.id}>
											<td>{booking.id}</td>
											<td>{booking.user?.fullName || booking.user?.email || 'N/A'}</td>
											<td>{booking.port?.name || 'N/A'}</td>
											<td>
												{formatDate(booking.startTime)} - {formatDate(booking.endTime)}
											</td>
											<td>${booking.amount || 0}</td>
											<td>
												<span className={`status-badge ${booking.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
													{booking.paymentStatus || 'pending'}
												</span>
											</td>
											<td>
												{booking.paymentMethod === 'subscription' && (
													<span className="status-badge subscription">Subscription</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

