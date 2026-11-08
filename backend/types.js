/**
 * Shared JSDoc type definitions for the backend. Import for editor hints:
 *   /** @typedef {import('../types').Incident} Incident *\/
 */

/**
 * @typedef {'student'|'security'|'admin'} Role
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} userId
 * @property {string} email
 * @property {string} fullName
 * @property {Role} role
 * @property {string} phone
 * @property {Array<{name: string, phone: string}>} emergencyContacts
 * @property {string} createdAt ISO timestamp
 * @property {string|null} pushToken Expo push token
 * @property {number} [lastLatitude] opt-in presence (rounded)
 * @property {number} [lastLongitude]
 * @property {string} [lastLocationAt]
 */

/**
 * @typedef {Object} Incident
 * @property {string} incidentId
 * @property {null} userId always null: reports are anonymous
 * @property {string} type one of INCIDENT_TYPES
 * @property {string} description
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} timestamp ISO
 * @property {'low'|'medium'|'high'} severity server-computed
 * @property {'pending'|'active'|'resolved'} status
 * @property {string} [updatedAt]
 * @property {string} [updatedBy] officer uid
 */

/**
 * @typedef {Object} SOSAlert
 * @property {string} alertId
 * @property {string} userId
 * @property {string} userName
 * @property {string|null} userPhone
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {number|null} accuracy metres
 * @property {'gps'|'last_known'|'none'} locationStatus
 * @property {string} timestamp ISO
 * @property {'active'|'responded'|'closed'} status
 * @property {Array<{name: string, phone: string}>} emergencyContacts
 * @property {string} [lastUpdated]
 * @property {string} [resolvedBy]
 * @property {string} [resolvedAt]
 */

/**
 * @typedef {Object} Notification
 * @property {string} notificationId
 * @property {string} recipientId
 * @property {string|null} incidentId incident or alert id
 * @property {'sos'|'incident'|'system'} type
 * @property {string} message
 * @property {string} timestamp ISO
 * @property {boolean} isRead
 */

module.exports = {};
