# deploy on a server
## using screen
 ```

 # Install screen if not already installed
apt-get install screen

# Start a new screen session
screen -S aquafier-server

# Then run your server
npm run dev

# Detach from the screen by pressing Ctrl+A, then D

# rejoin session
screen -r aquafier-server
```