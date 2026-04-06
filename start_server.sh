#!/bin/bash
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
cd /Users/user/.gemini/antigravity/playground/swift-galaxy
nohup npx -y node@20 node_modules/.bin/next dev > /tmp/next_dev.log 2>&1 &
disown
nohup ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3000 nokey@localhost.run > /tmp/tunnel.log 2>&1 &
disown
