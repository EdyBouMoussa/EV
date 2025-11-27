import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { fetchPorts, getPort, addFavorite, removeFavorite, getFavorites } from '../services/api'
import BookingModal from '../components/BookingModal'

// Fix default icon paths for Leaflet on bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

export default function MapPage({ user }) {
	const [ports, setPorts] = useState([])
	const [bookingPort, setBookingPort] = useState(null)
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
	const [portDetails, setPortDetails] = useState({}) // Cache for port details
	const [loadingPort, setLoadingPort] = useState(null)
	const [favorites, setFavorites] = useState(new Set()) // Set of favorited port IDs
	const [togglingFavorite, setTogglingFavorite] = useState(null)
	const beirutCenter = useMemo(() => [33.8938, 35.5018], [])

	useEffect(() => {
		fetchPorts().then(setPorts).catch(() => setPorts([]))
	}, [])

	useEffect(() => {
		loadAllFavorites()
	}, [user])

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

	const handlePopupOpen = async (port) => {
		// Fetch full port details if not already cached
		if (!portDetails[port.id] && !loadingPort) {
			setLoadingPort(port.id)
			try {
				const details = await getPort(port.id)
				setPortDetails(prev => ({ ...prev, [port.id]: details }))
			} catch (err) {
				console.error('Failed to load port details', err)
			} finally {
				setLoadingPort(null)
			}
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

	const formatTime = (timeStr) => {
		if (!timeStr) return 'N/A'
		const [hours, minutes] = timeStr.split(':')
		const hour = parseInt(hours)
		const ampm = hour >= 12 ? 'PM' : 'AM'
		const displayHour = hour % 12 || 12
		return `${displayHour}:${minutes} ${ampm}`
	}

	const getOperatingHours = (schedules) => {
		if (!schedules || schedules.length === 0) return null
		
		// Check if all days have same hours
		const firstSchedule = schedules[0]
		const allSame = schedules.every(s => 
			s.open === firstSchedule.open && s.close === firstSchedule.close
		)
		
		if (allSame) {
			return `Daily: ${formatTime(firstSchedule.open)} - ${formatTime(firstSchedule.close)}`
		}
		
		// Group by hours
		const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
		const grouped = {}
		schedules.forEach(s => {
			const key = `${s.open}-${s.close}`
			if (!grouped[key]) grouped[key] = []
			grouped[key].push(dayNames[s.weekday])
		})
		
		return Object.entries(grouped).map(([key, days]) => {
			const [open, close] = key.split('-')
			return `${days.join(', ')}: ${formatTime(open)} - ${formatTime(close)}`
		}).join(' | ')
	}

	const handleBookClick = (port) => {
		if (!user) {
			alert('Please login to book a charging slot')
			return
		}
		setBookingPort(port)
		setIsBookingModalOpen(true)
	}

	const handleBookingSuccess = () => {
		alert('Booking confirmed!')
	}

	return (
		<div style={{ height: '100%' }}>
			<MapContainer center={beirutCenter} zoom={8} style={{ height: '100%' }}>
				<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
				{ports.map((p) => {
					const details = portDetails[p.id]
					const isLoading = loadingPort === p.id
					return (
						<Marker key={p.id} position={[p.latitude, p.longitude]}>
							<Popup onOpen={() => handlePopupOpen(p)}>
								<div className="port-popup">
									<div className="port-popup-header">
										<div className="port-popup-icon">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
												<rect x="2" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
												<path d="M20 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
												<path d="M6 11v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
											</svg>
										</div>
										<div className="port-popup-title-section">
											<h3 className="port-popup-title">{p.name}</h3>
											<div className="port-popup-location">
												<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M8 0C4.69 0 2 2.69 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8.5c-1.38 0-2.5-1.12-2.5-2.5S6.62 3.5 8 3.5 10.5 4.62 10.5 6 9.38 8.5 8 8.5z" fill="currentColor"/>
												</svg>
												<span>{p.city}{p.address ? `, ${p.address}` : ''}</span>
											</div>
										</div>
									</div>

									{isLoading ? (
										<div className="port-popup-loading">
											<svg className="spinner" width="20" height="20" viewBox="0 0 16 16" fill="none">
												<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
													<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
													<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
												</circle>
											</svg>
											<span>Loading details...</span>
										</div>
									) : (
										<div className="port-popup-content">
											<div className="port-popup-details">
												<div className="port-popup-detail-item">
													<div className="port-popup-detail-label">
														<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M8 0L9.5 5.5L15 4L10.5 8L15 12L9.5 10.5L8 16L6.5 10.5L1 12L5.5 8L1 4L6.5 5.5L8 0Z" fill="currentColor"/>
														</svg>
														<span>Connector Type</span>
													</div>
													<div className="port-popup-detail-value">{p.connectorType || 'N/A'}</div>
												</div>
												<div className="port-popup-detail-item">
													<div className="port-popup-detail-label">
														<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm.5-9H7v6h1.5V5z" fill="currentColor"/>
														</svg>
														<span>Power Output</span>
													</div>
													<div className="port-popup-detail-value">{p.powerKw ? `${p.powerKw} kW` : 'N/A'}</div>
												</div>
												{details?.schedules && (
													<div className="port-popup-detail-item">
														<div className="port-popup-detail-label">
															<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm4 9H7V4h5v5z" fill="currentColor"/>
															</svg>
															<span>Operating Hours</span>
														</div>
														<div className="port-popup-detail-value port-popup-hours">
															{getOperatingHours(details.schedules) || 'Not specified'}
														</div>
													</div>
												)}
												<div className="port-popup-detail-item">
													<div className="port-popup-detail-label">
														<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
															<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
															<path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
														</svg>
														<span>Status</span>
													</div>
													<div className="port-popup-detail-value">
														<span className={`port-status-badge ${p.isActive ? 'port-status-active' : 'port-status-inactive'}`}>
															{p.isActive ? 'Active' : 'Inactive'}
														</span>
													</div>
												</div>
											</div>
										</div>
									)}

									<div className="port-popup-footer">
										{user ? (
											<div className="port-popup-actions">
												<button 
													className={`btn port-popup-favorite-btn ${favorites.has(p.id) ? 'port-popup-favorite-active' : ''}`}
													onClick={(e) => handleToggleFavorite(p.id, e)}
													disabled={togglingFavorite === p.id}
													title={favorites.has(p.id) ? 'Remove from favorites' : 'Add to favorites'}
												>
													{togglingFavorite === p.id ? (
														<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
															<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
																<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
																<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
															</circle>
														</svg>
													) : (
														<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M8 0l2.12 4.29L14.5 5.5l-3.5 3.41.82 4.79L8 12.5l-3.82 1.2.82-4.79L2 5.5l4.38-1.21L8 0z" fill="currentColor" fillOpacity="0.6"/>
														</svg>
													)}
												</button>
												<button 
													className="btn btn-primary port-popup-book-btn" 
													onClick={() => handleBookClick(p)}
												>
													<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M8 0L9.5 5.5L15 4L10.5 8L15 12L9.5 10.5L8 16L6.5 10.5L1 12L5.5 8L1 4L6.5 5.5L8 0Z" fill="currentColor"/>
													</svg>
													Book Time Slot
												</button>
											</div>
										) : (
											<div className="port-popup-login-prompt">
												<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9H7v6h1.5V5z" fill="currentColor"/>
												</svg>
												<span>Login to book a time slot</span>
											</div>
										)}
									</div>
								</div>
							</Popup>
						</Marker>
					)
				})}
			</MapContainer>
			<BookingModal
				port={bookingPort}
				isOpen={isBookingModalOpen}
				onClose={() => {
					setIsBookingModalOpen(false)
					setBookingPort(null)
				}}
				onSuccess={handleBookingSuccess}
			/>
		</div>
	)
}



