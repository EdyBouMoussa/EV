import { useEffect, useState } from 'react'
import { fetchBookings, cancelBooking } from '../services/api'

export default function BookingsPage() {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const load = async () => {
		setLoading(true)
		try {
			const bookings = await fetchBookings()
			setItems(bookings)
		} catch (err) {
			setItems([])
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => { load() }, [])

	const onCancel = async (id) => {
		if (!confirm('Are you sure you want to cancel this booking?')) return
		try {
			await cancelBooking(id)
			await load()
		} catch (err) {
			alert('Failed to cancel booking')
		}
	}

	const formatDateTime = (isoString) => {
		const date = new Date(isoString)
		const today = new Date()
		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		let dateStr
		if (date.toDateString() === today.toDateString()) {
			dateStr = 'Today'
		} else if (date.toDateString() === tomorrow.toDateString()) {
			dateStr = 'Tomorrow'
		} else {
			dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
		}

		const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
		return { dateStr, timeStr, fullDate: date }
	}

	const isPast = (isoString) => {
		return new Date(isoString) < new Date()
	}

	if (loading) {
		return (
			<div className="bookings-page">
				<div className="loading-state">
					<svg className="spinner" width="24" height="24" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
							<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
							<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
						</circle>
					</svg>
					<span>Loading bookings...</span>
				</div>
			</div>
		)
	}

	return (
		<div className="bookings-page">
			<div className="bookings-header">
				<h1 className="bookings-title">My Bookings</h1>
				<p className="bookings-subtitle">Manage your EV charging appointments</p>
			</div>

			{items.length === 0 ? (
				<div className="bookings-empty">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" fill="currentColor"/>
					</svg>
					<h3>No bookings yet</h3>
					<p className="muted">Book a time slot from the map to get started</p>
				</div>
			) : (
				<div className="bookings-list">
					{items.map(booking => {
						const start = formatDateTime(booking.startTime)
						const end = formatDateTime(booking.endTime)
						const bookingPast = isPast(booking.endTime)
						const port = booking.port || { name: `Port #${booking.portId}`, city: '', address: '' }

						return (
							<div key={booking.id} className={`booking-card ${bookingPast ? 'booking-card-past' : ''}`}>
								<div className="booking-card-header">
									<div className="booking-port-info">
										<div className="booking-port-name">{port.name}</div>
										<div className="booking-port-location muted">
											{port.city}{port.address ? `, ${port.address}` : ''}
										</div>
									</div>
									{bookingPast && (
										<span className="booking-badge booking-badge-past">Past</span>
									)}
									{!bookingPast && isPast(booking.startTime) && (
										<span className="booking-badge booking-badge-active">Active</span>
									)}
									{!bookingPast && !isPast(booking.startTime) && (
										<span className="booking-badge booking-badge-upcoming">Upcoming</span>
									)}
								</div>
								<div className="booking-card-body">
									<div className="booking-time">
										<div className="booking-time-item">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm4 9H7V4h5v5z" fill="currentColor"/>
											</svg>
											<div>
												<div className="booking-time-label">Start</div>
												<div className="booking-time-value">{start.dateStr} at {start.timeStr}</div>
											</div>
										</div>
										<div className="booking-time-separator">→</div>
										<div className="booking-time-item">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm4 9H7V4h5v5z" fill="currentColor"/>
											</svg>
											<div>
												<div className="booking-time-label">End</div>
												<div className="booking-time-value">{end.dateStr} at {end.timeStr}</div>
											</div>
										</div>
									</div>
									{booking.amount !== undefined && booking.amount > 0 && (
										<div className="booking-payment-info">
											<div className="booking-payment-row">
												<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M8 0L0 4v3c0 4.42 3.58 8 8 8s8-3.58 8-8V4l-6-3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>
												</svg>
												<span className="booking-payment-amount">${booking.amount.toFixed(2)}</span>
												{booking.paymentStatus && (
													<span className={`booking-payment-status booking-payment-status-${booking.paymentStatus || 'pending'}`}>
														{booking.paymentStatus === 'paid' ? 'Paid' : 
														 booking.paymentStatus === 'pending' ? 'Pending Payment' :
														 booking.paymentStatus === 'refunded' ? 'Refunded' : 'Failed'}
													</span>
												)}
											</div>
										</div>
									)}
								</div>
								<div className="booking-card-footer">
									<button 
										className="btn btn-outline btn-cancel" 
										onClick={() => onCancel(booking.id)}
										disabled={bookingPast}
									>
										Cancel Booking
									</button>
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

