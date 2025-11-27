import { useEffect, useState } from 'react'
import { getFavorites, removeFavorite } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function FavoritesPage() {
	const [ports, setPorts] = useState([])
	const [loading, setLoading] = useState(true)
	const [removingId, setRemovingId] = useState(null)
	const navigate = useNavigate()

	const loadFavorites = async () => {
		setLoading(true)
		try {
			const favoritePorts = await getFavorites()
			setPorts(favoritePorts)
		} catch (err) {
			setPorts([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadFavorites()
	}, [])

	const handleRemoveFavorite = async (portId, e) => {
		e.stopPropagation()
		if (!confirm('Remove this port from your favorites?')) return
		
		setRemovingId(portId)
		try {
			await removeFavorite(portId)
			await loadFavorites()
		} catch (err) {
			alert('Failed to remove favorite')
		} finally {
			setRemovingId(null)
		}
	}

	if (loading) {
		return (
			<div className="favorites-page">
				<div className="loading-state">
					<svg className="spinner" width="24" height="24" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
							<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
							<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
						</circle>
					</svg>
					<span>Loading favorites...</span>
				</div>
			</div>
		)
	}

	return (
		<div className="favorites-page">
			<div className="favorites-header">
				<h1 className="favorites-title">My Favorite Ports</h1>
				<p className="favorites-subtitle">Quick access to your saved charging stations</p>
			</div>

			{ports.length === 0 ? (
				<div className="favorites-empty">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity="0.3"/>
					</svg>
					<h3>No favorites yet</h3>
					<p className="muted">Start exploring the map and add ports to your favorites for quick access</p>
					<button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
						Explore Map
					</button>
				</div>
			) : (
				<div className="favorites-grid">
					{ports.map(port => (
						<div key={port.id} className="favorite-card">
							<div className="favorite-card-header">
								<div className="favorite-card-icon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<rect x="2" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
										<path d="M20 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
										<path d="M6 11v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
									</svg>
								</div>
								<div className="favorite-card-title-section">
									<h3 className="favorite-card-title">{port.name}</h3>
									<div className="favorite-card-location">
										<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M8 0C4.69 0 2 2.69 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8.5c-1.38 0-2.5-1.12-2.5-2.5S6.62 3.5 8 3.5 10.5 4.62 10.5 6 9.38 8.5 8 8.5z" fill="currentColor"/>
										</svg>
										<span>{port.city}{port.address ? `, ${port.address}` : ''}</span>
									</div>
								</div>
								<button
									className={`favorite-remove-btn ${removingId === port.id ? 'favorite-remove-btn-loading' : ''}`}
									onClick={(e) => handleRemoveFavorite(port.id, e)}
									disabled={removingId === port.id}
									title="Remove from favorites"
								>
									{removingId === port.id ? (
										<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
											<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
												<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
												<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
											</circle>
										</svg>
									) : (
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
										</svg>
									)}
								</button>
							</div>
							<div className="favorite-card-body">
								<div className="favorite-card-details">
									<div className="favorite-card-detail">
										<span className="favorite-card-detail-label">Connector</span>
										<span className="favorite-card-detail-value">{port.connectorType || 'N/A'}</span>
									</div>
									<div className="favorite-card-detail">
										<span className="favorite-card-detail-label">Power</span>
										<span className="favorite-card-detail-value">{port.powerKw ? `${port.powerKw} kW` : 'N/A'}</span>
									</div>
									<div className="favorite-card-detail">
										<span className="favorite-card-detail-label">Status</span>
										<span className={`port-status-badge ${port.isActive ? 'port-status-active' : 'port-status-inactive'}`}>
											{port.isActive ? 'Active' : 'Inactive'}
										</span>
									</div>
								</div>
							</div>
							<div className="favorite-card-footer">
								<button 
									className="btn btn-outline" 
									onClick={() => navigate(`/?port=${port.id}`)}
								>
									View on Map
								</button>
								<button 
									className="btn btn-primary" 
									onClick={() => navigate(`/?port=${port.id}&book=true`)}
								>
									Book Time Slot
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
