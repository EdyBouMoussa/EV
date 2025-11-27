import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('accessToken')
	if (token) config.headers.Authorization = `Bearer ${token}`
	return config
})

// Handle 401 errors globally - redirect to login
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Token is invalid or expired
			localStorage.removeItem('accessToken')
			// Redirect to login page, but not if we're on admin login or regular login/signup pages
			const currentPath = window.location.pathname
			if (currentPath !== '/login' && 
				currentPath !== '/signup' && 
				currentPath !== '/admin/login') {
				window.location.href = '/login'
			}
		}
		return Promise.reject(error)
	}
)

export async function signup({ fullName, email, password }) {
	const { data } = await api.post('/auth/signup', { fullName, email, password })
	localStorage.setItem('accessToken', data.accessToken)
	return data.user
}

export async function login({ email, password }) {
	const { data } = await api.post('/auth/login', { email, password })
	localStorage.setItem('accessToken', data.accessToken)
	return data.user
}

export async function getMe() {
	const token = localStorage.getItem('accessToken')
	if (!token) throw new Error('no token')
	const { data } = await api.get('/auth/me')
	return data.user
}

export async function fetchPorts() {
	const { data } = await api.get('/ports')
	return data.ports
}

export async function getPort(portId) {
	const { data } = await api.get(`/ports/${portId}`)
	return data.port
}

export async function getAvailableSlots(portId) {
	const { data } = await api.get(`/ports/${portId}/available-slots`)
	// Return the data object which contains slots array
	return data
}

export async function createBooking({ portId, startTime, endTime, paymentMethod = 'credit_card' }) {
	const { data } = await api.post('/bookings', { portId, startTime, endTime, paymentMethod })
	return data.booking
}

export async function processPayment(bookingId, paymentMethod = 'credit_card') {
	const { data } = await api.post(`/bookings/${bookingId}/pay`, { paymentMethod })
	return data.booking
}

export async function fetchBookings() {
	const { data } = await api.get('/bookings')
	return data.bookings
}

export async function cancelBooking(id) {
	await api.delete(`/bookings/${id}`)
}

export async function getFavorites() {
	const { data } = await api.get('/favorites')
	return data.ports
}

export async function addFavorite(portId) {
	const { data } = await api.post(`/favorites/${portId}`)
	return data.favorite || data
}

export async function removeFavorite(portId) {
	await api.delete(`/favorites/${portId}`)
}

export async function checkFavorite(portId) {
	const { data } = await api.get(`/favorites/check/${portId}`)
	return data.isFavorite
}

export async function getSubscriptionPlans() {
	const { data } = await api.get('/subscriptions/plans')
	return data.plans
}

export async function getMySubscriptions() {
	const { data } = await api.get('/subscriptions')
	return data.subscriptions
}

export async function subscribeToPlan(planId) {
	const { data } = await api.post('/subscriptions/subscribe', { planId })
	return data.subscription
}

export async function checkBookingLimit() {
	const { data } = await api.get('/subscriptions/check-limit')
	return data
}

// Admin API
export async function getAdminStats() {
	const { data } = await api.get('/admin/stats')
	return data.stats
}

export async function getAdminPorts() {
	const { data } = await api.get('/admin/ports')
	return data.ports
}

export async function createAdminPort(portData) {
	const { data } = await api.post('/admin/ports', portData)
	return data.port
}

export async function updateAdminPort(portId, portData) {
	const { data } = await api.put(`/admin/ports/${portId}`, portData)
	return data.port
}

export async function deleteAdminPort(portId) {
	await api.delete(`/admin/ports/${portId}`)
}

export async function getAdminUsers() {
	const { data } = await api.get('/admin/users')
	return data.users
}

export async function updateAdminUser(userId, userData) {
	const { data } = await api.put(`/admin/users/${userId}`, userData)
	return data.user
}

export async function getAdminBookings() {
	const { data } = await api.get('/admin/bookings')
	return data.bookings
}

export async function adminLogin({ email, password }) {
	const { data } = await api.post('/auth/admin/login', { email, password })
	localStorage.setItem('accessToken', data.accessToken)
	localStorage.setItem('adminToken', data.accessToken) // Store admin token separately
	return data
}
