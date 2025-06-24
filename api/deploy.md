# deploy on a server
## using screen
 ```

 # Install screen if not already installed
apt-get install screen

# see running  sessions
screen -ls

# rejoin session
screen -r aquafier-server

# Start a new screen session
screen -S aquafier-server
screen -S aquafier-web


# Then run your server
npm run dev

# Detach from the screen by pressing Ctrl+A, then D


```