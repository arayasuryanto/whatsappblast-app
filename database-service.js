// Real-time Database Service
class DatabaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.teamId = null;
        this.listeners = new Map();
    }

    // Initialize Firebase (or fallback to local sync)
    async initialize() {
        console.log('🔄 Initializing database service...');
        
        // For now, use a simple sync system instead of Firebase
        // This will work immediately without authentication issues
        this.initializeLocalSync();
        
        // Set up current user
        this.currentUser = {
            uid: this.generateUserId(),
            name: localStorage.getItem('userName') || 'Anonymous User',
            email: localStorage.getItem('userEmail') || 'anonymous@example.com',
            role: localStorage.getItem('userRole') || 'sales',
            isOnline: true
        };
        
        this.teamId = localStorage.getItem('teamId') || 'default-team';
        
        // Update user in sync data
        this.updateCurrentUser();
        
        console.log('✅ Local sync initialized');
        console.log('Current user:', this.currentUser);
        console.log('Team ID:', this.teamId);
        console.log('Initial data:', {
            campaigns: this.syncData.campaigns.length,
            activities: this.syncData.activities.length,
            users: this.syncData.users.length
        });
        
        return true; // Always return true for local sync
    }
    
    initializeLocalSync() {
        // Set up a simple sync mechanism using localStorage + periodic updates
        this.syncData = {
            campaigns: this.getLocal('sync_campaigns', []),
            activities: this.getLocal('sync_activities', []),
            users: this.getLocal('sync_users', []),
            lastSync: this.getLocal('last_sync', 0)
        };
        
        // Track when sync system was initialized to prevent early callback triggers
        const now = Date.now();
        localStorage.setItem('sync_init_time', now.toString());
        
        // Start periodic sync (simulates real-time updates)
        this.startSyncLoop();
    }
    
    updateCurrentUser() {
        // Each browser tab/window is treated as a separate "session"
        if (this.currentUser && this.syncData) {
            // Generate a unique session ID for this tab/window
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Create a unique user entry for this session
            const sessionUser = {
                ...this.currentUser,
                sessionId: this.sessionId,
                uid: this.currentUser.uid + '_' + this.sessionId, // Make UID unique per session
                displayName: this.currentUser.name,
                lastSeen: Date.now(),
                isOnline: true,
                browser: this.getBrowserInfo()
            };
            
            // Add this session as a separate user
            this.syncData.users.push(sessionUser);
            this.saveLocal('sync_users', this.syncData.users);
            this.startHeartbeat();
        }
    }
    
    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';  
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }
    
    startHeartbeat() {
        // Send heartbeat every 10 seconds to maintain online status
        this.heartbeatInterval = setInterval(() => {
            this.updateUserHeartbeat();
        }, 10000);
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanupSession();
        });
    }
    
    updateUserHeartbeat() {
        if (this.currentUser && this.syncData && this.sessionId) {
            // Update this session's heartbeat
            const sessionUid = this.currentUser.uid + '_' + this.sessionId;
            const existingUsers = this.syncData.users;
            const userIndex = existingUsers.findIndex(u => u.uid === sessionUid);
            
            if (userIndex !== -1) {
                existingUsers[userIndex].lastSeen = Date.now();
                existingUsers[userIndex].isOnline = true;
                this.saveLocal('sync_users', existingUsers);
            }
        }
    }
    
    cleanupSession() {
        if (this.currentUser && this.syncData && this.sessionId) {
            // Remove this session from users list
            const sessionUid = this.currentUser.uid + '_' + this.sessionId;
            const existingUsers = this.syncData.users;
            const updatedUsers = existingUsers.filter(u => u.uid !== sessionUid);
            
            this.syncData.users = updatedUsers;
            this.saveLocal('sync_users', updatedUsers);
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
    
    generateUserId() {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            // Generate a more stable user ID based on browser fingerprint
            const userName = localStorage.getItem('userName') || 'Anonymous';
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 6);
            userId = 'user_' + userName.replace(/\s+/g, '').toLowerCase() + '_' + random;
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }
    
    startSyncLoop() {
        // Check for updates every 3 seconds to simulate real-time
        setInterval(() => {
            this.checkForUpdates();
        }, 3000);
    }
    
    checkForUpdates() {
        // Clean up stale user sessions
        const now = Date.now();
        const STALE_THRESHOLD = 35000; // 35 seconds (heartbeat is 10s, so this gives buffer)
        
        if (this.syncData && this.syncData.users) {
            const beforeCount = this.syncData.users.length;
            
            // Remove stale sessions completely
            this.syncData.users = this.syncData.users.filter(user => {
                return user.lastSeen && (now - user.lastSeen) <= STALE_THRESHOLD;
            });
            
            const afterCount = this.syncData.users.length;
            
            // If users were removed, save and log
            if (beforeCount !== afterCount) {
                console.log(`👥 Cleaned up stale sessions: ${beforeCount} → ${afterCount} users`);
                this.saveLocal('sync_users', this.syncData.users);
            }
        }
        
        // Don't trigger callbacks too frequently during initial load (first 10 seconds)
        const initTime = this.getLocal('sync_init_time', now);
        if (now - initTime < 10000) {
            console.log('🔕 Skipping callback trigger during initial load phase');
            return;
        }
        
        const lastCheck = this.getLocal('last_update_check', 0);
        if (now - lastCheck > 8000) { // Increased to 8 seconds to reduce frequency
            // Trigger callbacks to update UI
            this.triggerCallbacks();
            localStorage.setItem('last_update_check', now.toString());
        }
    }
    
    triggerCallbacks() {
        // Only trigger callbacks if we have meaningful data changes
        // This prevents clearing dashboard on initial load
        
        if (this.listeners.has('campaigns')) {
            const callback = this.listeners.get('campaigns');
            if (callback) {
                // Always ensure we have the latest data from localStorage
                this.syncData.campaigns = this.getLocal('sync_campaigns', []);
                console.log('🔄 Triggering campaigns callback with', this.syncData.campaigns.length, 'campaigns');
                callback(this.syncData.campaigns);
            }
        }
        
        if (this.listeners.has('activities')) {
            const callback = this.listeners.get('activities');
            if (callback) {
                this.syncData.activities = this.getLocal('sync_activities', []);
                callback(this.syncData.activities);
            }
        }
        
        if (this.listeners.has('team-members')) {
            const callback = this.listeners.get('team-members');
            if (callback) {
                this.syncData.users = this.getLocal('sync_users', []);
                callback(this.syncData.users);
            }
        }
    }

    async setupAuth() {
        return new Promise((resolve) => {
            try {
                console.log('Starting authentication setup...');
                
                // Import auth functions from stored reference
                const onAuthStateChanged = (auth, callback) => {
                    return import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js')
                        .then(({ onAuthStateChanged }) => onAuthStateChanged(auth, callback));
                };
                
                const signInAnonymously = (auth) => {
                    return import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js')
                        .then(({ signInAnonymously }) => signInAnonymously(auth));
                };
                
                onAuthStateChanged(this.auth, async (user) => {
                    try {
                        console.log('Auth state changed:', !!user);
                        if (user) {
                            console.log('User authenticated:', user.uid);
                            this.currentUser = {
                                uid: user.uid,
                                name: localStorage.getItem('userName') || 'Anonymous User',
                                email: localStorage.getItem('userEmail') || 'anonymous@example.com',
                                role: localStorage.getItem('userRole') || 'sales',
                                isOnline: true
                            };
                            
                            // Set team ID (for demo, use 'default-team')
                            this.teamId = localStorage.getItem('teamId') || 'default-team';
                            console.log('Team ID set to:', this.teamId);
                            
                            // Update user presence
                            await this.updateUserPresence(true);
                            
                            resolve();
                        } else {
                            console.log('No user found, signing in anonymously...');
                            // Sign in anonymously
                            await signInAnonymously(this.auth);
                        }
                    } catch (error) {
                        console.error('Auth state change error:', error);
                        resolve(); // Continue without auth
                    }
                });
            } catch (error) {
                console.error('Setup auth error:', error);
                resolve(); // Continue without auth
            }
        });
    }

    // User Management
    async updateUserPresence(isOnline) {
        if (!this.db || !this.currentUser) return;
        
        const userRef = this.firebase.ref(this.db, `teams/${this.teamId}/users/${this.currentUser.uid}`);
        await this.firebase.set(userRef, {
            ...this.currentUser,
            isOnline,
            lastSeen: this.firebase.serverTimestamp()
        });
    }

    // Campaign Management
    async saveCampaign(campaign) {
        try {
            const campaignId = 'campaign_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const campaignData = {
                ...campaign,
                id: campaignId,
                createdBy: this.currentUser.uid,
                createdByName: this.currentUser.name,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            
            // Add to local sync data
            this.syncData.campaigns.push(campaignData);
            this.saveLocal('sync_campaigns', this.syncData.campaigns);
            
            // Log activity
            await this.logActivity('campaign_created', {
                campaignId: campaignId,
                campaignName: campaign.name,
                contactCount: campaign.contacts?.length || 0
            });
            
            console.log('📋 Campaign saved:', campaignId);
            
            // Trigger callbacks to update UI immediately
            setTimeout(() => this.triggerCallbacks(), 100);
            
            return campaignId;
        } catch (error) {
            console.error('Error saving campaign:', error);
            return null;
        }
    }

    async updateCampaignStatus(campaignId, status, additionalData = {}) {
        try {
            // Find campaign in local sync data
            const campaignIndex = this.syncData.campaigns.findIndex(c => c.id === campaignId);
            if (campaignIndex !== -1) {
                const currentData = this.syncData.campaigns[campaignIndex];
                const updateData = {
                    ...currentData, // Keep existing data
                    status,
                    updatedAt: Date.now(),
                    updatedBy: this.currentUser.uid,
                    ...additionalData
                };
                
                this.syncData.campaigns[campaignIndex] = updateData;
                this.saveLocal('sync_campaigns', this.syncData.campaigns);
                
                console.log('📝 Campaign updated:', campaignId, status);
                
                // Trigger callbacks to update UI
                setTimeout(() => this.triggerCallbacks(), 100);
            } else {
                console.error('Campaign not found for update:', campaignId);
            }
        } catch (error) {
            console.error('Error updating campaign:', error);
        }
    }

    async getCampaigns(callback) {
        try {
            // Return current campaigns and set up listener
            const campaigns = [...this.syncData.campaigns];
            callback(campaigns);
            
            // Store callback for future updates
            this.listeners.set('campaigns', callback);
            
            console.log('📋 Retrieved campaigns:', campaigns.length);
        } catch (error) {
            console.error('Error getting campaigns:', error);
            callback([]);
        }
    }

    // Activity Logging
    async logActivity(type, data) {
        try {
            const activityId = 'activity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const activity = {
                id: activityId,
                type,
                data,
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                timestamp: Date.now()
            };
            
            // Add to activities list
            this.syncData.activities.unshift(activity); // Add at beginning for newest first
            
            // Keep only latest 100 activities
            if (this.syncData.activities.length > 100) {
                this.syncData.activities = this.syncData.activities.slice(0, 100);
            }
            
            this.saveLocal('sync_activities', this.syncData.activities);
            
            console.log('📝 Activity logged:', type, data);
            
            // Trigger callbacks to update activity feed
            setTimeout(() => this.triggerCallbacks(), 100);
            
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    async getActivities(callback, limit = 50) {
        try {
            // Return current activities (already sorted newest first)
            const activities = this.syncData.activities.slice(0, limit);
            callback(activities);
            
            // Store callback for future updates
            this.listeners.set('activities', callback);
            
            console.log('📋 Retrieved activities:', activities.length);
        } catch (error) {
            console.error('Error getting activities:', error);
            callback([]);
        }
    }

    // Team Management
    async getTeamMembers(callback) {
        try {
            // Return current team members
            const users = [...this.syncData.users];
            callback(users);
            
            // Store callback for future updates
            this.listeners.set('team-members', callback);
            
            console.log('👥 Retrieved team members:', users.length);
        } catch (error) {
            console.error('Error getting team members:', error);
            callback([this.currentUser]);
        }
    }

    // Statistics
    async getTeamStats(callback) {
        try {
            let totalCampaigns = 0;
            let activeCampaigns = 0;
            let totalContacts = 0;
            let totalSent = 0;
            let totalFailed = 0;
            
            this.syncData.campaigns.forEach((campaign) => {
                totalCampaigns++;
                
                if (campaign.status === 'ongoing' || campaign.status === 'scheduled') {
                    activeCampaigns++;
                }
                
                if (campaign.contacts) {
                    totalContacts += campaign.contacts.length;
                }
                
                if (campaign.results) {
                    totalSent += campaign.results.sent || 0;
                    totalFailed += campaign.results.failed || 0;
                }
            });
            
            const successRate = totalSent + totalFailed > 0 ? 
                Math.round((totalSent / (totalSent + totalFailed)) * 100) : 0;
            
            const stats = {
                totalCampaigns,
                activeCampaigns,
                totalContacts,
                successRate,
                totalSent,
                totalFailed
            };
            
            callback(stats);
            
            // Store callback for future updates
            this.listeners.set('team-stats', callback);
            
            console.log('📊 Retrieved team stats:', stats);
        } catch (error) {
            console.error('Error getting team stats:', error);
            callback({
                totalCampaigns: 0,
                activeCampaigns: 0,
                totalContacts: 0,
                successRate: 0
            });
        }
    }

    // Save to localStorage
    saveLocal(key, data) {
        try {
            // If data is already an array, save it directly
            if (Array.isArray(data)) {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } else {
                // If it's a single item, add to existing array
                const existing = JSON.parse(localStorage.getItem(key) || '[]');
                existing.push(data);
                localStorage.setItem(key, JSON.stringify(existing));
                return data.id || Date.now();
            }
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getLocal(key, defaultValue = []) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultValue));
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    // Cleanup
    destroy() {
        // Remove all listeners
        for (const [key, unsubscribe] of this.listeners) {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        }
        this.listeners.clear();
        
        // Update user presence to offline
        if (this.currentUser) {
            this.updateUserPresence(false);
        }
    }
}

// Global instance
window.databaseService = new DatabaseService();