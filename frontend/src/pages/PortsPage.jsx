import { useEffect, useState, useMemo } from 'react'
import { fetchPorts, getPort, addFavorite, removeFavorite, getFavorites } from '../services/api'
import { useNavigate } from 'react-router-dom'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function PortsPage({ user }) {
	const [ports, setPorts] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedCity, setSelectedCity] = useState('')
	const [favorites, setFavorites] = useState(new Set())
	const [togglingFavorite, setTogglingFavorite] = useState(null)
	const navigate = useNavigate()

	useEffect(() => {
		loadPorts()
	}, [])

	useEffect(() => {
		loadAllFavorites()
	}, [user])

	const loadPorts = async () => {
		setLoading(true)
		try {
			const allPorts = await fetchPorts()
			// Fetch full details with schedules for each port
			const portsWithDetails = await Promise.all(
				allPorts.map(async (port) => {
					try {
						const fullPort = await getPort(port.id)
						return fullPort
					} catch {
						return port
					}
				})
			)
			setPorts(portsWithDetails)
		} catch (err) {
			console.error('Failed to load ports:', err)
			setPorts([])
		} finally {
			setLoading(false)
		}
	}

	const loadAllFavorites = async () => {
		if (!user) {
			setFavorites(new Set())
			return
		}
		try {
			const favoritePorts = await getFavorites()
			const favoriteIds = new Set(favoritePorts.map(p => p.id))
			setFavorites(favoriteIds)
		} catch (err) {
			console.error('Failed to load favorites:', err)
			setFavorites(new Set())
		}
	}

	const handleToggleFavorite = async (portId, e) => {
		e.stopPropagation()
		if (!user) {
			alert('Please login to favorite ports')
			return
		}
		
		setTogglingFavorite(portId)
		try {
			if (favorites.has(portId)) {
				await removeFavorite(portId)
				setFavorites(prev => {
					const newSet = new Set(prev)
					newSet.delete(portId)
					return newSet
				})
			} else {
				await addFavorite(portId)
				setFavorites(prev => new Set([...prev, portId]))
			}
			// Reload all favorites to ensure consistency
			await loadAllFavorites()
		} catch (err) {
			console.error('Favorite error:', err)
			const errorMsg = err.response?.data?.message || err.message || 'Failed to update favorite'
			if (err.response?.status === 401 || err.response?.status === 403) {
				alert('Please login to favorite ports')
			} else if (err.response?.status === 404) {
				alert('Port not found')
			} else {
				alert(`Failed to update favorite: ${errorMsg}`)
			}
		} finally {
			setTogglingFavorite(null)
		}
	}

	const getOperatingHours = (schedules) => {
		if (!schedules || schedules.length === 0) return null
		const today = new Date().getDay()
		const adjustedDay = today === 0 ? 6 : today - 1 // Convert Sunday=0 to Monday=0
		const todaySchedule = schedules.find(s => s.weekday === adjustedDay)
		if (todaySchedule) {
			return `${todaySchedule.open} - ${todaySchedule.close}`
		}
		// If no schedule for today, show first available
		if (schedules.length > 0) {
			const first = schedules[0]
			return `${first.open} - ${first.close}`
		}
		return null
	}

	const getFullSchedule = (schedules) => {
		if (!schedules || schedules.length === 0) return []
		return schedules.map(s => ({
			day: WEEKDAYS[s.weekday],
			hours: `${s.open} - ${s.close}`
		}))
	}

	const generateDescription = (port) => {
		const parts = []
		if (port.connectorType) {
			parts.push(`${port.connectorType} connector`)
		}
		if (port.powerKw) {
			parts.push(`${port.powerKw}kW charging power`)
		}
		if (port.city) {
			parts.push(`located in ${port.city}`)
		}
		return parts.length > 0 
			? `EV charging station with ${parts.join(', ')}. ${port.address ? `Located at ${port.address}.` : ''}`
			: `EV charging station${port.address ? ` located at ${port.address}` : ''}.`
	}

	const getPortImage = (port) => {
		// Use actual image URL if available, otherwise use placeholder
		if (port.imageUrl) {
			// If it's a relative URL, make it absolute
			if (port.imageUrl.startsWith('/')) {
				return port.imageUrl
			}
			return port.imageUrl
		}
		// Generate a placeholder image URL based on port data
		const colors = ['4f8cff', '10b981', 'f59e0b', 'ef4444', '8b5cf6']
		const color = colors[port.id % colors.length]
		return `https://via.placeholder.com/400x250/${color}/ffffff?text=${encodeURIComponent(port.name)}`
	}

	const cities = useMemo(() => {
		const citySet = new Set(ports.map(p => p.city).filter(Boolean))
		return Array.from(citySet).sort()
	}, [ports])

	const filteredPorts = useMemo(() => {
		return ports.filter(port => {
			const matchesSearch = !searchQuery || 
				port.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				port.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				port.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				port.connectorType?.toLowerCase().includes(searchQuery.toLowerCase())
			
			const matchesCity = !selectedCity || port.city === selectedCity
			
			return matchesSearch && matchesCity
		})
	}, [ports, searchQuery, selectedCity])

	if (loading) {
		return (
			<div className="ports-page">
				<div className="loading-state">
					<svg className="spinner" width="24" height="24" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
							<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
							<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
						</circle>
					</svg>
					<span>Loading ports...</span>
				</div>
			</div>
		)
	}

	return (
		<div className="ports-page">
			<div className="ports-header">
				<div>
					<h1 className="ports-title">All Charging Ports</h1>
					<p className="ports-subtitle">Browse all available EV charging stations in Lebanon</p>
				</div>
				<div className="ports-stats">
					<span className="ports-stat-value">{ports.length}</span>
					<span className="ports-stat-label">Total Ports</span>
				</div>
			</div>

			<div className="ports-filters">
				<div className="ports-search">
					<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						<path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
					</svg>
					<input
						type="text"
						placeholder="Search ports..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="ports-search-input"
					/>
				</div>
				<select
					value={selectedCity}
					onChange={(e) => setSelectedCity(e.target.value)}
					className="ports-city-filter"
				>
					<option value="">All Cities</option>
					{cities.map(city => (
						<option key={city} value={city}>{city}</option>
					))}
				</select>
			</div>

			{filteredPorts.length === 0 ? (
				<div className="ports-empty">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="2" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
						<path d="M20 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
					</svg>
					<h3>No ports found</h3>
					<p className="muted">Try adjusting your search or filter criteria</p>
				</div>
			) : (
				<div className="ports-grid">
					{filteredPorts.map(port => (
						<div key={port.id} className="port-card">
							<div className="port-card-image-container">
								<img 
									src={getPortImage(port)} 
									alt={port.name}
									className="port-card-image"
									onError={(e) => {
										e.target.style.display = 'none'
									}}
								/>
								<div className="port-card-badge">
									<span className={`port-status-badge ${port.isActive ? 'port-status-active' : 'port-status-inactive'}`}>
										{port.isActive ? 'Active' : 'Inactive'}
									</span>
								</div>
								{user && (
									<button
										className={`port-card-favorite-btn ${favorites.has(port.id) ? 'port-card-favorite-btn-active' : ''} ${togglingFavorite === port.id ? 'port-card-favorite-btn-loading' : ''}`}
										onClick={(e) => handleToggleFavorite(port.id, e)}
										disabled={togglingFavorite === port.id}
										title={favorites.has(port.id) ? 'Remove from favorites' : 'Add to favorites'}
									>
										{togglingFavorite === port.id ? (
											<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
												<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
													<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
													<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
												</circle>
											</svg>
										) : (
											<svg width="20" height="20" viewBox="0 0 24 24" fill={favorites.has(port.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
											</svg>
										)}
									</button>
								)}
							</div>
							
							<div className="port-card-content">
								<div className="port-card-header">
									<h3 className="port-card-title">{port.name}</h3>
									<div className="port-card-location">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M8 0C4.69 0 2 2.69 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8.5c-1.38 0-2.5-1.12-2.5-2.5S6.62 3.5 8 3.5 10.5 4.62 10.5 6 9.38 8.5 8 8.5z" fill="currentColor"/>
										</svg>
										<span>{port.city}{port.address ? `, ${port.address}` : ''}</span>
									</div>
								</div>

								<p className="port-card-description">{generateDescription(port)}</p>

								<div className="port-card-details">
									{port.connectorType && (
										<div className="port-card-detail">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<rect x="2" y="7" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
												<path d="M14 10v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											<span>{port.connectorType}</span>
										</div>
									)}
									{port.powerKw && (
										<div className="port-card-detail">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 2v12M4 6h8M4 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											<span>{port.powerKw} kW</span>
										</div>
									)}
									{port.schedules && port.schedules.length > 0 && (
										<div className="port-card-detail">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
												<path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
											</svg>
											<span>{getOperatingHours(port.schedules) || '24/7'}</span>
										</div>
									)}
								</div>

								{port.schedules && port.schedules.length > 0 && (
									<div className="port-card-schedule">
										<div className="port-card-schedule-header">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm4 9H7V4h5v5z" fill="currentColor"/>
											</svg>
											<span>Operating Hours</span>
										</div>
										<div className="port-card-schedule-list">
											{getFullSchedule(port.schedules).map((schedule, idx) => (
												<div key={idx} className="port-card-schedule-item">
													<span className="port-card-schedule-day">{schedule.day}</span>
													<span className="port-card-schedule-hours">{schedule.hours}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							<div className="port-card-footer">
								<button 
									className="btn btn-outline" 
									onClick={() => navigate(`/?port=${port.id}`)}
								>
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9H7v4h4V7H7z" fill="currentColor"/>
									</svg>
									View on Map
								</button>
								<button 
									className="btn btn-primary" 
									onClick={() => navigate(`/?port=${port.id}&book=true`)}
								>
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z" fill="currentColor"/>
									</svg>
									Book Slot
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

