class WhatsAppBlastDemoApp {
    constructor() {
        this.contacts = [];
        this.currentStep = 1;
        this.messageContent = '';
        this.messageImage = null;
        this.isConnected = false; // Always false in demo
        this.sendingResults = [];
        this.broadcastHistory = [];
        this.scheduledCampaigns = [];
        
        this.init();
    }

    init() {
        console.log('WhatsApp Blast Demo App initializing...');
        try {
            this.loadBroadcastHistory();
            this.loadScheduledCampaigns();
            this.setupEventListeners();
            this.updateStepIndicator();
            // Start with home page visible
            this.showHomePage();
            // Demo mode - always disconnected
            this.updateConnectionStatus(false);
            
            console.log('Demo app initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    setupEventListeners() {
        // Contact import options
        document.getElementById('importExcel').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.add('active');
        });

        document.getElementById('createManually').addEventListener('click', () => {
            document.getElementById('manualModal').classList.add('active');
        });

        // Modal close buttons
        document.getElementById('closeUpload').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.remove('active');
        });

        document.getElementById('closeManual').addEventListener('click', () => {
            document.getElementById('manualModal').classList.remove('active');
        });

        // Home button and navigation
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.showHomePage();
        });

        document.getElementById('newCampaignBtn').addEventListener('click', () => {
            this.showCampaignPage();
        });

        // Quick start button on home dashboard
        document.getElementById('startNewCampaignBtn').addEventListener('click', () => {
            this.showCampaignPage();
        });

        document.getElementById('closeCampaignDetails').addEventListener('click', () => {
            document.getElementById('campaignDetailsModal').classList.remove('active');
        });

        // Home page connection status click handler
        const homeConnectionStatus = document.getElementById('homeConnectionStatus');
        if (homeConnectionStatus) {
            homeConnectionStatus.addEventListener('click', () => {
                alert('Demo Mode: Download the full version to connect to WhatsApp');
            });
        }

        // File upload
        document.getElementById('chooseFile').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));

        // Manual form
        document.getElementById('manualForm').addEventListener('submit', this.addManualContact.bind(this));

        // Navigation
        document.getElementById('nextToMessage').addEventListener('click', () => this.goToStep(2));
        document.getElementById('backToContacts').addEventListener('click', () => this.goToStep(1));
        document.getElementById('nextToSend').addEventListener('click', () => this.goToStep(3));
        document.getElementById('backToMessage').addEventListener('click', () => this.goToStep(2));

        // Message editor
        document.getElementById('messageText').addEventListener('input', this.updateMessagePreview.bind(this));
        document.getElementById('messageImage').addEventListener('change', this.handleImageUpload.bind(this));
        
        // Formatting toolbar
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFormatting(e.target.dataset.format));
        });

        // Send options
        document.querySelectorAll('input[name="timing"]').forEach(radio => {
            radio.addEventListener('change', this.toggleSchedulePicker.bind(this));
        });

        // Start sending (demo)
        document.getElementById('startSending').addEventListener('click', this.startDemoSending.bind(this));

        // Summary actions
        document.getElementById('backToStart').addEventListener('click', () => this.goToStep(1));
        document.getElementById('downloadReport').addEventListener('click', this.downloadDemoReport.bind(this));
        document.getElementById('newCampaign').addEventListener('click', this.newCampaign.bind(this));

        // Add more contacts
        document.getElementById('addMoreContacts').addEventListener('click', () => {
            document.getElementById('manualModal').classList.add('active');
        });
    }

    updateConnectionStatus(connected, phone = null) {
        const statusElement = document.getElementById('connectionStatus');
        const homeStatusElement = document.getElementById('homeConnectionStatus');
        
        this.isConnected = connected;
        
        // Update main header status
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            const text = statusElement.querySelector('.status-text');
            
            dot.className = 'status-dot disconnected';
            text.textContent = 'Demo Mode - WhatsApp not connected';
        }
        
        // Update home page status
        if (homeStatusElement) {
            const dot = homeStatusElement.querySelector('.status-dot');
            const text = homeStatusElement.querySelector('.status-text');
            
            dot.className = 'status-dot disconnected';
            text.textContent = 'Demo Mode - Download for full functionality';
        }
    }

    // File handling functions
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }

    handleFileDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
            alert('Please upload a valid Excel or CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data;
                if (file.name.endsWith('.csv')) {
                    // Parse CSV
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    data = lines.slice(1).map(line => {
                        const values = line.split(',');
                        const obj = {};
                        headers.forEach((header, index) => {
                            obj[header] = values[index]?.trim();
                        });
                        return obj;
                    }).filter(row => row[headers[0]]); // Filter empty rows
                } else {
                    // Parse Excel
                    const workbook = XLSX.read(e.target.result, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(worksheet);
                }

                this.previewContacts(data, file.name);
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    previewContacts(rawData, fileName) {
        // Map different column names to standard format
        const mappedData = rawData.map(row => {
            const name = row.nama || row.name || row.Name || row.NAMA || 'Unknown';
            const phone = row.telepon || row.nomor || row.phone || row.Phone || row.TELEPON || row.NOMOR || '';
            return { name, phone: phone.toString() };
        }).filter(contact => contact.phone && contact.phone.length > 5);

        // Remove duplicates if checkbox is checked
        const removeDuplicates = document.getElementById('removeDuplicates').checked;
        let finalData = mappedData;
        if (removeDuplicates) {
            const seen = new Set();
            finalData = mappedData.filter(contact => {
                const key = contact.phone.replace(/\D/g, '');
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        // Validate phone numbers if checkbox is checked
        const validateNumbers = document.getElementById('validateNumbers').checked;
        if (validateNumbers) {
            finalData = finalData.filter(contact => {
                const cleaned = contact.phone.replace(/\D/g, '');
                return cleaned.length >= 10 && cleaned.length <= 15;
            });
        }

        // Update preview
        document.getElementById('fileName').textContent = fileName;
        document.getElementById('contactCount').textContent = `${finalData.length} contacts`;
        
        const tableBody = document.getElementById('previewTable').querySelector('tbody');
        tableBody.innerHTML = '';
        
        finalData.slice(0, 10).forEach(contact => {
            const row = tableBody.insertRow();
            row.insertCell(0).textContent = contact.name;
            row.insertCell(1).textContent = contact.phone;
        });

        if (finalData.length > 10) {
            const row = tableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 2;
            cell.textContent = `... and ${finalData.length - 10} more contacts`;
            cell.style.textAlign = 'center';
            cell.style.fontStyle = 'italic';
        }

        document.getElementById('filePreview').style.display = 'block';
        this.previewedContacts = finalData;
    }

    importContacts() {
        if (this.previewedContacts) {
            this.contacts = [...this.previewedContacts];
            this.updateContactList();
            document.getElementById('uploadModal').classList.remove('active');
            alert(`Imported ${this.contacts.length} contacts successfully!`);
        }
    }

    addManualContact(e) {
        e.preventDefault();
        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        
        if (name && phone) {
            this.contacts.push({ name, phone });
            this.updateContactList();
            document.getElementById('manualForm').reset();
            document.getElementById('manualModal').classList.remove('active');
        }
    }

    updateContactList() {
        const contactList = document.getElementById('contactList');
        const tableBody = document.getElementById('contactTable').querySelector('tbody');
        const totalContacts = document.getElementById('totalContacts');
        
        if (this.contacts.length > 0) {
            contactList.style.display = 'block';
            totalContacts.textContent = this.contacts.length;
            
            tableBody.innerHTML = '';
            this.contacts.forEach((contact, index) => {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = contact.name;
                row.insertCell(1).textContent = contact.phone;
                const actionsCell = row.insertCell(2);
                actionsCell.innerHTML = `<button class="btn-danger" onclick="app.removeContact(${index})">Remove</button>`;
            });
            
            document.getElementById('nextToMessage').disabled = false;
        } else {
            contactList.style.display = 'none';
            document.getElementById('nextToMessage').disabled = true;
        }
    }

    removeContact(index) {
        this.contacts.splice(index, 1);
        this.updateContactList();
    }

    // Message formatting functions (same as original)
    formatWhatsAppText(text, forPreview = true) {
        let formatted = text.replace(/\{\{nama\}\}/g, 'John Doe');
        
        if (forPreview) {
            formatted = formatted
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*\s][^*]*[^*\s])\*/g, '<strong>$1</strong>')
                .replace(/_(.*?)_/g, '<em>$1</em>')
                .replace(/~~(.*?)~~/g, '<del>$1</del>')
                .replace(/```(.*?)```/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }
        
        return formatted;
    }

    formatWhatsAppTextForSending(text) {
        return text.replace(/\{\{nama\}\}/g, 'John Doe');
    }

    applyFormatting(format) {
        const textarea = document.getElementById('messageText');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let beforeText = '';
        let afterText = '';
        
        switch (format) {
            case 'bold':
                beforeText = '**';
                afterText = '**';
                break;
            case 'italic':
                beforeText = '_';
                afterText = '_';
                break;
            case 'strikethrough':
                beforeText = '~~';
                afterText = '~~';
                break;
            case 'monospace':
                beforeText = '```';
                afterText = '```';
                break;
            case 'quote':
                beforeText = '> ';
                afterText = '';
                break;
        }
        
        if (selectedText) {
            const newText = textarea.value.substring(0, start) + 
                           beforeText + selectedText + afterText + 
                           textarea.value.substring(end);
            textarea.value = newText;
            textarea.setSelectionRange(start + beforeText.length, end + beforeText.length);
        } else {
            const newText = textarea.value.substring(0, start) + 
                           beforeText + afterText + 
                           textarea.value.substring(start);
            textarea.value = newText;
            textarea.setSelectionRange(start + beforeText.length, start + beforeText.length);
        }
        
        this.updateMessagePreview();
        textarea.focus();
    }

    updateMessagePreview() {
        const messageText = document.getElementById('messageText').value;
        const previewText = document.getElementById('previewText');
        
        this.messageContent = messageText;
        
        if (messageText.trim()) {
            const formattedMessage = this.formatWhatsAppText(messageText);
            previewText.innerHTML = formattedMessage;
        } else {
            previewText.innerHTML = 'Your message will appear here...<br><br><small>Formatting tips:<br>**bold** or *bold*<br>_italic_<br>~~strikethrough~~<br>```monospace```</small>';
        }
        
        document.getElementById('nextToSend').disabled = messageText.trim() === '';
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image must be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImage = document.getElementById('previewImage');
                previewImage.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                previewImage.style.display = 'block';
                this.messageImage = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Navigation functions
    goToStep(step) {
        this.currentStep = step;
        this.updateStepIndicator();
        
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const stepElements = {
            1: 'contactsStep',
            2: 'messageStep',
            3: 'sendStep',
            4: 'progressStep',
            5: 'summaryStep'
        };
        
        document.getElementById(stepElements[step]).classList.add('active');
        
        if (step === 3) {
            this.updateSendSummary();
        }
    }

    updateStepIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    updateSendSummary() {
        document.getElementById('summaryRecipients').textContent = this.contacts.length;
        document.getElementById('summaryMessage').textContent = this.messageContent.substring(0, 100) + (this.messageContent.length > 100 ? '...' : '');
    }

    toggleSchedulePicker() {
        const sendLater = document.getElementById('sendLater').checked;
        const schedulePicker = document.getElementById('schedulePicker');
        schedulePicker.style.display = sendLater ? 'block' : 'none';
        
        if (sendLater) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('scheduleDate').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('scheduleTime').value = '09:00';
        }
    }

    // Demo sending functions
    async startDemoSending() {
        this.goToStep(4);
        this.sendingResults = [];
        
        const tableBody = document.getElementById('sendingTable').querySelector('tbody');
        tableBody.innerHTML = '';
        
        // Simulate sending to each contact
        for (let i = 0; i < this.contacts.length; i++) {
            const contact = this.contacts[i];
            
            // Add row to table
            const row = tableBody.insertRow();
            row.insertCell(0).textContent = contact.name;
            row.insertCell(1).textContent = contact.phone;
            const statusCell = row.insertCell(2);
            statusCell.innerHTML = '<span class="status pending">Sending...</span>';
            
            // Update progress
            const progress = ((i + 1) / this.contacts.length) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('progressText').textContent = `${i + 1} / ${this.contacts.length} sent`;
            document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
            
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate random success/failure (90% success rate)
            const success = Math.random() > 0.1;
            statusCell.innerHTML = success ? 
                '<span class="status success">Demo Sent</span>' : 
                '<span class="status error">Demo Failed</span>';
            
            this.sendingResults.push({
                ...contact,
                status: success ? 'sent' : 'failed'
            });
        }
        
        // Show summary
        setTimeout(() => {
            this.showDemoSummary();
        }, 1000);
    }

    showDemoSummary() {
        this.goToStep(5);
        
        const sent = this.sendingResults.filter(r => r.status === 'sent').length;
        const failed = this.sendingResults.filter(r => r.status === 'failed').length;
        
        document.getElementById('sentCount').textContent = sent;
        document.getElementById('failedCount').textContent = failed;
        document.getElementById('totalSent').textContent = sent + failed;
        
        // Show detailed results
        const tableBody = document.getElementById('resultsTable').querySelector('tbody');
        tableBody.innerHTML = '';
        
        this.sendingResults.forEach(result => {
            const row = tableBody.insertRow();
            row.insertCell(0).textContent = result.name;
            row.insertCell(1).textContent = result.phone;
            const statusCell = row.insertCell(2);
            statusCell.innerHTML = result.status === 'sent' ? 
                '<span class="status success">Demo Sent</span>' : 
                '<span class="status error">Demo Failed</span>';
        });
        
        // Save to history
        this.broadcastHistory.unshift({
            id: Date.now().toString(),
            name: document.getElementById('projectName').value || 'Demo Campaign',
            date: new Date().toISOString(),
            message: this.messageContent,
            image: this.messageImage,
            results: this.sendingResults,
            status: 'completed'
        });
        this.saveBroadcastHistory();
    }

    downloadDemoReport() {
        const csvContent = "data:text/csv;charset=utf-8," +
            "Name,Phone,Status\n" +
            this.sendingResults.map(r => `${r.name},${r.phone},${r.status}`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "demo_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    newCampaign() {
        this.contacts = [];
        this.messageContent = '';
        this.messageImage = null;
        this.sendingResults = [];
        this.currentStep = 1;
        
        document.getElementById('messageText').value = '';
        document.getElementById('messageImage').value = '';
        document.getElementById('projectName').value = '';
        document.getElementById('previewText').innerHTML = 'Your message will appear here...';
        document.getElementById('previewImage').style.display = 'none';
        
        this.updateContactList();
        this.updateMessagePreview();
        this.goToStep(1);
    }

    // Page navigation
    showHomePage() {
        try {
            console.log('Showing home page...');
            const homePage = document.getElementById('homePage');
            const campaignPage = document.getElementById('campaignPage');
            
            if (homePage && campaignPage) {
                homePage.classList.add('active');
                campaignPage.classList.remove('active');
                this.updateCampaignDashboard();
            } else {
                console.error('Page elements not found');
            }
        } catch (error) {
            console.error('Error showing home page:', error);
        }
    }

    showCampaignPage() {
        try {
            console.log('Showing campaign page...');
            const homePage = document.getElementById('homePage');
            const campaignPage = document.getElementById('campaignPage');
            
            if (homePage && campaignPage) {
                homePage.classList.remove('active');
                campaignPage.classList.add('active');
                this.currentStep = 1;
                this.updateStepIndicator();
            } else {
                console.error('Page elements not found');
            }
        } catch (error) {
            console.error('Error showing campaign page:', error);
        }
    }

    updateCampaignDashboard() {
        // Update dashboard with demo data
        const scheduledList = document.getElementById('scheduledList');
        const ongoingList = document.getElementById('ongoingList');
        const completedList = document.getElementById('completedList');
        
        // For demo, show empty states
        scheduledList.innerHTML = `
            <div class="empty-campaigns">
                <p>No scheduled campaigns</p>
                <small>Campaigns scheduled for later will appear here</small>
                <button class="btn-secondary btn-small" onclick="window.app && window.app.showCampaignPage()">Schedule Campaign</button>
            </div>
        `;
        
        ongoingList.innerHTML = `
            <div class="empty-campaigns">
                <p>No ongoing campaigns</p>
                <small>Currently running campaigns will appear here</small>
                <button class="btn-secondary btn-small" onclick="window.app && window.app.showCampaignPage()">Start Campaign</button>
            </div>
        `;
        
        // Show completed campaigns from history
        if (this.broadcastHistory.length > 0) {
            completedList.innerHTML = this.broadcastHistory.map(campaign => {
                const date = new Date(campaign.date);
                const sent = campaign.results.filter(r => r.status === 'sent').length;
                const total = campaign.results.length;
                
                return `
                    <div class="campaign-item">
                        <div class="campaign-item-header">
                            <h4>${campaign.name}</h4>
                            <span class="campaign-date">${date.toLocaleDateString()}</span>
                        </div>
                        <div class="campaign-item-stats">
                            <span>${sent}/${total} sent</span>
                            <div class="campaign-item-status completed">Demo Completed</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            completedList.innerHTML = `
                <div class="empty-campaigns">
                    <p>No completed campaigns yet</p>
                    <small>Your finished campaigns will appear here</small>
                    <button class="btn-secondary btn-small" onclick="window.app && window.app.showCampaignPage()">Create First Campaign</button>
                </div>
            `;
        }
    }

    // Storage functions
    saveBroadcastHistory() {
        try {
            localStorage.setItem('demo_broadcast_history', JSON.stringify(this.broadcastHistory));
        } catch (error) {
            console.error('Error saving broadcast history:', error);
        }
    }

    loadBroadcastHistory() {
        try {
            const saved = localStorage.getItem('demo_broadcast_history');
            if (saved) {
                this.broadcastHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading broadcast history:', error);
        }
    }

    saveScheduledCampaigns() {
        try {
            localStorage.setItem('demo_scheduled_campaigns', JSON.stringify(this.scheduledCampaigns));
        } catch (error) {
            console.error('Error saving scheduled campaigns:', error);
        }
    }

    loadScheduledCampaigns() {
        try {
            const saved = localStorage.getItem('demo_scheduled_campaigns');
            if (saved) {
                this.scheduledCampaigns = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading scheduled campaigns:', error);
        }
    }
}

// Initialize the demo app
let app;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing demo app...');
    try {
        app = new WhatsAppBlastDemoApp();
        window.app = app; // Make it globally accessible
    } catch (error) {
        console.error('Failed to initialize demo app:', error);
    }
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOM is still loading
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing demo app...');
    try {
        app = new WhatsAppBlastDemoApp();
        window.app = app; // Make it globally accessible
    } catch (error) {
        console.error('Failed to initialize demo app:', error);
    }
}