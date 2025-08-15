# 🚀 WhatsApp Blast App

A powerful, user-friendly web application for sending WhatsApp bulk messages to multiple contacts. Features a modern web interface with real-time progress tracking, message formatting, and campaign management.

[![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://whatsappblast-app.netlify.app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)

## ✨ Features

- **📱 WhatsApp Integration**: Direct connection to WhatsApp Web API using Baileys
- **📊 Campaign Dashboard**: Manage scheduled, ongoing, and completed campaigns
- **📁 Smart Contact Import**: Upload Excel/CSV files or add contacts manually
- **✍️ Rich Message Editor**: Format messages with **bold**, _italic_, ~~strikethrough~~, ```monospace```
- **🖼️ Image Support**: Attach images to your messages (JPG/PNG, up to 5MB)
- **⏰ Schedule Messages**: Schedule campaigns for later delivery
- **📈 Real-time Progress**: Monitor sending progress with detailed status
- **📋 Export Reports**: Download detailed CSV reports of campaign results
- **🎨 Modern UI**: Responsive design that works on desktop and mobile

## 🌐 Live Demo

Try the demo version: **[whatsappblast-app.netlify.app](https://whatsappblast-app.netlify.app)**

*Note: The demo version simulates message sending for demonstration purposes. Download the full version for actual WhatsApp messaging.*

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- WhatsApp account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arayasuryanto/whatsappblast-app.git
   cd whatsappblast-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

5. **Connect to WhatsApp**
   - Scan the QR code with your WhatsApp
   - Start creating campaigns!

## 📖 How to Use

### 1. Campaign Dashboard
- View all your campaigns (scheduled, ongoing, completed)
- Quick access to create new campaigns
- Monitor WhatsApp connection status

### 2. Add Contacts
- **Import from Excel/CSV**: Upload files with `name` and `phone` columns
- **Manual Entry**: Add contacts one by one
- **Duplicate Detection**: Automatically remove duplicate phone numbers
- **Phone Validation**: Verify phone number formats

### 3. Create Messages
- **Rich Text Editor**: Use formatting toolbar for styling
- **Message Preview**: See how your message will look in WhatsApp
- **Personalization**: Use `{{nama}}` to insert contact names
- **Image Attachments**: Add images to enhance your messages

### 4. Send Options
- **Send Now**: Start immediately
- **Schedule Later**: Set specific date and time for delivery
- **Campaign Summary**: Review recipients and message before sending

### 5. Track Progress
- **Real-time Updates**: See sending progress in real-time
- **Status Tracking**: Monitor success/failure for each contact
- **Automatic Delays**: Built-in delays to prevent WhatsApp blocking

### 6. View Results
- **Summary Statistics**: Sent/Failed/Total counts
- **Detailed Reports**: Export CSV with full campaign results
- **Campaign History**: Access all previous campaigns

## 📁 Contact File Format

Your Excel/CSV files should include these columns:

| Column Name Options | Description |
|-------------------|-------------|
| `nama`, `name`, `Name` | Contact's full name |
| `telepon`, `nomor`, `phone`, `Phone` | Phone number (with or without country code) |

**Example CSV:**
```csv
nama,telepon
John Doe,+628123456789
Jane Smith,08123456789
Bob Wilson,6281234567890
```

**Example Excel:**
| nama | telepon |
|------|---------|
| John Doe | +628123456789 |
| Jane Smith | 08123456789 |

## 🔧 Technical Details

### Built With
- **Backend**: Node.js, Express.js
- **WhatsApp**: @whiskeysockets/baileys
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **File Processing**: xlsx library
- **Storage**: LocalStorage for campaign history

### API Endpoints
- `GET /` - Main web interface
- `GET /status` - WhatsApp connection status
- `POST /send` - Send individual message

### Project Structure
```
whatsappblast-app/
├── frontend/           # Static demo files for Netlify
├── auth_info/         # WhatsApp session data (auto-generated)
├── uploads/           # Temporary image uploads
├── index.html         # Main web interface
├── style.css          # Application styling
├── script.js          # Application logic
├── server.js          # Node.js server
├── blast.js           # Original CLI version
└── package.json       # Dependencies and scripts
```

## 🌍 Deployment

### Local Development
```bash
npm run dev
```

### Netlify (Demo Version)
The project includes a demo version that can be deployed to Netlify:

1. Fork this repository
2. Connect to Netlify
3. Deploy from the `frontend` folder
4. The demo will be available at your Netlify URL

### Full Version Deployment
For the full WhatsApp-connected version, deploy to:
- **VPS/Cloud Server** (recommended)
- **Heroku**
- **DigitalOcean**
- **AWS EC2**

## 🔒 Security & Best Practices

- **Session Management**: WhatsApp sessions are stored locally in `auth_info/`
- **Rate Limiting**: Built-in delays prevent WhatsApp from blocking your number
- **Data Privacy**: No messages or contacts are stored on external servers
- **Secure Files**: Use `.gitignore` to prevent committing sensitive data

## ⚠️ Important Notes

- **WhatsApp Terms**: Ensure compliance with WhatsApp's Terms of Service
- **Rate Limits**: Respect WhatsApp's rate limiting to avoid account suspension
- **Valid Numbers**: Use valid phone numbers to maintain good sender reputation
- **Content Policy**: Don't send spam or inappropriate content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/arayasuryanto/whatsappblast-app/issues)
- **Documentation**: [Wiki](https://github.com/arayasuryanto/whatsappblast-app/wiki)
- **Email**: Create an issue for support

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Express.js](https://expressjs.com/) - Web framework
- [xlsx](https://github.com/SheetJS/sheetjs) - Excel file processing

---

**⭐ Star this repository if you find it helpful!**