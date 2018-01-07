# PendropBackend

So first make sure you install ngrok.

Boot order

In PendropBackend: npm start
- A warning message will appear talking about not being able to connect to mongodb, ignore this.

In a seperate command window
Then wherever ngrok is installed run: ngrok http 8000
- This will open your computer to non-local devices through port 8000. 
- Wait, eventually an http and https address will appear. Copy one of these addresses.

In your pendrop file
- Paste this address into pendrop/client.js where it asks for NETWORK_INTERFACE_URL
