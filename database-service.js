// Real-time Database Service
class DatabaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.teamId = null;
        this.listeners = new Map();
    }

    // Initialize Firebase
    async initialize() {
        try {
            // Import Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
            const { getDatabase, ref, push, set, get, onValue, off, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js');
            const { getAuth, signInAnonymously, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');

            // Firebase config (replace with your config)
            const firebaseConfig = {
                apiKey: "demo-key",
                authDomain: "whatsapp-blast-demo.firebaseapp.com",
                databaseURL: "https://whatsapp-blast-demo-default-rtdb.firebaseio.com/",
                projectId: "whatsapp-blast-demo",
                storageBucket: "whatsapp-blast-demo.appspot.com",
                messagingSenderId: "123456789",
                appId: "demo-app-id"
            };

            const app = initializeApp(firebaseConfig);
            this.db = getDatabase(app);
            this.auth = getAuth(app);

            // Store Firebase methods for later use
            this.firebase = {
                ref, push, set, get, onValue, off, serverTimestamp
            };

            // Set up authentication
            await this.setupAuth();
            
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            // Fallback to local storage mode
            return false;
        }
    }

    async setupAuth() {
        return new Promise((resolve) => {
            const { onAuthStateChanged, signInAnonymously } = this.firebase;
            
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        name: localStorage.getItem('userName') || 'Anonymous User',
                        email: localStorage.getItem('userEmail') || 'anonymous@example.com',
                        role: localStorage.getItem('userRole') || 'sales',
                        isOnline: true
                    };
                    
                    // Set team ID (for demo, use 'default-team')
                    this.teamId = localStorage.getItem('teamId') || 'default-team';
                    
                    // Update user presence
                    await this.updateUserPresence(true);
                    
                    resolve();
                } else {
                    // Sign in anonymously
                    await signInAnonymously(this.auth);
                }
            });
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
        if (!this.db) return this.saveLocal('campaigns', campaign);
        
        try {
            const campaignRef = this.firebase.ref(this.db, `teams/${this.teamId}/campaigns`);
            const newCampaignRef = this.firebase.push(campaignRef);
            
            const campaignData = {
                ...campaign,
                id: newCampaignRef.key,
                createdBy: this.currentUser.uid,
                createdByName: this.currentUser.name,
                createdAt: this.firebase.serverTimestamp(),
                updatedAt: this.firebase.serverTimestamp()
            };
            
            await this.firebase.set(newCampaignRef, campaignData);
            
            // Log activity
            await this.logActivity('campaign_created', {
                campaignId: newCampaignRef.key,
                campaignName: campaign.name,
                contactCount: campaign.contacts?.length || 0
            });
            
            return newCampaignRef.key;
        } catch (error) {
            console.error('Error saving campaign:', error);
            return this.saveLocal('campaigns', campaign);
        }
    }

    async updateCampaignStatus(campaignId, status, additionalData = {}) {
        if (!this.db) return;
        
        try {
            const campaignRef = this.firebase.ref(this.db, `teams/${this.teamId}/campaigns/${campaignId}`);
            const updateData = {
                status,
                updatedAt: this.firebase.serverTimestamp(),
                updatedBy: this.currentUser.uid,
                ...additionalData
            };
            
            await this.firebase.set(campaignRef, updateData);
            
            // Log activity
            await this.logActivity('campaign_updated', {
                campaignId,
                status,
                ...additionalData
            });
        } catch (error) {
            console.error('Error updating campaign:', error);
        }
    }

    async getCampaigns(callback) {
        if (!this.db) {
            const local = this.getLocal('campaigns', []);
            callback(local);
            return;
        }
        
        try {
            const campaignsRef = this.firebase.ref(this.db, `teams/${this.teamId}/campaigns`);
            
            const unsubscribe = this.firebase.onValue(campaignsRef, (snapshot) => {
                const campaigns = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        campaigns.push({
                            id: child.key,
                            ...child.val()
                        });
                    });
                }
                callback(campaigns);
            });
            
            this.listeners.set('campaigns', unsubscribe);
        } catch (error) {
            console.error('Error getting campaigns:', error);
            callback([]);
        }
    }

    // Activity Logging
    async logActivity(type, data) {
        if (!this.db) return;
        
        try {
            const activityRef = this.firebase.ref(this.db, `teams/${this.teamId}/activities`);
            const newActivityRef = this.firebase.push(activityRef);
            
            await this.firebase.set(newActivityRef, {
                id: newActivityRef.key,
                type,
                data,
                userId: this.currentUser.uid,
                userName: this.currentUser.name,
                timestamp: this.firebase.serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    async getActivities(callback, limit = 50) {
        if (!this.db) {
            callback([]);
            return;
        }
        
        try {
            const activitiesRef = this.firebase.ref(this.db, `teams/${this.teamId}/activities`);
            
            const unsubscribe = this.firebase.onValue(activitiesRef, (snapshot) => {
                const activities = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        activities.push({
                            id: child.key,
                            ...child.val()
                        });
                    });
                }
                // Sort by timestamp (newest first) and limit
                activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                callback(activities.slice(0, limit));
            });
            
            this.listeners.set('activities', unsubscribe);
        } catch (error) {
            console.error('Error getting activities:', error);
            callback([]);
        }
    }

    // Team Management
    async getTeamMembers(callback) {
        if (!this.db) {
            callback([this.currentUser]);
            return;
        }
        
        try {
            const usersRef = this.firebase.ref(this.db, `teams/${this.teamId}/users`);
            
            const unsubscribe = this.firebase.onValue(usersRef, (snapshot) => {
                const users = [];
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        users.push({
                            uid: child.key,
                            ...child.val()
                        });
                    });
                }
                callback(users);
            });
            
            this.listeners.set('team-members', unsubscribe);
        } catch (error) {
            console.error('Error getting team members:', error);
            callback([]);
        }
    }

    // Statistics
    async getTeamStats(callback) {
        if (!this.db) {
            callback({
                totalCampaigns: 0,
                activeCampaigns: 0,
                totalContacts: 0,
                successRate: 0
            });
            return;
        }
        
        try {
            const campaignsRef = this.firebase.ref(this.db, `teams/${this.teamId}/campaigns`);
            
            const unsubscribe = this.firebase.onValue(campaignsRef, (snapshot) => {
                let totalCampaigns = 0;
                let activeCampaigns = 0;
                let totalContacts = 0;
                let totalSent = 0;
                let totalFailed = 0;
                
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        const campaign = child.val();
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
                }
                
                const successRate = totalSent + totalFailed > 0 ? 
                    Math.round((totalSent / (totalSent + totalFailed)) * 100) : 0;
                
                callback({
                    totalCampaigns,
                    activeCampaigns,
                    totalContacts,
                    successRate,
                    totalSent,
                    totalFailed
                });
            });
            
            this.listeners.set('team-stats', unsubscribe);
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

    // Fallback to localStorage
    saveLocal(key, data) {
        try {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push(data);
            localStorage.setItem(key, JSON.stringify(existing));
            return data.id || Date.now();
        } catch (error) {
            console.error('Error saving to localStorage:', error);
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