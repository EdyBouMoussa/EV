import { useState } from 'react'
import { login } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage({ onLogin }) {
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
			const user = await login({ email, password })
			onLogin(user)
			navigate('/')
		} catch (err) {
			setError('Invalid email or password. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="auth-container">
			<div className="auth-card">
				<div className="auth-header">
					<h1 className="auth-title">Welcome Back</h1>
					<p className="auth-subtitle">Sign in to your account to continue</p>
				</div>
				<form onSubmit={submit} className="auth-form">
					<div className="form-group">
						<label className="form-label">Email Address</label>
						<input 
							className="form-input" 
							value={email} 
							onChange={e => setEmail(e.target.value)} 
							type="email" 
							placeholder="you@example.com"
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
							'Sign In'
						)}
					</button>
				</form>
				<div className="auth-footer">
					<span className="auth-footer-text">Don't have an account?</span>
					<Link className="auth-link" to="/signup">Create one now</Link>
				</div>
			</div>
		</div>
	)
}
