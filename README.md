# Roblox Control Panel  

A comprehensive dashboard for managing Roblox accounts, monitoring game data, creating accounts, and executing remote scripts on Roblox instances.  

## Features  

- **Dashboard with real-time game statistics**  
- **Monitor player data** including money, bank balances, health, and position  
- **Remote script execution** via WebSockets  
- **Process monitoring and management**  
- **Server browser** for finding and joining games  

---

## Installation Guide  

### Prerequisites  

- **Node.js** (version 14 or higher recommended)  
- **Git**  
- **A working Roblox Account Manager setup**  

### Step 1: Install Node.js and Git  

If you don’t have Node.js and Git installed:  

- [Download and install Node.js](https://nodejs.org)  
- [Download and install Git](https://git-scm.com)  

### Step 2: Clone the Repository  

Create a development directory where you want to store the project:  

#### Option 1: Create a `dev` directory in your user's root folder  
```sh  
mkdir ~/dev  
cd ~/dev  
```  
#### Option 2: Use your preferred location  
Navigate to your preferred directory.  

Clone the repository:  
```sh  
git clone https://github.com/dader34/roblox-control-panel.git  
cd roblox-control-panel  
```  

### Step 3: Install Dependencies  

#### Install dependencies for the server:  
```sh  
npm i  
```  

#### Install dependencies for the client:  
```sh  
cd client  
npm i  
```  

#### Return to the project root directory:  
```sh  
cd ..  
```  

### Step 4: Build and Start the Application  

#### Build the client:  
```sh  
npm run build  
```  

#### Start the application:  
```sh  
npm start  
```  
The control panel should now be running at [http://localhost:3000](http://localhost:3000).  

---

## Configuration  

Edit the `config.js` file in the root directory to configure:  

- **Port settings**  
- **Roblox Account Manager API connection details**  

### Roblox Account Manager Setup:  

1. Open **Account Manager** and navigate to **Settings**.  
2. In the **General** tab, enable **"Multi Roblox"**.  
3. Open the **Dev** tab and enable everything except:  
   - "Every request requires password"  
   - "Disable image loading"  
   - "Allow external connections"  
4. Set the password for the **Account Manager Dev Server** to **Whatever** (case-sensitive).  
5. Restart **Account Manager**.  

---

## Final Steps  

Now go to [http://localhost:3000](http://localhost:3000) to access the control panel! Everything should be ready to go at this point. **Enjoy!** 🎮  

---

## Usage  

### Monitoring Game Data  

1. Launch the **dashboard**.  
2. Use the **Quick Launch** feature to start Roblox games or use the **Server Browser** to launch multiple instances.  
3. Once you have joined a game and passed the **"Play"** screen, execute the script found on the dashboard.  
4. The **dashboard** will display **live statistics** for all running games.  

---

## Troubleshooting  

(Include common issues and solutions here)  

---

## License  

**MIT License**  

---

## Acknowledgments  

- Built using **React, Express, and WebSocket technology**  
- Leverages **Roblox Account Manager** for basic account handling  
