XChat  <img width="802" height="257" alt="logo" src="https://github.com/user-attachments/assets/9e60a634-0e02-42a0-b5c3-cdaea2b0b69f" />
A modern, full-featured real-time chat application built with React, Express, MongoDB, and Socket.IO. Enjoy text, audio messages, and even voice calls in private chats—all in a clean, responsive interface powered by Tailwind CSS.

                                         ✨ Features
                Public Chat: Text and audio messages for everyone.
                
                Private Chat: One-on-one text, audio, and voice calls (WebRTC via Socket.IO).
                
                User Authentication: JWT-based secure login/register.
                
                Message Deletion: Users can delete only their own messages.
                
                Audio Messaging: Record, send, and play audio messages.
                
                Voice Calling: Start live voice calls in private chats.
                
                Real-Time Presence: Instantly see who’s online.
                
                Responsive Design: Mobile-ready UI with Tailwind CSS.
                
                Dockerized Deployment: One-command startup with docker-compose.

                                          🖼️ Preview
  ![Xchat](https://github.com/user-attachments/assets/1790e426-f9f7-4a28-a319-c3194e2c3d7f)



                                          🚀 Tech Stack
        Frontend: React, Tailwind CSS, Socket.IO Client
        
        Backend: Express.js, Socket.IO, Multer (audio), JWT, Mongoose (MongoDB)
        
        Database: MongoDB
        
        Audio/Voice: Audio message upload (Multer), real-time voice calling (WebRTC, Socket.IO)
        
        Deployment: Docker, Nginx Proxy Manager (optional)

                                         ⚡️ Quick Start
                          bash
                          copying
                          Editing
                          git clone https://github.com/simolargou/Chatapp.git
                          cd Chatapp

                      # Setup environment variables:
                      # In /backend/.env:
                      #   JWT_SECRET=your_secret
                      #   PORT=5000
                      #   MONGO_URI=mongodb://localhost:27017/xchat
                      # In /frontend/.env:
                      #   REACT_APP_API_URL=http://localhost:5000

                                  # Start backend
                                  cd backend
                                  npm install
                                  npm run dev

                                # Start frontend (in a new terminal)
                                cd ../frontend
                                npm install



                                            npm start : to start the UI



                                   Or use Docker Compose for all services:

                                                  bash
                                                  Copying
                                                  Editing
                                                  docker-compose up -d --build
                                            
                                             🗂️ Project Structure
                                                  
                              Chatapp/
                              │
                              ├── backend/
                              │   ├── models/          # Mongoose schemas (User, Message, Conversation)
                              │   ├── routes/          # API routes (auth, messages)
                              │   ├── uploads/         # Audio files
                              │   └── server.js        # Express + Socket.IO entrypoint
                              │
                              ├── frontend/
                              │   ├── src/
                              │   │   ├── components/  # Recorder, AudioPlayer, Call UI
                              │   │   ├── pages/       # ChatPage, PrivateChatPage, AuthPage
                              │   │   └── socket.js    # Socket service connection
                              │   └── public/
                              │
                              ├── docker-compose.yml   # Docker config
                              └── README.md

                                               🗣️ Voice Calls
                      Private chats support real-time voice calling powered by Socket.IO and WebRTC.
                      
                      See when the other user is online, initiate a call, and enjoy low-latency conversations.



                                                     🔒 Security
                            All API calls use JWT for authentication.
                            
                            Only message authors can delete their messages (checked in both frontend and backend).
                            
                            Sensitive data (like MongoDB URI, JWT secret) is never hardcoded.



                                                   🧑‍💻 Contributing
                                          welcome! Please fork and submit pull requests.

                                                      👨‍💻 Author
                                                      simolargou
