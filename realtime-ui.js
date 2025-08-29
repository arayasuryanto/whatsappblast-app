// Real-time UI Components
class RealtimeUI {
    constructor(app) {
        this.app = app;
        this.isOnline = false;
        this.teamMembers = [];
        this.activities = [];
        this.stats = {};
    }

    async initialize() {
        // Initialize database service
        this.isOnline = await window.databaseService.initialize();
        
        // Set up UI components
        this.createUserSetupModal();
        this.createTeamDashboard();
        this.createActivityFeed();
        this.createOnlineUsers();
        this.setupEventListeners();
        
        // Start real-time listeners
        if (this.isOnline) {
            this.startRealtimeListeners();
        }
        
        console.log('Real-time UI initialized:', this.isOnline ? 'Online' : 'Offline');
    }

    createUserSetupModal() {
        const modal = document.createElement('div');
        modal.id = 'userSetupModal';
        modal.className = 'modal user-setup-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>👤 Welcome to WhatsApp Blast Team</h3>
                </div>
                <div class="user-setup-form">
                    <div class="form-group">
                        <label for="userName">Your Name</label>
                        <input type="text" id="userName" placeholder="Enter your name" required>
                    </div>
                    <div class="form-group">
                        <label for="userEmail">Email (optional)</label>
                        <input type="email" id="userEmail" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="userRole">Role</label>
                        <select id="userRole">
                            <option value="sales">Sales Representative</option>
                            <option value="admin">Administrator</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="teamId">Team Code</label>
                        <input type="text" id="teamId" placeholder="Enter team code or leave default" value="default-team">
                        <small>Ask your admin for the team code</small>
                    </div>
                    <button type="button" id="setupUserBtn" class="btn-primary">Join Team</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Check if user is already set up
        if (localStorage.getItem('userName')) {
            modal.classList.remove('active');
        }
    }

    createTeamDashboard() {
        const dashboardHTML = `
            <!-- Real-time Status Bar -->
            <div class="realtime-status-bar" id="realtimeStatusBar">
                <div class="status-indicator">
                    <span class="connection-dot" id="connectionDot"></span>
                    <span id="connectionStatus">Connecting...</span>
                </div>
                <div class="online-users" id="onlineUsers"></div>
                <div class="team-stats" id="teamStats"></div>
            </div>
        `;

        // Insert after header
        const header = document.querySelector('.header');
        header.insertAdjacentHTML('afterend', dashboardHTML);
    }

    createActivityFeed() {
        const activityFeed = document.createElement('div');
        activityFeed.id = 'activityFeed';
        activityFeed.className = 'activity-feed';
        activityFeed.innerHTML = `
            <div class="activity-header">
                <h4>🔴 Live Activity Feed</h4>
                <button class="toggle-feed" id="toggleFeed">📋</button>
            </div>
            <div class="activity-list" id="activityList">
                <div class="activity-item">
                    <div class="activity-icon">📊</div>
                    <div class="activity-content">
                        <span class="activity-text">Activity feed ready</span>
                        <span class="activity-time">now</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.querySelector('.container').appendChild(activityFeed);
    }

    createOnlineUsers() {
        // This will be populated by real-time data
    }

    setupEventListeners() {
        // User setup
        document.getElementById('setupUserBtn')?.addEventListener('click', this.setupUser.bind(this));
        
        // Activity feed toggle
        document.getElementById('toggleFeed')?.addEventListener('click', this.toggleActivityFeed.bind(this));
        
        // Window beforeunload - update presence
        window.addEventListener('beforeunload', () => {
            window.databaseService?.updateUserPresence(false);
        });
    }

    async setupUser() {
        const userName = document.getElementById('userName').value.trim();
        const userEmail = document.getElementById('userEmail').value.trim();
        const userRole = document.getElementById('userRole').value;
        const teamId = document.getElementById('teamId').value.trim();

        if (!userName) {
            alert('Please enter your name');
            return;
        }

        // Save user info
        localStorage.setItem('userName', userName);
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('teamId', teamId);

        // Reinitialize with user info
        await window.databaseService.initialize();
        
        // Hide modal
        document.getElementById('userSetupModal').classList.remove('active');
        
        // Start real-time features
        if (this.isOnline) {
            this.startRealtimeListeners();
        }
        
        // Show success message
        this.showNotification('✅ Successfully joined the team!', 'success');
    }

    startRealtimeListeners() {
        // Update connection status
        this.updateConnectionStatus(true);
        
        // Listen to team members
        window.databaseService.getTeamMembers(this.updateTeamMembers.bind(this));
        
        // Listen to activities
        window.databaseService.getActivities(this.updateActivityFeed.bind(this));
        
        // Listen to team stats
        window.databaseService.getTeamStats(this.updateTeamStats.bind(this));
        
        // Listen to campaigns (integrate with existing app)
        window.databaseService.getCampaigns(this.updateCampaigns.bind(this));
    }

    updateConnectionStatus(isOnline) {
        const dot = document.getElementById('connectionDot');
        const status = document.getElementById('connectionStatus');
        
        if (dot && status) {
            if (isOnline) {
                dot.className = 'connection-dot online';
                status.textContent = 'Live - Real-time enabled';
            } else {
                dot.className = 'connection-dot offline';
                status.textContent = 'Offline - Local mode';
            }
        }
    }

    updateTeamMembers(members) {
        this.teamMembers = members;
        const container = document.getElementById('onlineUsers');
        
        if (container) {
            const onlineMembers = members.filter(m => m.isOnline);
            container.innerHTML = `
                <div class="online-count">
                    <span class="online-dot"></span>
                    ${onlineMembers.length} online
                </div>
                <div class="member-list">
                    ${onlineMembers.map(member => `
                        <div class="member-avatar" title="${member.name} (${member.role})">
                            ${member.name.charAt(0).toUpperCase()}
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    updateActivityFeed(activities) {
        this.activities = activities;
        const container = document.getElementById('activityList');
        
        if (container && activities.length > 0) {
            container.innerHTML = activities.slice(0, 20).map(activity => {
                const timeStr = this.formatTime(activity.timestamp);
                const icon = this.getActivityIcon(activity.type);
                const message = this.formatActivityMessage(activity);
                
                return `
                    <div class="activity-item ${activity.type}">
                        <div class="activity-icon">${icon}</div>
                        <div class="activity-content">
                            <span class="activity-text">${message}</span>
                            <span class="activity-time">${timeStr}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    updateTeamStats(stats) {
        this.stats = stats;
        const container = document.getElementById('teamStats');
        
        if (container) {
            container.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Active</span>
                    <span class="stat-value">${stats.activeCampaigns}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total</span>
                    <span class="stat-value">${stats.totalCampaigns}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Success</span>
                    <span class="stat-value">${stats.successRate}%</span>
                </div>
            `;
        }
    }

    updateCampaigns(campaigns) {
        // Integrate with existing app's campaign display
        if (this.app && this.app.updateHomeLists) {
            // Convert Firebase campaigns to app format
            const scheduled = campaigns.filter(c => c.status === 'scheduled');
            const ongoing = campaigns.filter(c => c.status === 'ongoing');
            const completed = campaigns.filter(c => c.status === 'completed');
            
            // Update the main app's campaign lists
            this.updateCampaignLists(scheduled, ongoing, completed);
        }
    }

    updateCampaignLists(scheduled, ongoing, completed) {
        // Update scheduled campaigns
        const scheduledList = document.getElementById('scheduledList');
        if (scheduledList) {
            if (scheduled.length === 0) {
                scheduledList.innerHTML = `
                    <div class="empty-campaigns">
                        <p>No scheduled campaigns</p>
                        <button class="btn-secondary btn-small" onclick="window.app.showCampaignPage()">Schedule Campaign</button>
                    </div>
                `;
            } else {
                scheduledList.innerHTML = scheduled.map(campaign => {
                    const scheduledTime = new Date(campaign.scheduledTime);
                    return `
                        <div class="campaign-item scheduled" data-id="${campaign.id}">
                            <div class="campaign-info">
                                <h4>${campaign.name}</h4>
                                <p>${campaign.contacts?.length || 0} contacts</p>
                                <small>By ${campaign.createdByName} • ${scheduledTime.toLocaleString()}</small>
                            </div>
                            <div class="campaign-status">📅 Scheduled</div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Update ongoing campaigns
        const ongoingList = document.getElementById('ongoingList');
        if (ongoingList) {
            if (ongoing.length === 0) {
                ongoingList.innerHTML = `
                    <div class="empty-campaigns">
                        <p>No ongoing campaigns</p>
                        <button class="btn-secondary btn-small" onclick="window.app.showCampaignPage()">Start Campaign</button>
                    </div>
                `;
            } else {
                ongoingList.innerHTML = ongoing.map(campaign => {
                    const progress = campaign.progress || 0;
                    return `
                        <div class="campaign-item ongoing" data-id="${campaign.id}">
                            <div class="campaign-info">
                                <h4>${campaign.name}</h4>
                                <div class="progress-mini">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <small>By ${campaign.createdByName} • ${progress}% complete</small>
                            </div>
                            <div class="campaign-status">⏳ Running</div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Update completed campaigns
        const completedList = document.getElementById('completedList');
        if (completedList) {
            if (completed.length === 0) {
                completedList.innerHTML = `
                    <div class="empty-campaigns">
                        <p>No completed campaigns yet</p>
                        <button class="btn-secondary btn-small" onclick="window.app.showCampaignPage()">Create First Campaign</button>
                    </div>
                `;
            } else {
                completedList.innerHTML = completed.slice(0, 10).map(campaign => {
                    const results = campaign.results || {};
                    return `
                        <div class="campaign-item completed" data-id="${campaign.id}">
                            <div class="campaign-info">
                                <h4>${campaign.name}</h4>
                                <p>Sent: ${results.sent || 0} • Failed: ${results.failed || 0}</p>
                                <small>By ${campaign.createdByName} • ${new Date(campaign.completedAt).toLocaleString()}</small>
                            </div>
                            <div class="campaign-status">✅ Done</div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    getActivityIcon(type) {
        const icons = {
            campaign_created: '📝',
            campaign_started: '🚀',
            campaign_completed: '✅',
            campaign_stopped: '⏹️',
            user_joined: '👋',
            user_left: '👋',
            message_sent: '📤',
            message_failed: '❌'
        };
        return icons[type] || '📊';
    }

    formatActivityMessage(activity) {
        const { type, data, userName } = activity;
        
        switch (type) {
            case 'campaign_created':
                return `${userName} created campaign "${data.campaignName}" with ${data.contactCount} contacts`;
            case 'campaign_started':
                return `${userName} started campaign "${data.campaignName}"`;
            case 'campaign_completed':
                return `${userName} completed campaign "${data.campaignName}" (${data.sent} sent, ${data.failed} failed)`;
            case 'campaign_stopped':
                return `${userName} stopped campaign "${data.campaignName}"`;
            case 'user_joined':
                return `${userName} joined the team`;
            default:
                return `${userName} performed ${type}`;
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return 'now';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return Math.floor(diff / 86400000) + 'd ago';
    }

    toggleActivityFeed() {
        const feed = document.getElementById('activityFeed');
        feed.classList.toggle('collapsed');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Public methods for integration
    async logActivity(type, data) {
        if (window.databaseService) {
            await window.databaseService.logActivity(type, data);
        }
    }

    async saveCampaign(campaign) {
        if (window.databaseService) {
            return await window.databaseService.saveCampaign(campaign);
        }
        return null;
    }

    async updateCampaignStatus(campaignId, status, additionalData = {}) {
        if (window.databaseService) {
            await window.databaseService.updateCampaignStatus(campaignId, status, additionalData);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize real-time UI after main app
    setTimeout(() => {
        window.realtimeUI = new RealtimeUI(window.app);
        window.realtimeUI.initialize();
    }, 1000);
});