import { useState, useEffect } from 'react'
import { getAvailableSlots, createBooking, processPayment, checkBookingLimit } from '../services/api'

export default function BookingModal({ port, isOpen, onClose, onSuccess }) {
	const [slots, setSlots] = useState([])
	const [selectedSlot, setSelectedSlot] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [loadingSlots, setLoadingSlots] = useState(false)
	const [step, setStep] = useState('select') // 'select', 'payment', or 'subscription'
	const [booking, setBooking] = useState(null)
	const [paymentMethod, setPaymentMethod] = useState('credit_card')
	const [cardNumber, setCardNumber] = useState('')
	const [cardExpiry, setCardExpiry] = useState('')
	const [cardCVC, setCardCVC] = useState('')
	const [cardholderName, setCardholderName] = useState('')
	const [subscriptionInfo, setSubscriptionInfo] = useState(null)

	useEffect(() => {
		if (isOpen && port) {
			loadSlots()
			loadSubscriptionInfo()
			setStep('select')
			setBooking(null)
		} else {
			setSlots([])
			setSelectedSlot(null)
			setError('')
			setStep('select')
			setBooking(null)
			setSubscriptionInfo(null)
		}
	}, [isOpen, port])

	const loadSubscriptionInfo = async () => {
		try {
			const info = await checkBookingLimit()
			setSubscriptionInfo(info)
		} catch (err) {
			// If no subscription, that's okay
			setSubscriptionInfo(null)
		}
	}

	const loadSlots = async () => {
		if (!port) return
		setLoadingSlots(true)
		setError('')
		try {
			const result = await getAvailableSlots(port.id)
			// Handle both array response and object with slots property
			if (Array.isArray(result)) {
				setSlots(result)
			} else if (result && result.slots) {
				setSlots(result.slots)
			} else if (result && result.availableSlots) {
				setSlots(result.availableSlots)
			} else {
				setSlots([])
			}
		} catch (err) {
			console.error('Error loading slots:', err)
			const errorMsg = err.response?.data?.message || err.message || 'Failed to load available slots'
			setError(errorMsg)
		} finally {
			setLoadingSlots(false)
		}
	}

	const calculateAmount = () => {
		if (!selectedSlot) return 0
		const start = new Date(selectedSlot.startTime)
		const end = new Date(selectedSlot.endTime)
		const hours = (end - start) / (1000 * 60 * 60)
		return (hours * 5.0).toFixed(2) // $5 per hour
	}

	const handleBooking = async () => {
		if (!selectedSlot) return
		
		// Check if user is authenticated
		const token = localStorage.getItem('accessToken')
		if (!token) {
			setError('Please log in to create a booking')
			return
		}
		
		setLoading(true)
		setError('')
		try {
			const newBooking = await createBooking({
				portId: port.id,
				startTime: selectedSlot.startTime,
				endTime: selectedSlot.endTime,
				paymentMethod: paymentMethod
			})
			setBooking(newBooking)
			// Reload subscription info to get updated counts
			await loadSubscriptionInfo()
			
			// If booking is already paid (covered by subscription), show subscription info
			if (newBooking.paymentStatus === 'paid' && subscriptionInfo?.hasSubscription) {
				setStep('subscription')
			} else {
				setStep('payment')
			}
		} catch (err) {
			console.error('Booking creation error:', err)
			if (err.response?.status === 401) {
				setError('Your session has expired. Please log in again.')
			} else {
				const errorMsg = err.response?.data?.message || err.message || 'Failed to create booking'
				setError(errorMsg)
			}
		} finally {
			setLoading(false)
		}
	}

	const handlePayment = async () => {
		if (!booking) return
		
		// Validate payment form
		if (!cardNumber || !cardExpiry || !cardCVC || !cardholderName) {
			setError('Please fill in all payment details')
			return
		}

		// Basic card number validation (should be 16 digits)
		if (cardNumber.replace(/\s/g, '').length < 16) {
			setError('Please enter a valid card number')
			return
		}

		setLoading(true)
		setError('')
		try {
			await processPayment(booking.id, paymentMethod)
			onSuccess?.()
			onClose()
		} catch (err) {
			setError(err.response?.data?.message || 'Payment failed. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const formatCardNumber = (value) => {
		const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
		const matches = v.match(/\d{4,16}/g)
		const match = matches && matches[0] || ''
		const parts = []
		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4))
		}
		if (parts.length) {
			return parts.join(' ').substring(0, 19)
		} else {
			return v
		}
	}

	const formatExpiry = (value) => {
		const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
		if (v.length >= 2) {
			return v.substring(0, 2) + '/' + v.substring(2, 4)
		}
		return v
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
			dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
		}

		const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
		return { dateStr, timeStr, date }
	}

	// Generate time slots (8 AM to 10 PM)
	const generateTimeSlots = () => {
		const slots = []
		for (let hour = 8; hour < 22; hour++) {
			const timeStr = new Date(2000, 0, 1, hour, 0).toLocaleTimeString('en-US', { 
				hour: 'numeric', 
				minute: '2-digit', 
				hour12: true 
			})
			slots.push({ hour, timeStr })
		}
		return slots
	}

	const timeSlots = generateTimeSlots()

	// Group slots by date and create a map for quick lookup
	const slotsByDateAndHour = {}
	slots.forEach(slot => {
		const date = new Date(slot.startTime)
		const dateKey = date.toDateString()
		const hour = date.getHours()
		
		if (!slotsByDateAndHour[dateKey]) {
			slotsByDateAndHour[dateKey] = {}
		}
		slotsByDateAndHour[dateKey][hour] = slot
	})

	// Get unique dates and sort them
	const dates = Object.keys(slotsByDateAndHour).sort((a, b) => {
		return new Date(a) - new Date(b)
	})

	// Get available slots only for selection
	const availableSlots = slots.filter(s => s.available && !s.past)

	if (!isOpen) return null

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={e => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">Book Charging Time</h2>
					<button className="modal-close" onClick={onClose}>
						<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
						</svg>
					</button>
				</div>
				<div className="modal-body">
					<div className="booking-port-info">
						<div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{port.name}</div>
						<div className="muted" style={{ fontSize: 14 }}>
							{port.city}{port.address ? `, ${port.address}` : ''}
						</div>
					</div>

					{step === 'subscription' && booking && subscriptionInfo && (
						<div className="subscription-confirmation-section">
							<div className="subscription-success-icon">
								<svg width="64" height="64" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
									<path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
							</div>
							<h3 className="subscription-success-title">Booking Confirmed!</h3>
							<p className="subscription-success-message">
								Your booking is covered by your active subscription.
							</p>
							<div className="subscription-info-card">
								<div className="subscription-info-row">
									<span>Time Slot:</span>
									<span>
										{formatDateTime(selectedSlot.startTime).timeStr} - {formatDateTime(selectedSlot.endTime).timeStr}
									</span>
								</div>
								<div className="subscription-info-row">
									<span>Bookings Remaining:</span>
									<span className="subscription-remaining">
										{subscriptionInfo.bookingsRemaining} / {subscriptionInfo.bookingLimit}
									</span>
								</div>
								<div className="subscription-progress-bar-container">
									<div 
										className="subscription-progress-bar"
										style={{ 
											width: `${((subscriptionInfo.bookingLimit - subscriptionInfo.bookingsRemaining) / subscriptionInfo.bookingLimit) * 100}%` 
										}}
									/>
								</div>
							</div>
						</div>
					)}

					{step === 'payment' && booking && (
						<div className="payment-section">
							<div className="payment-summary">
								<h3 className="payment-title">Payment Summary</h3>
								<div className="payment-details">
									<div className="payment-detail-row">
										<span>Time Slot:</span>
										<span>
											{formatDateTime(selectedSlot.startTime).timeStr} - {formatDateTime(selectedSlot.endTime).timeStr}
										</span>
									</div>
									<div className="payment-detail-row">
										<span>Duration:</span>
										<span>1 hour</span>
									</div>
									<div className="payment-detail-row payment-total">
										<span>Total Amount:</span>
										<span className="payment-amount">${calculateAmount()}</span>
									</div>
								</div>
							</div>

							<div className="payment-form">
								<h3 className="payment-title">Payment Information</h3>
								<div className="form-group">
									<label className="form-label">Payment Method</label>
									<select
										className="form-input"
										value={paymentMethod}
										onChange={(e) => setPaymentMethod(e.target.value)}
									>
										<option value="credit_card">Credit Card</option>
										<option value="debit_card">Debit Card</option>
									</select>
								</div>
								<div className="form-group">
									<label className="form-label">Cardholder Name</label>
									<input
										type="text"
										className="form-input"
										placeholder="John Doe"
										value={cardholderName}
										onChange={(e) => setCardholderName(e.target.value)}
									/>
								</div>
								<div className="form-group">
									<label className="form-label">Card Number</label>
									<input
										type="text"
										className="form-input"
										placeholder="1234 5678 9012 3456"
										value={cardNumber}
										onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
										maxLength={19}
									/>
								</div>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
									<div className="form-group">
										<label className="form-label">Expiry Date</label>
										<input
											type="text"
											className="form-input"
											placeholder="MM/YY"
											value={cardExpiry}
											onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
											maxLength={5}
										/>
									</div>
									<div className="form-group">
										<label className="form-label">CVC</label>
										<input
											type="text"
											className="form-input"
											placeholder="123"
											value={cardCVC}
											onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').substring(0, 3))}
											maxLength={3}
										/>
									</div>
								</div>
								<div className="payment-security">
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M8 1L2 4v3c0 4.42 3.58 8 8 8s8-3.58 8-8V4l-6-3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor" opacity="0.6"/>
									</svg>
									<span>Your payment information is secure and encrypted</span>
								</div>
							</div>
						</div>
					)}

					{step === 'select' && (
						<>
						{loadingSlots ? (
						<div className="loading-state">
							<svg className="spinner" width="24" height="24" viewBox="0 0 16 16" fill="none">
								<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
									<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
									<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
								</circle>
							</svg>
							<span>Loading available slots...</span>
						</div>
					) : dates.length === 0 ? (
						<div className="empty-state">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" fill="currentColor"/>
							</svg>
							<p>No time slots available</p>
							<p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
								No operating hours configured for this port.
							</p>
						</div>
					) : (
						<div className="slots-container">
							<div className="slots-label">Select a 1-hour time slot:</div>
							<div className="slots-table-wrapper">
								<table className="slots-table">
									<thead>
										<tr>
											<th className="slots-table-time-header">Time</th>
											{dates.map(date => {
												const dateObj = new Date(date)
												const { dateStr } = formatDateTime(dateObj.toISOString())
												return (
													<th key={date} className="slots-table-day-header">
														<div className="slots-table-day-name">{dateStr}</div>
														<div className="slots-table-day-date">
															{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
														</div>
													</th>
												)
											})}
										</tr>
									</thead>
									<tbody>
										{timeSlots.map(({ hour, timeStr }) => (
											<tr key={hour}>
												<td className="slots-table-time-cell">{timeStr}</td>
												{dates.map(date => {
													const slot = slotsByDateAndHour[date]?.[hour]
													if (!slot) {
														return <td key={date} className="slots-table-cell slots-table-cell-empty"></td>
													}
													
													const isSelected = selectedSlot?.startTime === slot.startTime
													const isAvailable = slot.available && !slot.past
													const isPast = slot.past
													const isBooked = !slot.available && !slot.past
													
													return (
														<td key={date} className="slots-table-cell">
															<button
																className={`slots-table-slot ${
																	isSelected ? 'slots-table-slot-selected' :
																	isBooked ? 'slots-table-slot-booked' :
																	isPast ? 'slots-table-slot-past' :
																	'slots-table-slot-available'
																}`}
																onClick={() => isAvailable && setSelectedSlot(slot)}
																disabled={!isAvailable}
																title={
																	isBooked ? 'Booked' :
																	isPast ? 'Past' :
																	isAvailable ? 'Available - Click to select' :
																	'Not available'
																}
															>
																{isSelected && (
																	<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
																		<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
																	</svg>
																)}
																{isBooked && (
																	<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
																		<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
																	</svg>
																)}
															</button>
														</td>
													)
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{selectedSlot && (
								<div className="slots-selected-info">
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
										<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
									</svg>
									<span>
										Selected: {formatDateTime(selectedSlot.startTime).timeStr} - {formatDateTime(selectedSlot.endTime).timeStr} on {formatDateTime(selectedSlot.startTime).dateStr}
									</span>
								</div>
							)}
							<div className="slots-legend">
								<div className="slots-legend-item">
									<div className="slots-legend-color slots-legend-available"></div>
									<span>Available</span>
								</div>
								<div className="slots-legend-item">
									<div className="slots-legend-color slots-legend-booked"></div>
									<span>Booked</span>
								</div>
								<div className="slots-legend-item">
									<div className="slots-legend-color slots-legend-past"></div>
									<span>Past</span>
								</div>
								<div className="slots-legend-item">
									<div className="slots-legend-color slots-legend-selected"></div>
									<span>Selected</span>
								</div>
							</div>
						</div>
					)}
						</>
					)}

					{error && (
						<div className="error-message" style={{ marginTop: 16 }}>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12H7v-2h2v2zm0-3H7V5h2v4z" fill="currentColor"/>
							</svg>
							<span>{error}</span>
						</div>
					)}
				</div>
				<div className="modal-footer">
					{step === 'select' ? (
						<>
							<button className="btn btn-outline" onClick={onClose} disabled={loading}>
								Cancel
							</button>
							<button
								className="btn btn-primary"
								onClick={handleBooking}
								disabled={!selectedSlot || loading || availableSlots.length === 0}
							>
								{loading ? (
									<>
										<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
											<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
												<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
												<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
											</circle>
										</svg>
										Processing...
									</>
								) : (
									<>
										{subscriptionInfo?.hasSubscription && subscriptionInfo?.canBook ? (
											<>
												<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
												</svg>
												Confirm Booking ({subscriptionInfo.bookingsRemaining} left)
											</>
										) : (
											<>
												<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M8 0L0 4v3c0 4.42 3.58 8 8 8s8-3.58 8-8V4l-6-3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>
												</svg>
												Continue to Payment (${calculateAmount()})
											</>
										)}
									</>
								)}
							</button>
						</>
					) : step === 'subscription' ? (
						<>
							<button className="btn btn-primary" onClick={() => { onSuccess?.(); onClose(); }}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								Done
							</button>
						</>
					) : (
						<>
							<button className="btn btn-outline" onClick={() => setStep('select')} disabled={loading}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								Back
							</button>
							<button
								className="btn btn-primary"
								onClick={handlePayment}
								disabled={loading || !cardNumber || !cardExpiry || !cardCVC || !cardholderName}
							>
								{loading ? (
									<>
										<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
											<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
												<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
												<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
											</circle>
										</svg>
										Processing Payment...
									</>
								) : (
									<>
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										Pay ${calculateAmount()}
									</>
								)}
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

