/**
 * Frontend Security Utilities
 * Enhanced security functions for the AI TrainEasy MVP frontend
 */

import CryptoJS from 'crypto-js';

// Configuration
const SECURITY_CONFIG = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_FILE_TYPES: [
        'text/csv',
        'application/json',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    ALLOWED_EXTENSIONS: ['csv', 'json', 'txt', 'xlsx', 'xls'],
    MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_RETRIES: 3,
    RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
    RATE_LIMIT_MAX: 100
};

// Rate limiting
const rateLimiter = new Map();

/**
 * Security utilities class
 */
class SecurityUtils {
    /**
     * Sanitize HTML input to prevent XSS attacks
     */
    static sanitizeHtml(input) {
        if (!input || typeof input !== 'string') return '';
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Validate and sanitize user input
     */
    static sanitizeInput(input, maxLength = 1000) {
        if (!input) return '';
        
        let sanitized = String(input).trim();
        
        // Remove potential script tags and dangerous content
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/vbscript:/gi, '');
        sanitized = sanitized.replace(/on\w+=/gi, '');
        
        // Limit length
        return sanitized.substring(0, maxLength);
    }

    /**
     * Validate file upload
     */
    static validateFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('No file selected');
            return { isValid: false, errors };
        }
        
        // Check file size
        if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
            errors.push(`File size exceeds maximum limit of ${SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        
        // Check file type
        if (!SECURITY_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`Invalid file type. Allowed types: ${SECURITY_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`);
        }
        
        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (!SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
            errors.push(`Invalid file extension. Allowed extensions: ${SECURITY_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`);
        }
        
        // Check filename for malicious patterns
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
            errors.push('Invalid filename. Contains unsafe characters.');
        }
        
        // Check for empty file
        if (file.size === 0) {
            errors.push('File is empty');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate secure filename
     */
    static generateSecureFilename(originalName) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const extension = originalName.split('.').pop();
        const baseName = originalName.split('.').slice(0, -1).join('.');
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        return `${timestamp}_${randomSuffix}_${sanitizedBaseName}.${extension}`;
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate URL format
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Rate limiting check
     */
    static checkRateLimit(key) {
        const now = Date.now();
        const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
        
        if (!rateLimiter.has(key)) {
            rateLimiter.set(key, []);
        }
        
        const requests = rateLimiter.get(key);
        
        // Remove old requests
        const validRequests = requests.filter(time => time > windowStart);
        
        // Check if limit exceeded
        if (validRequests.length >= SECURITY_CONFIG.RATE_LIMIT_MAX) {
            return false;
        }
        
        // Add current request
        validRequests.push(now);
        rateLimiter.set(key, validRequests);
        
        return true;
    }

    /**
     * Encrypt sensitive data for local storage
     */
    static encryptData(data, key) {
        try {
            return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    /**
     * Decrypt sensitive data from local storage
     */
    static decryptData(encryptedData, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Generate secure random string
     */
    static generateSecureRandom(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Validate JWT token format
     */
    static isValidJWTFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        return parts.length === 3;
    }

    /**
     * Check if JWT token is expired
     */
    static isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp < now;
        } catch {
            return true;
        }
    }

    /**
     * Generate CSP nonce
     */
    static generateCSPNonce() {
        return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    }

    /**
     * Validate model training parameters
     */
    static validateTrainingParams(params) {
        const errors = [];
        
        // Validate learning rate
        if (params.learningRate && (params.learningRate <= 0 || params.learningRate > 1)) {
            errors.push('Learning rate must be between 0 and 1');
        }
        
        // Validate epochs
        if (params.epochs && (params.epochs < 1 || params.epochs > 1000)) {
            errors.push('Epochs must be between 1 and 1000');
        }
        
        // Validate batch size
        if (params.batchSize && (params.batchSize < 1 || params.batchSize > 1000)) {
            errors.push('Batch size must be between 1 and 1000');
        }
        
        // Validate test split
        if (params.testSplit && (params.testSplit <= 0 || params.testSplit >= 1)) {
            errors.push('Test split must be between 0 and 1');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Secure local storage operations
     */
    static secureStorage = {
        setItem: (key, value, encryptionKey = null) => {
            try {
                const data = encryptionKey ? 
                    SecurityUtils.encryptData(value, encryptionKey) : 
                    JSON.stringify(value);
                
                localStorage.setItem(key, data);
                return true;
            } catch (error) {
                console.error('Secure storage set error:', error);
                return false;
            }
        },

        getItem: (key, encryptionKey = null) => {
            try {
                const data = localStorage.getItem(key);
                if (!data) return null;
                
                return encryptionKey ? 
                    SecurityUtils.decryptData(data, encryptionKey) : 
                    JSON.parse(data);
            } catch (error) {
                console.error('Secure storage get error:', error);
                return null;
            }
        },

        removeItem: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Secure storage remove error:', error);
                return false;
            }
        }
    };

    /**
     * Create secure headers for API requests
     */
    static createSecureHeaders(token = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Client-Version': '2.0.0',
            'X-Request-ID': SecurityUtils.generateSecureRandom(16)
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Validate API response
     */
    static validateApiResponse(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }

        // Check for required fields
        if (!response.hasOwnProperty('status')) {
            return false;
        }

        // Validate status
        if (!['success', 'error'].includes(response.status)) {
            return false;
        }

        return true;
    }

    /**
     * Log security events
     */
    static logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // In production, send to security monitoring service
        if (process.env.NODE_ENV === 'production') {
            // TODO: Send to security monitoring service
            console.warn('Security event:', logEntry);
        } else {
            console.log('Security event:', logEntry);
        }
    }
}

/**
 * Content Security Policy helper
 */
class CSPHelper {
    static generateNonce() {
        return SecurityUtils.generateCSPNonce();
    }

    static getCSPHeader() {
        return {
            'Content-Security-Policy': `
                default-src 'self';
                script-src 'self' 'unsafe-inline' 'unsafe-eval';
                style-src 'self' 'unsafe-inline';
                img-src 'self' data: https:;
                font-src 'self' https:;
                connect-src 'self' https:;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
                frame-ancestors 'none';
                upgrade-insecure-requests;
            `.replace(/\s+/g, ' ').trim()
        };
    }
}

/**
 * Session management
 */
class SessionManager {
    constructor() {
        this.sessionKey = 'ai-traineasy-session';
        this.encryptionKey = SecurityUtils.generateSecureRandom();
        this.setupSessionTimeout();
    }

    setupSessionTimeout() {
        setInterval(() => {
            const session = this.getSession();
            if (session && Date.now() - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
                this.clearSession();
                SecurityUtils.logSecurityEvent('session_timeout');
            }
        }, 60000); // Check every minute
    }

    setSession(data) {
        const session = {
            ...data,
            lastActivity: Date.now(),
            created: Date.now()
        };

        return SecurityUtils.secureStorage.setItem(this.sessionKey, session, this.encryptionKey);
    }

    getSession() {
        return SecurityUtils.secureStorage.getItem(this.sessionKey, this.encryptionKey);
    }

    updateActivity() {
        const session = this.getSession();
        if (session) {
            session.lastActivity = Date.now();
            this.setSession(session);
        }
    }

    clearSession() {
        return SecurityUtils.secureStorage.removeItem(this.sessionKey);
    }

    isSessionValid() {
        const session = this.getSession();
        if (!session) return false;

        const now = Date.now();
        return (now - session.lastActivity) < SECURITY_CONFIG.SESSION_TIMEOUT;
    }
}

// Export utilities
export {
    SecurityUtils,
    CSPHelper,
    SessionManager,
    SECURITY_CONFIG
};

export default SecurityUtils;