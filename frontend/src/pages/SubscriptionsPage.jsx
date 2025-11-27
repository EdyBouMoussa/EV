import { useEffect, useState } from 'react'
import { getSubscriptionPlans, getMySubscriptions, subscribeToPlan } from '../services/api'

export default function SubscriptionsPage() {
	const [plans, setPlans] = useState([])
	const [subscriptions, setSubscriptions] = useState([])
	const [loading, setLoading] = useState(true)
	const [subscribing, setSubscribing] = useState(null)
	const [error, setError] = useState('')

	useEffect(() => {
		loadData()
	}, [])

	const loadData = async () => {
		setLoading(true)
		setError('')
		try {
			const [plansData, subsData] = await Promise.all([
				getSubscriptionPlans(),
				getMySubscriptions()
			])
			setPlans(plansData)
			setSubscriptions(subsData)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to load subscriptions')
		} finally {
			setLoading(false)
		}
	}

	const handleSubscribe = async (planId) => {
		if (!confirm('Are you sure you want to subscribe to this plan? This will replace your current subscription.')) {
			return
		}
		setSubscribing(planId)
		setError('')
		try {
			await subscribeToPlan(planId)
			await loadData()
			alert('Subscription activated successfully!')
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to subscribe')
		} finally {
			setSubscribing(null)
		}
	}

	const formatDate = (isoString) => {
		const date = new Date(isoString)
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
	}

	if (loading) {
		return (
			<div className="page-container">
				<div className="loading">Loading subscriptions...</div>
			</div>
		)
	}

	return (
		<div className="page-container">
			<div className="page-header">
				<h1>Subscriptions</h1>
				<p>Choose a plan to get access to more bookings</p>
			</div>

			{error && (
				<div className="error-message" style={{ marginBottom: 24 }}>
					{error}
				</div>
			)}

			{subscriptions.length > 0 && (
				<div className="subscriptions-section">
					<h2>My Active Subscriptions</h2>
					<div className="subscriptions-grid">
						{subscriptions.map((sub) => (
							<div key={sub.id} className="subscription-card active">
								<div className="subscription-header">
									<h3>{sub.plan.name}</h3>
									<span className="subscription-badge">{sub.plan.planType}</span>
								</div>
								<div className="subscription-details">
									<div className="subscription-detail-row">
										<span>Bookings Used:</span>
										<span className="subscription-usage">
											{sub.bookingsUsed} / {sub.plan.bookingLimit}
										</span>
									</div>
									<div className="subscription-detail-row">
										<span>Remaining:</span>
										<span className={sub.bookingsRemaining > 0 ? 'text-success' : 'text-danger'}>
											{sub.bookingsRemaining} bookings
										</span>
									</div>
									<div className="subscription-detail-row">
										<span>Valid Until:</span>
										<span>{formatDate(sub.endDate)}</span>
									</div>
								</div>
								<div className="subscription-progress">
									<div 
										className="subscription-progress-bar"
										style={{ 
											width: `${(sub.bookingsUsed / sub.plan.bookingLimit) * 100}%` 
										}}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="plans-section">
				<h2>Available Plans</h2>
				<div className="plans-grid">
					{plans.map((plan) => {
						const isSubscribing = subscribing === plan.id
						const isWeekly = plan.planType === 'weekly'
						return (
							<div key={plan.id} className="plan-card">
								<div className="plan-header">
									<h3>{plan.name}</h3>
									<div className="plan-price">
										<span className="plan-amount">${plan.price}</span>
										<span className="plan-period">/{isWeekly ? 'week' : 'month'}</span>
									</div>
								</div>
								<div className="plan-features">
									<div className="plan-feature">
										<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										<span>{plan.bookingLimit} bookings per {isWeekly ? 'week' : 'month'}</span>
									</div>
									<div className="plan-feature">
										<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										<span>{isWeekly ? '7 days' : '30 days'} validity</span>
									</div>
									<div className="plan-feature">
										<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M13.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										<span>Access to all ports</span>
									</div>
								</div>
								<button
									className="btn btn-primary plan-subscribe-btn"
									onClick={() => handleSubscribe(plan.id)}
									disabled={isSubscribing}
								>
									{isSubscribing ? (
										<>
											<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
												<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
													<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
													<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
												</circle>
											</svg>
											Subscribing...
										</>
									) : (
										<>
											Subscribe Now
										</>
									)}
								</button>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

