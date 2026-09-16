<div align="center"><img src="https://capsule-render.vercel.app/api?type=waving&color=0:0ea5e9,50:6366f1,100:8b5cf6&height=220&section=header&text=Warren-XMD&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Multi-Session%20WhatsApp%20Bot&descAlignY=58&descSize=20" width="100%" />Warren-XMD

Multi-session WhatsApp automation built with Node.js and Baileys.

<p>
  <a href="https://warren-xmd.vercel.app/">
    <img src="https://img.shields.io/badge/Website-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <a href="https://github.com/truelogic-lab/warren-xmd">
    <img src="https://img.shields.io/badge/GitHub-18181B?style=for-the-badge&logo=github&logoColor=white" />
  </a>
</p><p>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Baileys-6.7-25D366?style=flat-square" />
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker&logoColor=white" />
</p></div>---

Overview

Warren-XMD is a multi-session WhatsApp bot designed around a persistent session architecture.

The project combines a Node.js backend, Baileys, PostgreSQL, and a web-based connection interface. Each WhatsApp connection is managed independently, allowing multiple users to run their own sessions without sharing authentication state.

The system is intended to be suitable for developers building WhatsApp automation platforms, bot hosting services, community tools, and multi-account deployments.

Project goals

- Keep WhatsApp sessions persistent across restarts
- Separate authentication data between sessions
- Provide web-based pairing instead of CLI-only setup
- Support multiple concurrent bot instances
- Store session information outside the application filesystem
- Make deployment possible on VPS, Docker, Railway, or Termux

---

Live Connection Portal

<div align="center">"warren-xmd.vercel.app" (https://warren-xmd.vercel.app/)

Web interface for connecting a WhatsApp number and generating a pairing code.

</div>---

Features

Group Management

- Kick and add members
- Promote and demote administrators
- Tag members
- Hide-tag commands
- Mute and unmute groups
- Lock and unlock group settings
- Anti-link protection
- Anti-spam protection
- Anti-bot protection
- Anti-delete protection
- Anti-call protection
- Welcome and goodbye messages
- Custom group configuration
- Group information
- Group invite management
- Poll support
- Join-request management
- Administrator and member listing

Owner & Administration

- View-once media retrieval
- Save media from replies
- Block and unblock users
- Blocklist management
- Profile-picture management
- Bot name and bio management
- Group broadcasting
- Session management
- Restart and shutdown controls
- JavaScript evaluation
- Owner management
- Sudo-user management
- Global anti-call configuration

Bot Settings

- Automatic message reading
- Automatic typing indicators
- Automatic reactions
- Automatic status viewing
- Custom bot name
- Custom owner name
- Runtime prefix changes
- Public and private modes
- Per-group configuration
- User ban and unban
- Global ban list
- Runtime statistics

Utilities

- Image to sticker
- Sticker to image
- Sticker pack editing
- Text-to-speech
- Translation
- Weather lookup
- QR-code generation
- Base64 encoding and decoding
- Binary conversion
- URL encoding and decoding
- Calculator
- Password generation
- UUID generation
- URL shortening

Media & Download Tools

- TikTok video downloads
- TikTok photo slides
- YouTube audio
- YouTube video
- Instagram media
- Facebook video
- Pinterest media
- Lyrics lookup
- Telegram sticker conversion

Entertainment

- Hug
- Kiss
- Slap
- Pat
- Cuddle
- Wave
- High-five
- Bonk
- Poke
- Dance
- Blush
- Smile
- Wink
- Cry
- Waifu
- Neko
- Kitsune
- Ship meter
- Rating commands
- 8Ball
- Truth or Dare
- Roast
- Compliments
- Quotes
- Jokes
- Facts

---

Architecture

                         ┌─────────────────────┐
                         │   Warren-XMD Web UI  │
                         │      Vercel         │
                         └──────────┬──────────┘
                                    │
                                    │ HTTPS
                                    ▼
                         ┌─────────────────────┐
                         │   Backend / API     │
                         │     Node.js         │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
          ┌──────────────────┐             ┌──────────────────┐
          │     Baileys      │             │   PostgreSQL     │
          │ WhatsApp Layer   │             │ Session Storage  │
          └────────┬─────────┘             └──────────────────┘
                   │
          ┌────────┼────────┐
          │        │        │
          ▼        ▼        ▼
       Session  Session  Session
          01       02       03

Components

Component| Purpose
Web UI| Number connection and pairing interface
Node.js| Application runtime and API
Baileys| WhatsApp Web protocol implementation
PostgreSQL| Persistent session and application data
Vercel| Web frontend hosting
Railway / VPS| Backend hosting
Docker| Containerized deployment
Termux| Local development and testing

---

Session Model

Each connected WhatsApp account is treated as an independent session.

User
 │
 │ Connect number
 ▼
Web Interface
 │
 │ Pairing request
 ▼
Backend API
 │
 │ Create session
 ▼
Baileys
 │
 │ Authenticate
 ▼
WhatsApp
 │
 │
 ▼
PostgreSQL
 └── Persistent session data

This keeps session state separate and allows the backend to restore connections after a restart.

---

Requirements

Before running Warren-XMD locally, install:

- Node.js 20 or newer
- npm
- PostgreSQL 15 or newer
- Git

Optional:

- Docker
- Railway CLI
- Termux
- VPS

---

Installation

Clone the repository:

git clone https://github.com/truelogic-lab/warren-xmd.git
cd warren-xmd

Install dependencies:

npm install

Create the environment file:

cp .env.example .env

Configure your environment variables:

PORT=3000

DATABASE_URL=postgresql://user:password@localhost:5432/warren_xmd

NODE_ENV=production

Start the application:

npm start

For development:

npm run dev

---

Database

Warren-XMD uses PostgreSQL for persistent application data.

A typical deployment separates:

Application
     │
     ▼
PostgreSQL
     │
     ├── Sessions
     ├── Users
     ├── Settings
     ├── Groups
     └── Application data

Using persistent database storage prevents session information from depending entirely on the server's local filesystem.

---

Deployment

Warren-XMD can be deployed using several environments.

Railway

Recommended for a managed Node.js deployment.

npm install
npm start

Configure the required environment variables in the Railway project and attach a PostgreSQL service.

VPS

For a traditional Linux server:

git clone https://github.com/truelogic-lab/warren-xmd.git
cd warren-xmd
npm install
npm start

For long-running processes, a process manager such as PM2 can be used:

npm install -g pm2
pm2 start index.js --name warren-xmd
pm2 save

Docker

Build the image:

docker build -t warren-xmd .

Run it:

docker run -d \
  --name warren-xmd \
  --env-file .env \
  -p 3000:3000 \
  warren-xmd

Termux

For local development on Android:

pkg update
pkg install nodejs git

Then:

git clone https://github.com/truelogic-lab/warren-xmd.git
cd warren-xmd
npm install
npm start

---

Project Structure

A typical Warren-XMD deployment follows a structure similar to:

warren-xmd/
│
├── src/
│   ├── api/
│   ├── commands/
│   ├── database/
│   ├── sessions/
│   ├── utils/
│   └── index.js
│
├── public/
│
├── plugins/
│
├── config/
│
├── Dockerfile
├── package.json
├── .env.example
└── README.md

The exact structure may differ between releases.

---

Configuration

Configuration is controlled through environment variables and application settings.

Example:

NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database

Never commit credentials, authentication data, API keys, or database passwords to Git.

Add sensitive files to ".gitignore":

.env
.env.*
node_modules/
session/
sessions/
auth_info/
*.log

---

Scaling

The architecture is designed around independent WhatsApp sessions rather than a single global connection.

For larger deployments:

                 Load Balancer
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Worker 1    Worker 2    Worker 3
          │           │           │
          └───────────┼───────────┘
                      │
                      ▼
                 PostgreSQL

Additional workers can be introduced as the number of active sessions increases.

Actual session capacity depends on available CPU, memory, network bandwidth, database performance, WhatsApp-side limits, and the workload generated by each connection.

The 1500+ session figure should be treated as a deployment target rather than a guaranteed capacity.

---

Security

Production deployments should follow basic security practices:

- Keep ".env" files private
- Never expose database credentials
- Do not commit WhatsApp authentication files
- Validate API input
- Rate-limit public endpoints
- Protect administrative endpoints
- Keep dependencies updated
- Restrict database access
- Use HTTPS in production
- Rotate exposed credentials immediately

---

WhatsApp Compatibility

Warren-XMD uses Baileys to communicate with WhatsApp Web services.

Because WhatsApp can change its Web protocol and account policies, compatibility may change over time. Keep Baileys and the rest of the project's dependencies maintained and test updates before applying them to production sessions.

Use the bot responsibly and follow WhatsApp's applicable terms and policies.

---

Development

Install dependencies:

npm install

Run the development server:

npm run dev

Check the project before submitting changes:

npm test

If the project does not define a test script, use the available lint/build commands from "package.json".

---

Contributing

Contributions are welcome.

Before opening a pull request:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test the changes locally.
5. Keep unrelated changes out of the pull request.
6. Open a pull request with a clear description.

Example:

git checkout -b feature/new-command

git add .

git commit -m "feat: add new command"

git push origin feature/new-command

---

License

This project is distributed under the license included in the repository.

See ""LICENSE"" (LICENSE) for the complete terms.

---

Links

Web: https://warren-xmd.vercel.app/

Repository: https://github.com/truelogic-lab/warren-xmd

---

<div align="center">Warren-XMD

Built for developers building reliable WhatsApp automation.

<br /><img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="80%" /></div>
