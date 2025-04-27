# TrumpRunAgent Auto Bot

An automated bot for interacting with the Trump Run Agent platform, designed to automate gameplay and mining activities to earn tokens.

## 🚀 Features

- **Auto Play**: Automatically plays the game at regular intervals
- **Auto Mining**: Automatically starts and restarts mining at optimal intervals
- **Multi-Account Support**: Run multiple accounts simultaneously
- **Proxy Support**: Use proxies to avoid IP restrictions
- **Detailed Logging**: Comprehensive logging with color-coded status updates
- **Error Handling**: Robust error handling with automatic retries

## 📋 Prerequisites

- Node.js 16.x or higher
- npm or yarn

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/airdropinsiders/TrumpRunAgent-Auto-Bot.git
cd TrumpRunAgent-Auto-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your tokens and wallet addresses:
```
TOKEN_1=your_token_here
walletAddress_1=your_wallet_address_here

TOKEN_2=your_second_token_here
walletAddress_2=your_second_wallet_address_here

# Add more tokens and wallet addresses as needed
```

4. (Optional) Create a `proxies.txt` file with your proxies (one per line):
```
http://username:password@ip:port
ip:port
http://ip:port
```

## 🎮 Usage

### Auto Play Bot

Run the auto play bot to automatically play games and earn points:

```bash
npm run play
```

### Auto Mining Bot

Run the auto mining bot to automatically mine and claim rewards:

```bash
npm run mine
```

## ⚙️ Configuration

You can modify the following parameters in the script files:

- `gameInterval`: Time between game plays (default: 60000ms / 1 minute)
- `miningInterval`: Time between mining claims (default: 300000ms / 5 minutes)
- `maxRetries`: Maximum number of retries for failed requests (default: 3)
- `retryDelay`: Delay between retries (default: 5000ms / 5 seconds)

## 📊 Account Information

The bot will display detailed information about each account on startup:

- User info (name, username, ID, etc.)
- Trump Run profile (score, points, money, etc.)
- Wallet addresses and payment information

## 🚨 Error Handling

The bot includes comprehensive error handling:

- Automatic retries for failed API requests
- Detailed error logging
- Graceful shutdown on interruption

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This bot is for educational purposes only. Use at your own risk. We are not responsible for any consequences resulting from the use of this bot, including but not limited to account bans or losses.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request