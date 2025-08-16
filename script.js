class WhatsAppBlastApp {
    constructor() {
        this.contacts = [];
        this.currentStep = 1;
        this.messageContent = '';
        this.messageImage = null;
        this.isConnected = false;
        this.sendingResults = [];
        this.broadcastHistory = [];
        this.scheduledCampaigns = [];
        
        this.init();
    }

    init() {
        console.log('WhatsApp Blast App initializing...');
        try {
            this.loadBroadcastHistory();
            this.loadScheduledCampaigns();
            this.setupEventListeners();
            this.updateStepIndicator();
            // Start with home page visible
            this.showHomePage();
            // Check connection but don't auto-show QR on page load
            this.checkConnectionSilent();
            
            // Start scheduled campaign checker
            this.startScheduledChecker();
            
            console.log('App initialized successfully');
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

        // QR Modal close button
        document.getElementById('closeQrModal').addEventListener('click', () => {
            document.getElementById('qrModal').classList.remove('active');
        });

        // Header connection status click handler
        const connectionStatus = document.getElementById('connectionStatus');
        const logoutDropdown = document.getElementById('logoutDropdown');
        let dropdownVisible = false;
        
        if (connectionStatus) {
            connectionStatus.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (this.isConnected) {
                    // Toggle logout dropdown
                    dropdownVisible = !dropdownVisible;
                    if (logoutDropdown) {
                        logoutDropdown.style.display = dropdownVisible ? 'block' : 'none';
                    }
                } else {
                    // Show QR code if not connected
                    this.checkConnection();
                }
            });
        }

        // Logout button handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.logoutWhatsApp();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (dropdownVisible && logoutDropdown) {
                logoutDropdown.style.display = 'none';
                dropdownVisible = false;
            }
        });

        // Home page connection status click handler
        const homeConnectionStatus = document.getElementById('homeConnectionStatus');
        if (homeConnectionStatus) {
            homeConnectionStatus.addEventListener('click', () => {
                if (!this.isConnected) {
                    this.checkConnection();
                }
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

        // Confirm import
        const confirmButton = document.getElementById('confirmImport');
        confirmButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked, calling importContacts...');
            this.importContacts();
        });

        // Manual form
        document.getElementById('manualForm').addEventListener('submit', this.addManualContact.bind(this));

        // Add more contacts
        document.getElementById('addMoreContacts').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.add('active');
        });

        // Step navigation
        document.getElementById('nextToMessage').addEventListener('click', () => this.validateAndGoToStep(2));
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

        // Start sending
        document.getElementById('startSending').addEventListener('click', this.startSending.bind(this));

        // Summary actions
        document.getElementById('backToStart').addEventListener('click', () => this.goToStep(1));
        document.getElementById('downloadReport').addEventListener('click', this.downloadReport.bind(this));
        document.getElementById('retryFailed').addEventListener('click', () => this.retryMessages('failed'));
        document.getElementById('retryAll').addEventListener('click', () => this.retryMessages('all'));
        document.getElementById('newCampaign').addEventListener('click', this.newCampaign.bind(this));
    }

    async checkConnection() {
        try {
            console.log('Checking connection...');
            const response = await fetch('/status');
            const data = await response.json();
            console.log('Connection status:', data);
            this.updateConnectionStatus(data.connected, data.phone);
            
            if (!data.connected) {
                // Always show QR modal when not connected
                if (data.qrImage) {
                    this.showQRCode(data.qrImage);
                } else {
                    // Show modal with loading state if no QR yet
                    this.showQRCode(null);
                    // Poll for QR code
                    this.pollForQRCode();
                }
            }
        } catch (error) {
            console.error('Connection check error:', error);
            this.updateConnectionStatus(false);
            // Show modal even on error, so user can retry
            this.showQRCode(null);
        }
    }

    async checkConnectionSilent() {
        try {
            console.log('Checking connection silently...');
            const response = await fetch('/status');
            const data = await response.json();
            console.log('Silent connection status:', data);
            this.updateConnectionStatus(data.connected, data.phone);
            // Don't auto-show QR on page load, wait for user to click
        } catch (error) {
            console.error('Silent connection check error:', error);
            this.updateConnectionStatus(false);
        }
    }

    async pollForQRCode() {
        let attempts = 0;
        const maxAttempts = 150; // 5 minutes (150 * 2 seconds)
        
        // Clear any existing polls
        if (this.currentPollInterval) {
            clearInterval(this.currentPollInterval);
        }
        
        // Poll every 2 seconds for QR code when not connected
        this.currentPollInterval = setInterval(async () => {
            attempts++;
            
            try {
                console.log(`Polling attempt ${attempts}/${maxAttempts}`);
                const response = await fetch('/status');
                const data = await response.json();
                console.log('Poll result:', data);
                
                if (data.connected) {
                    // Connected! Clear polling and update status
                    clearInterval(this.currentPollInterval);
                    this.currentPollInterval = null;
                    this.updateConnectionStatus(true, data.phone);
                    document.getElementById('qrModal').classList.remove('active');
                    return;
                } else if (data.qrImage) {
                    // QR code is ready, show it
                    console.log('QR code received, updating modal');
                    this.showQRCode(data.qrImage);
                } else if (attempts > 5) {
                    // After 10 seconds with no QR, show error with retry
                    this.showQRCodeError();
                }
            } catch (error) {
                console.error('QR polling error:', error);
                if (attempts > 3) {
                    this.showQRCodeError();
                }
            }
            
            // Stop polling after max attempts
            if (attempts >= maxAttempts) {
                clearInterval(this.currentPollInterval);
                this.currentPollInterval = null;
                this.showQRCodeTimeout();
            }
        }, 2000);
    }

    showQRCodeError() {
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <p><strong>Connection Problem</strong></p>
                <p>Having trouble connecting to WhatsApp server.</p>
                <button onclick="window.app.retryConnection()" style="background: #25d366; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 15px;">
                    🔄 Retry Connection
                </button>
            </div>
        `;
    }

    showQRCodeTimeout() {
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⏱️</div>
                <p><strong>Connection Timeout</strong></p>
                <p>Unable to generate QR code after 5 minutes.</p>
                <button onclick="window.app.retryConnection()" style="background: #25d366; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 15px;">
                    🔄 Try Again
                </button>
            </div>
        `;
    }

    async retryConnection() {
        console.log('Retrying connection...');
        
        // Clear any existing polling
        if (this.currentPollInterval) {
            clearInterval(this.currentPollInterval);
            this.currentPollInterval = null;
        }
        
        // Show loading in modal
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #25d366; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                <p><strong>Restarting connection...</strong></p>
                <p><small>This may take a moment</small></p>
            </div>
        `;
        
        try {
            // Force reconnect on server
            const response = await fetch('/reconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('Reconnect response:', data);
            
            if (data.success) {
                // Wait a bit then start checking for QR
                setTimeout(() => {
                    this.checkConnection();
                }, 2000);
            } else {
                this.showQRCodeError();
            }
        } catch (error) {
            console.error('Retry connection error:', error);
            this.showQRCodeError();
        }
    }

    async logoutWhatsApp() {
        if (!confirm('Are you sure you want to logout from WhatsApp? You will need to scan the QR code again to reconnect.')) {
            return;
        }

        try {
            console.log('Logging out from WhatsApp...');
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('Logout response:', data);
            
            if (data.success) {
                this.updateConnectionStatus(false);
                // Hide dropdown
                const logoutDropdown = document.getElementById('logoutDropdown');
                if (logoutDropdown) {
                    logoutDropdown.style.display = 'none';
                }
                // Show QR code for reconnection
                setTimeout(() => {
                    this.checkConnection();
                }, 1000);
            } else {
                alert('Failed to logout. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error during logout. Please try again.');
        }
    }

    updateConnectionStatus(connected, phone = null) {
        const statusElement = document.getElementById('connectionStatus');
        const homeStatusElement = document.getElementById('homeConnectionStatus');
        const logoutDropdown = document.getElementById('logoutDropdown');
        
        this.isConnected = connected;
        
        // Update main header status
        if (statusElement) {
            const dot = statusElement.querySelector('.status-dot');
            const text = statusElement.querySelector('.status-text');
            
            if (connected) {
                dot.className = 'status-dot connected';
                text.textContent = phone ? `Connected as ${phone}` : 'Connected';
                statusElement.classList.add('connected');
            } else {
                dot.className = 'status-dot disconnected';
                text.textContent = 'Not Connected';
                statusElement.classList.remove('connected');
                // Hide logout dropdown when not connected
                if (logoutDropdown) {
                    logoutDropdown.style.display = 'none';
                }
            }
        }
        
        // Update home page status
        if (homeStatusElement) {
            const dot = homeStatusElement.querySelector('.status-dot');
            const text = homeStatusElement.querySelector('.status-text');
            
            if (connected) {
                dot.className = 'status-dot connected';
                text.textContent = phone ? `WhatsApp Connected as ${phone}` : 'WhatsApp Connected';
            } else {
                dot.className = 'status-dot disconnected';
                text.textContent = 'WhatsApp Not Connected - Click to connect';
            }
        }
    }

    showQRCode(qrImageData) {
        const qrModal = document.getElementById('qrModal');
        const qrContainer = document.getElementById('qrCode');
        
        // Always show the modal
        qrModal.classList.add('active');
        
        if (qrImageData) {
            // Create QR code image
            qrContainer.innerHTML = '';
            const qrImage = document.createElement('img');
            qrImage.src = qrImageData;
            qrImage.style.width = '256px';
            qrImage.style.height = '256px';
            qrImage.style.border = '1px solid #ddd';
            qrImage.style.borderRadius = '8px';
            qrImage.style.margin = '20px auto';
            qrImage.style.display = 'block';
            
            qrImage.onerror = () => {
                // Fallback to text if image fails
                qrContainer.innerHTML = '<div style="padding: 20px; background: #f5f5f5; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all;">QR Code error. Please refresh and try again.</div>';
            };
            
            const instructions = document.createElement('p');
            instructions.innerHTML = '📱 <strong>Scan this QR code with your WhatsApp</strong><br><small>Open WhatsApp → Settings → Linked Devices → Link a Device</small>';
            instructions.style.textAlign = 'center';
            instructions.style.marginTop = '15px';
            
            qrContainer.innerHTML = '';
            qrContainer.appendChild(qrImage);
            qrContainer.appendChild(instructions);
        } else {
            // Show loading state
            qrContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #25d366; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                    <p><strong>Connecting to WhatsApp...</strong></p>
                    <p><small>QR code will appear here in a moment</small></p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleFileDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
            alert('Please select an Excel (.xlsx, .xls) or CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data;
                if (fileExtension === 'csv') {
                    data = this.parseCSV(e.target.result);
                } else {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    data = XLSX.utils.sheet_to_json(worksheet);
                }
                
                this.showFilePreview(fileName, data);
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        
        if (fileExtension === 'csv') {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    }

    parseCSV(text) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                data.push(row);
            }
        }
        
        return data;
    }

    showFilePreview(fileName, data) {
        document.getElementById('fileName').textContent = fileName;
        document.getElementById('contactCount').textContent = `${data.length} contacts found`;
        
        const tableBody = document.querySelector('#previewTable tbody');
        tableBody.innerHTML = '';
        
        // Show first 5 rows as preview
        const previewRows = data.slice(0, 5);
        previewRows.forEach(row => {
            const tr = document.createElement('tr');
            const name = row.nama || row.name || row.Name || '';
            const phone = row.telepon || row.nomor || row.phone || row.Phone || '';
            
            tr.innerHTML = `
                <td>${name}</td>
                <td>${phone}</td>
            `;
            tableBody.appendChild(tr);
        });
        
        // Store data for import
        this.pendingContacts = data;
        
        document.getElementById('filePreview').style.display = 'block';
        document.getElementById('uploadArea').style.display = 'none';
    }

    importContacts() {
        console.log('Import button clicked!'); // Debug log
        
        if (!this.pendingContacts || this.pendingContacts.length === 0) {
            alert('No contacts to import');
            return;
        }
        
        const removeDuplicates = document.getElementById('removeDuplicates').checked;
        const validateNumbers = document.getElementById('validateNumbers').checked;
        
        let contacts = this.pendingContacts.map(row => {
            const name = row.nama || row.name || row.Name || '';
            const phone = row.telepon || row.nomor || row.phone || row.Phone || '';
            return { name, phone };
        }).filter(contact => contact.name && contact.phone);
        
        console.log('Raw contacts before processing:', contacts.length); // Debug log
        
        if (validateNumbers) {
            contacts = contacts.filter(contact => this.isValidPhoneNumber(contact.phone));
            console.log('After validation:', contacts.length); // Debug log
        }
        
        if (removeDuplicates) {
            contacts = this.removeDuplicateContacts(contacts);
            console.log('After removing duplicates:', contacts.length); // Debug log
        }
        
        // Remove duplicates with existing contacts to avoid doubling
        contacts = contacts.filter(newContact => 
            !this.contacts.some(existingContact => 
                existingContact.phone.replace(/\D/g, '') === newContact.phone.replace(/\D/g, '')
            )
        );
        
        console.log('After removing existing duplicates:', contacts.length); // Debug log
        
        this.contacts = [...this.contacts, ...contacts];
        this.updateContactList();
        this.closeModal();
        console.log('Import completed! Total contacts:', this.contacts.length); // Debug log
    }

    isValidPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    removeDuplicateContacts(contacts) {
        const seen = new Set();
        return contacts.filter(contact => {
            const key = contact.phone.replace(/\D/g, '');
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    addManualContact(e) {
        e.preventDefault();
        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        
        if (name && phone) {
            if (this.isValidPhoneNumber(phone)) {
                this.contacts.push({ name, phone });
                this.updateContactList();
                this.closeModal();
                
                // Reset form
                document.getElementById('manualForm').reset();
            } else {
                alert('Please enter a valid phone number');
            }
        }
    }

    updateContactList() {
        document.getElementById('totalContacts').textContent = this.contacts.length;
        
        const tableBody = document.querySelector('#contactTable tbody');
        tableBody.innerHTML = '';
        
        this.contacts.forEach((contact, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${contact.name}</td>
                <td>${contact.phone}</td>
                <td>
                    <button class="delete-btn" onclick="app.deleteContact(${index})">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        
        document.getElementById('contactList').style.display = 'block';
        document.getElementById('nextToMessage').disabled = this.contacts.length === 0;
    }

    deleteContact(index) {
        this.contacts.splice(index, 1);
        this.updateContactList();
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Reset upload modal
        document.getElementById('filePreview').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInput').value = '';
    }

    validateAndGoToStep(step) {
        if (step === 2) {
            const projectName = document.getElementById('projectName').value.trim();
            if (!projectName) {
                alert('Please enter a project name before proceeding');
                document.getElementById('projectName').focus();
                return;
            }
        }
        this.goToStep(step);
    }

    goToStep(step) {
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show target step content
        const stepContents = {
            1: 'contactsStep',
            2: 'messageStep',
            3: 'sendStep',
            4: 'progressStep',
            5: 'summaryStep'
        };
        
        document.getElementById(stepContents[step]).classList.add('active');
        this.currentStep = step;
        this.updateStepIndicator();
        
        if (step === 3) {
            this.updateSendSummary();
        }
    }

    updateStepIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    formatWhatsAppText(text, forPreview = true) {
        // Replace {{nama}} placeholder first
        let formatted = text.replace(/\{\{nama\}\}/g, '<span style=\"background: #fffacd; padding: 2px 4px; border-radius: 3px; font-weight: bold;\">John Doe</span>');
        
        if (forPreview) {
            // HTML formatting for preview
            formatted = formatted
                // Bold: **text** or *text*
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*\s][^*]*[^*\s])\*/g, '<strong>$1</strong>')
                // Italic: _text_ 
                .replace(/_(.*?)_/g, '<em>$1</em>')
                // Strikethrough: ~~text~~
                .replace(/~~(.*?)~~/g, '<del>$1</del>')
                // Monospace: ```text```
                .replace(/```(.*?)```/g, '<code>$1</code>')
                // Line breaks
                // Convert line breaks to HTML for proper display\n                .replace(/\\n/g, '<br>');
        }
        
        return formatted;
    }

    getRandomDelay(min = 10000, max = 60000) {
        // Generate random delay for anti-ban (10-60 seconds by default)
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    formatWhatsAppTextForSending(text) {
        // Replace {{nama}} placeholder and keep WhatsApp markdown intact
        return text.replace(/\{\{nama\}\}/g, 'John Doe');
    }

    applyFormatting(format) {
        const textarea = document.getElementById('messageText');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let formattedText = selectedText;
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
                afterText = '';\n                break;\n            case 'name':\n                beforeText = '{{nama}}';\n                afterText = '';
                break;
        }
        
        if (selectedText) {
            // Wrap selected text
            const newText = textarea.value.substring(0, start) + 
                           beforeText + selectedText + afterText + 
                           textarea.value.substring(end);
            textarea.value = newText;
            // Set cursor position after the formatting
            textarea.setSelectionRange(start + beforeText.length, end + beforeText.length);
        } else {
            // Insert formatting at cursor position
            const newText = textarea.value.substring(0, start) + 
                           beforeText + afterText + 
                           textarea.value.substring(start);
            textarea.value = newText;
            // Set cursor between the formatting marks
            textarea.setSelectionRange(start + beforeText.length, start + beforeText.length);
        }
        
        // Update preview and focus back to textarea
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
            previewText.innerHTML = 'Your message will appear here...<br><br><small>💡 Use {{nama}} for personalization<br>Formatting: **bold** _italic_ ~~strikethrough~~ ```monospace```</small>';
        }
        
        // Enable next button if message is not empty
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
                this.messageImage = file;
            };
            reader.readAsDataURL(file);
        }
    }

    toggleSchedulePicker() {
        const sendLater = document.getElementById('sendLater').checked;
        const schedulePicker = document.getElementById('schedulePicker');
        schedulePicker.style.display = sendLater ? 'block' : 'none';
        
        if (sendLater) {
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('scheduleDate').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('scheduleTime').value = '09:00';
        }
    }

    updateSendSummary() {
        document.getElementById('summaryRecipients').textContent = this.contacts.length;
        
        const summaryMessage = document.getElementById('summaryMessage');
        const preview = this.messageContent.substring(0, 50) + (this.messageContent.length > 50 ? '...' : '');
        summaryMessage.textContent = preview || 'No message content';
    }

    async startSending() {
        if (!this.isConnected) {
            alert('Please connect to WhatsApp first');
            await this.checkConnection();
            return;
        }

        if (this.contacts.length === 0) {
            alert('Please add contacts first');
            return;
        }

        if (!this.messageContent.trim()) {
            alert('Please enter a message');
            return;
        }

        const sendNow = document.getElementById('sendNow').checked;
        
        if (!sendNow) {
            const scheduleDate = document.getElementById('scheduleDate').value;
            const scheduleTime = document.getElementById('scheduleTime').value;
            
            if (!scheduleDate || !scheduleTime) {
                alert('Please select date and time for scheduling');
                return;
            }
            
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            if (scheduledDateTime <= new Date()) {
                alert('Scheduled time must be in the future');
                return;
            }
            
            // Schedule the campaign
            this.scheduleMessage(scheduledDateTime);
            return;
        }

        this.goToStep(4);
        await this.processSending();
    }

    async processSending() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressPercent = document.getElementById('progressPercent');
        const sendingTableBody = document.querySelector('#sendingTable tbody');
        
        // Initialize progress
        let sent = 0;
        let failed = 0;
        const total = this.contacts.length;
        
        // Clear previous results
        this.sendingResults = [];
        
        progressText.textContent = `${sent} / ${total} sent`;
        progressPercent.textContent = '0%';
        
        // Clear table
        sendingTableBody.innerHTML = '';
        
        // Add all contacts to the table
        this.contacts.forEach((contact, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${contact.name}</td>
                <td>${contact.phone}</td>
                <td class="status-pending">Pending</td>
            `;
            tr.id = `contact-${index}`;
            sendingTableBody.appendChild(tr);
        });
        
        // Process each contact
        for (let i = 0; i < this.contacts.length; i++) {
            const contact = this.contacts[i];
            const row = document.getElementById(`contact-${i}`);
            const statusCell = row.querySelector('td:last-child');
            
            statusCell.textContent = 'Sending...';
            statusCell.className = 'status-pending';
            
            try {
                // Use original message template with contact name for personalization
                const messageTemplate = this.messageContent;
                
                let response;
                
                // Include image if available
                if (this.messageImage) {
                    const formData = new FormData();
                    formData.append('nomor', contact.phone);
                    formData.append('pesan', messageTemplate);
                    formData.append('nama', contact.name);
                    formData.append('useHumanBehavior', 'true');
                    formData.append('image', this.messageImage);
                    
                    response = await fetch('/send', {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    response = await fetch('/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            nomor: contact.phone,
                            pesan: messageTemplate,
                            nama: contact.name,
                            useHumanBehavior: true
                        })
                    });
                }
                
                if (response.ok) {
                    sent++;
                    statusCell.textContent = 'Sent';
                    statusCell.className = 'status-sent';
                    this.sendingResults.push({
                        contact: contact,
                        status: 'sent',
                        index: i
                    });
                } else {
                    failed++;
                    statusCell.textContent = 'Failed';
                    statusCell.className = 'status-failed';
                    this.sendingResults.push({
                        contact: contact,
                        status: 'failed',
                        index: i
                    });
                }
            } catch (error) {
                failed++;
                statusCell.textContent = 'Failed';
                statusCell.className = 'status-failed';
                this.sendingResults.push({
                    contact: contact,
                    status: 'failed',
                    index: i
                });
            }
            
            // Update progress
            const progress = ((sent + failed) / total) * 100;
            progressFill.style.width = progress + '%';
            progressText.textContent = `${sent + failed} / ${total} sent`;
            progressPercent.textContent = Math.round(progress) + '%';
            
            // Wait random time between messages (10-60 seconds for anti-ban)
            if (i < this.contacts.length - 1) {
                const delay = this.getRandomDelay(10000, 60000); // 10-60 seconds
                console.log(`⏰ Waiting ${Math.round(delay/1000)} seconds before next message...`);
                
                // Update progress text to show waiting time
                const progressText = document.getElementById('progressText');
                const originalText = progressText.textContent;
                progressText.textContent = `${originalText} - Waiting ${Math.round(delay/1000)}s...`;
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Restore original progress text
                progressText.textContent = originalText;
            }
        }
        
        // Show summary after completion
        setTimeout(() => {
            this.showSummary(sent, failed, total);
        }, 1000);
    }

    showSummary(sent, failed, total) {
        document.getElementById('sentCount').textContent = sent;
        document.getElementById('failedCount').textContent = failed;
        document.getElementById('totalSent').textContent = total;
        
        // Populate detailed results table
        const resultsTableBody = document.querySelector('#resultsTable tbody');
        resultsTableBody.innerHTML = '';
        
        this.sendingResults.forEach(result => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${result.contact.name}</td>
                <td>${result.contact.phone}</td>
                <td class="status-${result.status}">${result.status === 'sent' ? 'Sent' : 'Failed'}</td>
            `;
            resultsTableBody.appendChild(tr);
        });
        
        // Show retry buttons if there are failures
        const retryFailedBtn = document.getElementById('retryFailed');
        const retryAllBtn = document.getElementById('retryAll');
        
        if (failed > 0) {
            retryFailedBtn.style.display = 'inline-block';
            retryAllBtn.style.display = 'inline-block';
        } else {
            retryFailedBtn.style.display = 'none';
            retryAllBtn.style.display = 'none';
        }
        
        // Save campaign to history
        this.saveCampaign(sent, failed, total);
        
        this.goToStep(5);
    }

    downloadReport() {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Name,Phone,Status\n"
            + this.contacts.map((contact, index) => {
                const row = document.getElementById(`contact-${index}`);
                const status = row ? row.querySelector('td:last-child').textContent : 'Unknown';
                return `"${contact.name}","${contact.phone}","${status}"`;
            }).join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'blast_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    scheduleMessage(scheduledDateTime) {
        const campaign = {
            id: Date.now().toString(),
            name: document.getElementById('projectName').value || 'Untitled Campaign',
            scheduledTime: scheduledDateTime.toISOString(),
            message: this.messageContent,
            image: this.messageImage,
            contacts: [...this.contacts],
            status: 'scheduled'
        };

        this.scheduledCampaigns.push(campaign);
        this.saveScheduledCampaigns();
        
        // Set timeout to execute when time comes
        const delay = scheduledDateTime.getTime() - Date.now();
        if (delay > 0) {
            setTimeout(() => {
                this.executeScheduledCampaign(campaign.id);
            }, delay);
        }
        
        alert(`Campaign scheduled for ${scheduledDateTime.toLocaleString()}`);
        this.goToStep(1); // Go back to start
    }

    async executeScheduledCampaign(campaignId) {
        const campaign = this.scheduledCampaigns.find(c => c.id === campaignId);
        if (!campaign) {
            console.error('Campaign not found:', campaignId);
            return;
        }
        
        console.log('Executing scheduled campaign:', campaign.name);
        
        // Update status to ongoing
        campaign.status = 'ongoing';
        this.saveScheduledCampaigns();
        
        // Check WhatsApp connection first
        if (!this.isConnected) {
            console.log('WhatsApp not connected, checking connection...');
            await this.checkConnection();
            if (!this.isConnected) {
                console.error('Cannot execute campaign: WhatsApp not connected');
                campaign.status = 'scheduled'; // Revert status
                this.saveScheduledCampaigns();
                return;
            }
        }
        
        // Set up the campaign data
        this.contacts = campaign.contacts;
        this.messageContent = campaign.message;
        this.messageImage = campaign.image;
        
        // Show campaign page and execute
        this.showCampaignPage();
        this.goToStep(4);
        await this.processSending();
        
        // Mark campaign as completed and move to history
        const completedCampaign = {
            id: campaign.id,
            name: campaign.name,
            date: new Date().toISOString(),
            message: campaign.message,
            image: campaign.image ? 'Yes' : 'No',
            results: {
                sent: this.sendingResults.filter(r => r.status === 'sent').length,
                failed: this.sendingResults.filter(r => r.status === 'failed').length,
                total: this.sendingResults.length
            },
            contacts: [...this.sendingResults]
        };
        
        this.broadcastHistory.unshift(completedCampaign);
        this.saveBroadcastHistory();
        
        // Remove from scheduled campaigns after execution
        this.scheduledCampaigns = this.scheduledCampaigns.filter(c => c.id !== campaignId);
        this.saveScheduledCampaigns();
        
        console.log('Scheduled campaign completed:', campaign.name);
    }

    saveScheduledCampaigns() {
        try {
            localStorage.setItem('scheduled_campaigns', JSON.stringify(this.scheduledCampaigns));
        } catch (error) {
            console.error('Error saving scheduled campaigns:', error);
        }
    }

    loadScheduledCampaigns() {
        try {
            const saved = localStorage.getItem('scheduled_campaigns');
            if (saved) {
                this.scheduledCampaigns = JSON.parse(saved);
                
                // Set up timeouts for future campaigns
                this.scheduledCampaigns.forEach(campaign => {
                    if (campaign.status === 'scheduled') {
                        const scheduledTime = new Date(campaign.scheduledTime);
                        const delay = scheduledTime.getTime() - Date.now();
                        if (delay > 0) {
                            setTimeout(() => {
                                this.executeScheduledCampaign(campaign.id);
                            }, delay);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading scheduled campaigns:', error);
        }
    }

    startScheduledChecker() {
        // Check every minute for scheduled campaigns that are due
        setInterval(() => {
            const now = Date.now();
            this.scheduledCampaigns.forEach(campaign => {
                if (campaign.status === 'scheduled') {
                    const scheduledTime = new Date(campaign.scheduledTime).getTime();
                    if (scheduledTime <= now) {
                        this.executeScheduledCampaign(campaign.id);
                    }
                }
            });
        }, 60000); // Check every minute
    }

    async retryMessages(type) {
        if (!this.isConnected) {
            alert('Please connect to WhatsApp first');
            await this.checkConnection();
            return;
        }

        // Determine which contacts to retry
        let contactsToRetry = [];
        if (type === 'failed') {
            contactsToRetry = this.sendingResults
                .filter(result => result.status === 'failed')
                .map(result => result.contact);
        } else {
            contactsToRetry = this.contacts;
        }

        if (contactsToRetry.length === 0) {
            alert('No contacts to retry');
            return;
        }

        // Go back to progress step and retry
        this.goToStep(4);
        this.contacts = contactsToRetry;
        await this.processSending();
    }

    newCampaign() {
        // Reset everything
        this.contacts = [];
        this.messageContent = '';
        this.messageImage = null;
        this.currentStep = 1;
        this.sendingResults = [];
        
        // Clear forms
        document.getElementById('projectName').value = '';
        document.getElementById('messageText').value = '';
        document.getElementById('messageImage').value = '';
        document.getElementById('previewText').innerHTML = 'Your message will appear here...<br><br><small>💡 Use {{nama}} for personalization<br>Formatting: **bold** _italic_ ~~strikethrough~~ ```monospace```</small>';
        document.getElementById('previewImage').style.display = 'none';
        
        // Hide contact list
        document.getElementById('contactList').style.display = 'none';
        
        // Reset buttons
        document.getElementById('nextToMessage').disabled = true;
        document.getElementById('nextToSend').disabled = true;
        
        // Show campaign page
        this.showCampaignPage();
        this.goToStep(1);
    }

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
            const campaignPage = document.getElementById('campaignPage');
            const homePage = document.getElementById('homePage');
            
            if (campaignPage && homePage) {
                campaignPage.classList.add('active');
                homePage.classList.remove('active');
            } else {
                console.error('Page elements not found');
            }
        } catch (error) {
            console.error('Error showing campaign page:', error);
        }
    }

    updateCampaignDashboard() {
        const scheduledList = document.getElementById('scheduledList');
        const ongoingList = document.getElementById('ongoingList');
        const completedList = document.getElementById('completedList');

        // Get current campaigns
        const now = new Date();
        const scheduledCampaigns = this.scheduledCampaigns.filter(c => c.status === 'scheduled' && new Date(c.scheduledTime) > now);
        const ongoingCampaigns = this.scheduledCampaigns.filter(c => c.status === 'ongoing');
        const completedCampaigns = this.broadcastHistory;

        // Update scheduled campaigns
        if (scheduledCampaigns.length === 0) {
            scheduledList.innerHTML = `
                <div class="empty-campaigns">
                    <p>No scheduled campaigns</p>
                    <small>Campaigns scheduled for later will appear here</small>
                </div>
            `;
        } else {
            scheduledList.innerHTML = scheduledCampaigns.map(campaign => {
                const scheduledTime = new Date(campaign.scheduledTime);
                const timeStr = scheduledTime.toLocaleDateString() + ' ' + scheduledTime.toLocaleTimeString();
                
                return `
                    <div class="campaign-item" onclick="app.showScheduledCampaignDetails('${campaign.id}')">
                        <div class="campaign-item-header">
                            <div class="campaign-item-title">${campaign.name}</div>
                            <div class="campaign-item-status scheduled">Scheduled</div>
                        </div>
                        <div class="campaign-item-meta">
                            <span>Scheduled for: ${timeStr}</span>
                            <div class="campaign-item-stats">
                                <div class="campaign-stat total">
                                    <span>👥</span>
                                    <span>${campaign.contacts.length} contacts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Update ongoing campaigns
        if (ongoingCampaigns.length === 0) {
            ongoingList.innerHTML = `
                <div class="empty-campaigns">
                    <p>No ongoing campaigns</p>
                    <small>Currently running campaigns will appear here</small>
                </div>
            `;
        } else {
            ongoingList.innerHTML = ongoingCampaigns.map(campaign => {
                return `
                    <div class="campaign-item" onclick="app.showScheduledCampaignDetails('${campaign.id}')">
                        <div class="campaign-item-header">
                            <div class="campaign-item-title">${campaign.name}</div>
                            <div class="campaign-item-status ongoing">Ongoing</div>
                        </div>
                        <div class="campaign-item-meta">
                            <span>Currently running...</span>
                            <div class="campaign-item-stats">
                                <div class="campaign-stat total">
                                    <span>👥</span>
                                    <span>${campaign.contacts.length} contacts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Update completed campaigns
        if (completedCampaigns.length === 0) {
            completedList.innerHTML = `
                <div class="empty-campaigns">
                    <p>No completed campaigns yet</p>
                    <small>Your finished campaigns will appear here</small>
                </div>
            `;
        } else {
            completedList.innerHTML = completedCampaigns.slice(0, 10).map(campaign => {
                const date = new Date(campaign.date);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                
                return `
                    <div class="campaign-item" onclick="app.showCampaignDetails('${campaign.id}')">
                        <div class="campaign-item-header">
                            <div class="campaign-item-title">${campaign.name}</div>
                            <div class="campaign-item-status completed">Completed</div>
                        </div>
                        <div class="campaign-item-meta">
                            <span>${dateStr}</span>
                            <div class="campaign-item-stats">
                                <div class="campaign-stat success">
                                    <span>✓</span>
                                    <span>${campaign.results.sent}</span>
                                </div>
                                <div class="campaign-stat error">
                                    <span>✗</span>
                                    <span>${campaign.results.failed}</span>
                                </div>
                                <div class="campaign-stat total">
                                    <span>📊</span>
                                    <span>${campaign.results.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    showScheduledCampaignDetails(campaignId) {
        const campaign = this.scheduledCampaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        // Populate campaign details modal
        document.getElementById('campaignTitle').textContent = campaign.name;
        
        const scheduledTime = new Date(campaign.scheduledTime);
        const timeStr = scheduledTime.toLocaleDateString() + ' ' + scheduledTime.toLocaleTimeString();
        document.getElementById('campaignDate').textContent = `Scheduled for: ${timeStr}`;
        document.getElementById('campaignStats').textContent = `${campaign.contacts.length} contacts`;

        // Show message preview
        document.getElementById('previewTextDetails').textContent = campaign.message || 'No message content';
        
        if (campaign.image) {
            document.getElementById('previewImageDetails').style.display = 'block';
            document.getElementById('previewImageDetails').innerHTML = '<div style="padding: 10px; background: #f0f0f0; border-radius: 8px; text-align: center; color: #666;">Image included</div>';
        } else {
            document.getElementById('previewImageDetails').style.display = 'none';
        }

        // Show contacts list
        const resultsTableBody = document.querySelector('#campaignResultsTable tbody');
        resultsTableBody.innerHTML = '';
        
        campaign.contacts.forEach(contact => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${contact.name}</td>
                <td>${contact.phone}</td>
                <td class="status-pending">Scheduled</td>
            `;
            resultsTableBody.appendChild(tr);
        });

        // Show campaign details modal
        document.getElementById('campaignDetailsModal').classList.add('active');
    }

    // Broadcast History Management
    loadBroadcastHistory() {
        try {
            const saved = localStorage.getItem('whatsapp_blast_history');
            if (saved) {
                this.broadcastHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading broadcast history:', error);
            this.broadcastHistory = [];
        }
        this.updateHistoryDisplay();
    }

    saveBroadcastHistory() {
        try {
            localStorage.setItem('whatsapp_blast_history', JSON.stringify(this.broadcastHistory));
        } catch (error) {
            console.error('Error saving broadcast history:', error);
        }
    }

    saveCampaign(sent, failed, total) {
        const campaign = {
            id: Date.now().toString(),
            name: document.getElementById('projectName').value || 'Untitled Campaign',
            date: new Date().toISOString(),
            message: this.messageContent,
            image: this.messageImage ? 'Yes' : 'No',
            results: {
                sent: sent,
                failed: failed,
                total: total
            },
            contacts: [...this.sendingResults]
        };

        this.broadcastHistory.unshift(campaign); // Add to beginning
        
        // Keep only last 50 campaigns to avoid storage bloat
        if (this.broadcastHistory.length > 50) {
            this.broadcastHistory = this.broadcastHistory.slice(0, 50);
        }
        
        this.saveBroadcastHistory();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        // This method is no longer needed since we use updateCampaignDashboard()
        // Keep it for compatibility but don't do anything
        console.log('History display updated (now handled by campaign dashboard)');
    }

    showCampaignDetails(campaignId) {
        const campaign = this.broadcastHistory.find(c => c.id === campaignId);
        if (!campaign) return;

        // Close history modal
        document.getElementById('historyModal').classList.remove('active');

        // Populate campaign details
        document.getElementById('campaignTitle').textContent = campaign.name;
        
        const date = new Date(campaign.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        document.getElementById('campaignDate').textContent = `Date: ${dateStr}`;
        document.getElementById('campaignStats').textContent = 
            `${campaign.results.sent} sent, ${campaign.results.failed} failed, ${campaign.results.total} total`;

        // Show message preview
        document.getElementById('previewTextDetails').textContent = campaign.message || 'No message content';
        
        if (campaign.image === 'Yes') {
            document.getElementById('previewImageDetails').style.display = 'block';
            document.getElementById('previewImageDetails').innerHTML = '<div style="padding: 10px; background: #f0f0f0; border-radius: 8px; text-align: center; color: #666;">Image was included</div>';
        } else {
            document.getElementById('previewImageDetails').style.display = 'none';
        }

        // Populate results table
        const resultsTableBody = document.querySelector('#campaignResultsTable tbody');
        resultsTableBody.innerHTML = '';
        
        campaign.contacts.forEach(result => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${result.contact.name}</td>
                <td>${result.contact.phone}</td>
                <td class="status-${result.status}">${result.status === 'sent' ? 'Sent' : 'Failed'}</td>
            `;
            resultsTableBody.appendChild(tr);
        });

        // Show campaign details modal
        document.getElementById('campaignDetailsModal').classList.add('active');
    }
}

// Initialize the app when DOM is loaded
let app;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    try {
        app = new WhatsAppBlastApp();
        window.app = app; // Make it globally accessible
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOM is still loading
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing app...');
    try {
        app = new WhatsAppBlastApp();
        window.app = app; // Make it globally accessible
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}