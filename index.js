const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`  Trump Run Agent Auto Bot - Airdrop Insiders `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

const apiBaseUrl = 'https://api.trumprunagent.xyz/v1';
const miningInterval = 300000;
const maxRetries = 3; 
const retryDelay = 5000; 

const endpoints = {
  userInfo: `${apiBaseUrl}/user/get-user-info`,
  profile: `${apiBaseUrl}/trump-run/get-profile`,
  mining: `${apiBaseUrl}/trump-run/mining`
};

function readTokensAndWalletsFromEnv() {
  try {
    const tokens = [];
    const wallets = [];
    let index = 1;

    while (process.env[`TOKEN_${index}`]) {
      const token = process.env[`TOKEN_${index}`].trim();
      const wallet = process.env[`walletAddress_${index}`]?.trim();

      if (!token) {
        logger.error(`TOKEN_${index} is empty in .env file`);
        process.exit(1);
      }
      if (!wallet) {
        logger.error(`walletAddress_${index} is missing or empty in .env file`);
        process.exit(1);
      }

      if (!token.match(/^[A-Za-z0-9+/=]+$/)) {
        logger.error(`TOKEN_${index} contains invalid characters`);
        process.exit(1);
      }

      tokens.push(token.startsWith('Bearer ') ? token : `Bearer ${token}`);
      wallets.push(wallet);
      index++;
    }

    if (tokens.length === 0) {
      logger.error('No tokens found in .env file');
      process.exit(1);
    }

    logger.success(`Successfully loaded ${tokens.length} token(s) and wallet address(es) from .env`);
    return { tokens, wallets };
  } catch (error) {
    logger.error(`Error reading .env file: ${error.message}`);
    process.exit(1);
  }
}

function readProxiesFromFile() {
  try {
    const proxyFilePath = path.join(__dirname, 'proxies.txt');
    if (!fs.existsSync(proxyFilePath)) {
      logger.warn(`proxies.txt file not found. Running without proxies.`);
      return [];
    }
    
    const fileContent = fs.readFileSync(proxyFilePath, 'utf8');
    const proxies = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    logger.success(`Successfully loaded ${proxies.length} proxies from proxies.txt`);
    return proxies;
  } catch (error) {
    logger.warn(`Error reading proxies file: ${error.message}. Running without proxies.`);
    return [];
  }
}

function parseProxy(proxyString) {
  try {
    let protocol = 'http';
    let host, port, username, password;
    
    if (proxyString.includes('://')) {
      const url = new URL(proxyString);
      protocol = url.protocol.replace(':', '');
      host = url.hostname;
      port = url.port;
      
      if (url.username) {
        username = decodeURIComponent(url.username);
        password = decodeURIComponent(url.password);
      }
    } else if (proxyString.split(':').length === 4) {
      const parts = proxyString.split(':');
      host = parts[0];
      port = parts[1];
      username = parts[2];
      password = parts[3];
    } else if (proxyString.split(':').length === 2) {
      const parts = proxyString.split(':');
      host = parts[0];
      port = parts[1];
    } else {
      throw new Error('Unsupported proxy format');
    }
    
    let proxyUrl = `${protocol}://`;
    if (username && password) {
      proxyUrl += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }
    proxyUrl += `${host}:${port}`;
    
    return proxyUrl;
  } catch (error) {
    logger.warn(`Failed to parse proxy: ${proxyString}. Error: ${error.message}`);
    return null;
  }
}

function createHeaders(token) {
  return {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': token,
    'charset': 'utf-8',
    'content-type': 'application/json',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Microsoft Edge WebView2";v="135", "Chromium";v="135", "Not-A.Brand";v="8", "Microsoft Edge";v="135"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'Referer': 'https://tma.trumprunagent.xyz/',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

function createAxiosInstance(tokenIndex, proxies) {
  const config = {};
  
  if (proxies.length > 0) {
    const proxyIndex = tokenIndex % proxies.length;
    const proxyString = proxies[proxyIndex];
    const proxyUrl = parseProxy(proxyString);
    
    if (proxyUrl) {
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
      logger.info(`Token ${tokenIndex+1} using proxy: ${proxyString}`);
    }
  }
  
  return axios.create(config);
}

async function retryRequest(fn, tokenIndex, maxRetries, retryDelay) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`[Token ${tokenIndex+1}] Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function getUserInfo(token, axiosInstance, tokenIndex) {
  return retryRequest(async () => {
    try {
      const headers = createHeaders(token);
      const response = await axiosInstance.get(endpoints.userInfo, { headers });
      return response.data;
    } catch (error) {
      logger.error(`[Token ${tokenIndex+1}] Error getting user info: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }, tokenIndex, maxRetries, retryDelay);
}

async function getProfile(token, axiosInstance, tokenIndex) {
  return retryRequest(async () => {
    try {
      const headers = createHeaders(token);
      const response = await axiosInstance.get(endpoints.profile, { headers });
      return response.data;
    } catch (error) {
      logger.error(`[Token ${tokenIndex+1}] Error getting profile: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }, tokenIndex, maxRetries, retryDelay);
}

async function startMining(token, tokenIndex, walletAddress, axiosInstance) {
  return retryRequest(async () => {
    try {
      const headers = createHeaders(token);
      
      const profile = await getProfile(token, axiosInstance, tokenIndex);
      let money = "N/A";
      let trumpPoint = "N/A";
      
      if (profile && profile.data && profile.data.profile) {
        money = profile.data.profile.money;
        trumpPoint = profile.data.profile.trumpPoint;
      }
      
      const response = await axiosInstance.post(endpoints.mining, 
        { walletAddress, status: 'mining' }, 
        { headers }
      );
      
      const timestamp = new Date().toLocaleTimeString();
      logger.success(`${timestamp} - [Token ${tokenIndex+1}] Mining started: ${JSON.stringify(response.data)} - Money: ${money} | Trump Point: ${trumpPoint}`);
      return response.data;
    } catch (error) {
      logger.error(`[Token ${tokenIndex+1}] Error starting mining: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }, tokenIndex, maxRetries, retryDelay);
}

async function stopMining(token, tokenIndex, walletAddress, axiosInstance) {
  return retryRequest(async () => {
    try {
      const headers = createHeaders(token);
      const response = await axiosInstance.post(endpoints.mining, 
        { walletAddress, status: 'stop' }, 
        { headers }
      );
      
      const timestamp = new Date().toLocaleTimeString();
      logger.info(`${timestamp} - [Token ${tokenIndex+1}] Mining stopped/claimed: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      logger.error(`[Token ${tokenIndex+1}] Error stopping mining: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }, tokenIndex, maxRetries, retryDelay);
}

function displayUserInfo(userInfo, profile, tokenIndex) {
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.cyan}${colors.bold}USER INFORMATION (Token ${tokenIndex+1})${colors.reset}`);
  console.log('='.repeat(50));
  
  if (userInfo && userInfo.data) {
    const user = userInfo.data;
    logger.step(`Name: ${user.firstName} ${user.lastName}`);
    logger.step(`Username: ${user.username}`);
    logger.step(`User ID: ${user.id}`);
    logger.step(`Coins: ${user.coin}`);
    logger.step(`Account Created: ${new Date(user.createdAt).toLocaleString()}`);
    logger.step(`Total Playing Time: ${user.totalPlayingTime} minutes`);
    logger.step(`Total Launches: ${user.totalLaunch}`);
  } else {
    logger.error('Failed to fetch user information.');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.cyan}${colors.bold}TRUMP RUN PROFILE (Token ${tokenIndex+1})${colors.reset}`);
  console.log('='.repeat(50));
  
  if (profile && profile.data) {
    const trumpProfile = profile.data.profile;
    const paymentAddress = profile.data.paymentAddress;
    const walletAddress = profile.data.walletAddress;
    
    logger.step(`High Score: ${trumpProfile.highScore}`);
    logger.step(`Money: ${trumpProfile.money}`);
    logger.step(`Trump Points: ${trumpProfile.trumpPoint}`);
    logger.step(`Selected Player: ${trumpProfile.selectedPlayer}`);
    logger.step(`Selected Theme: ${trumpProfile.selectedTheme}`);
    logger.step(`Owner Reference Code: ${trumpProfile.ownerRC}`);
    logger.step(`Profile Created: ${new Date(trumpProfile.createdAt).toLocaleString()}`);
    logger.step(`Last Updated: ${new Date(trumpProfile.updatedAt).toLocaleString()}`);
    logger.step(`Daily Task Time: ${new Date(trumpProfile.dailyTaskTime).toLocaleString()}`);
    logger.step(`Wallet Address: ${walletAddress}`);
    logger.step(`Payment Address: ${paymentAddress}`);
  } else {
    logger.error('Failed to fetch Trump Run profile.');
  }
  
  console.log('='.repeat(50) + '\n');
}

async function runMiningCycle() {
  logger.banner();
  logger.loading(`Mining bot initializing...`);
  
  const { tokens, wallets } = readTokensAndWalletsFromEnv();
  const proxies = readProxiesFromFile();
  
  logger.success(`Mining bot started with ${tokens.length} account(s)`);
  
  const axiosInstances = tokens.map((_, index) => createAxiosInstance(index, proxies));
  const miningStates = tokens.map(() => false);
  
  logger.loading('Fetching account information for all tokens...');
  
  for (let i = 0; i < tokens.length; i++) {
    logger.step(`Fetching information for Token ${i+1}...`);
    const userInfo = await getUserInfo(tokens[i], axiosInstances[i], i);
    const profile = await getProfile(tokens[i], axiosInstances[i], i);
    
    displayUserInfo(userInfo, profile, i);
  }
  
  logger.loading('Starting mining for all tokens...');
  
  for (let i = 0; i < tokens.length; i++) {
    await startMining(tokens[i], i, wallets[i], axiosInstances[i]);
    miningStates[i] = true;
    
    if (i < tokens.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  setInterval(async () => {
    for (let i = 0; i < tokens.length; i++) {
      const currentState = miningStates[i];
      
      if (currentState) {
        await stopMining(tokens[i], i, wallets[i], axiosInstances[i]);
        miningStates[i] = false;
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await startMining(tokens[i], i, wallets[i], axiosInstances[i]);
        miningStates[i] = true;
      }
      
      if (i < tokens.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }, miningInterval);
}

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at ${promise}, reason: ${reason}`);
});

process.on('SIGINT', () => {
  logger.warn('Received SIGINT signal. Shutting down gracefully...');
  process.exit(0);
});

runMiningCycle().catch(error => {
  logger.error(`Fatal error in mining cycle: ${error.message}`);
  logger.error(error.stack);
});