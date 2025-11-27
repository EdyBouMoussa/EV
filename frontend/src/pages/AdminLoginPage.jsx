import { useState } from 'react'
import { adminLogin } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'

export default function AdminLoginPage({ onAdminLogin }) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const submit = async (e) => {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			const result = await adminLogin({ email, password })
			onAdminLogin(result.user)
			navigate('/admin')
		} catch (err) {
			// Stay on admin login page, don't redirect
			const errorMessage = err.response?.data?.message || 'Invalid admin credentials. Please check your email and password.'
			setError(errorMessage)
			// Clear password field for security
			setPassword('')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="auth-container">
			<div className="auth-card admin-login-card">
				<div className="auth-header">
					<div className="admin-login-icon">
						<svg width="48" height="48" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M8 1L2 4v3c0 4.42 3.58 8 8 8s8-3.58 8-8V4l-6-3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
						</svg>
					</div>
					<h1 className="auth-title">Admin Login</h1>
					<p className="auth-subtitle">Access the admin panel with your admin account</p>
				</div>
				<form onSubmit={submit} className="auth-form">
					<div className="form-group">
						<label className="form-label">Admin Email</label>
						<input 
							className="form-input" 
							value={email} 
							onChange={e => setEmail(e.target.value)} 
							type="email" 
							placeholder="admin@example.com"
							required 
							disabled={loading}
						/>
					</div>
					<div className="form-group">
						<label className="form-label">Password</label>
						<input 
							className="form-input" 
							value={password} 
							onChange={e => setPassword(e.target.value)} 
							type="password" 
							placeholder="Enter your password"
							required 
							disabled={loading}
						/>
					</div>
					{error && (
						<div className="error-message">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12H7v-2h2v2zm0-3H7V5h2v4z" fill="currentColor"/>
							</svg>
							<span>{error}</span>
						</div>
					)}
					<button 
						className="btn btn-primary btn-auth" 
						type="submit"
						disabled={loading}
					>
						{loading ? (
							<>
								<svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
									<circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="43.98" strokeDashoffset="10.99">
										<animate attributeName="stroke-dasharray" dur="1.5s" values="0 43.98;21.99 21.99;0 43.98;0 43.98" repeatCount="indefinite"/>
										<animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-10.99;-43.98;-43.98" repeatCount="indefinite"/>
									</circle>
								</svg>
								Signing in...
							</>
						) : (
							'Sign In to Admin Panel'
						)}
					</button>
				</form>
				<div className="auth-footer">
					<Link to="/" className="auth-link">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l4-4-4-4M14 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						Back to Main Site
					</Link>
				</div>
			</div>
		</div>
	)
}

