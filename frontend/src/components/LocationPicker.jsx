import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'

// Fix default icon paths for Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

// Custom marker icon for location selection (red marker)
const locationIcon = new L.Icon({
	iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
	iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
})

function LocationMarker({ position, onPositionChange }) {
	const [markerPosition, setMarkerPosition] = useState(position || [33.8938, 35.5018])

	useMapEvents({
		click(e) {
			const newPos = [e.latlng.lat, e.latlng.lng]
			setMarkerPosition(newPos)
			onPositionChange(newPos)
		},
	})

	useEffect(() => {
		if (position) {
			setMarkerPosition(position)
		}
	}, [position])

	return markerPosition ? <Marker position={markerPosition} icon={locationIcon} draggable={true} eventHandlers={{
		dragend: (e) => {
			const newPos = [e.target.getLatLng().lat, e.target.getLatLng().lng]
			setMarkerPosition(newPos)
			onPositionChange(newPos)
		}
	}} /> : null
}

export default function LocationPicker({ latitude, longitude, onLocationChange, height = '400px' }) {
	const [position, setPosition] = useState(
		latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : [33.8938, 35.5018]
	)

	useEffect(() => {
		if (latitude && longitude) {
			const newPos = [parseFloat(latitude), parseFloat(longitude)]
			setPosition(newPos)
		}
	}, [latitude, longitude])

	const handlePositionChange = (newPos) => {
		setPosition(newPos)
		onLocationChange(newPos[0], newPos[1])
	}

	return (
		<div style={{ width: '100%', height, borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
			<MapContainer
				center={position}
				zoom={13}
				style={{ height: '100%', width: '100%' }}
				scrollWheelZoom={true}
			>
				<TileLayer
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					attribution="&copy; OpenStreetMap contributors"
				/>
				<LocationMarker position={position} onPositionChange={handlePositionChange} />
			</MapContainer>
		</div>
	)
}

