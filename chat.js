// chat.js — Deep Slate Chat Backend
import { WebSocketServer } from 'ws';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const MAX_GLOBAL_HISTORY = 100;

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

function loadUsers() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
    catch { return {}; }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// In-memory state
const clients = new Map(); // ws -> { username, displayName, isAdmin, badge, color }
let channelHistories = { global: [] };
let customChannels = ['global'];
let allDMs = []; // [{ from, to, text, ts }]

function findClientByUsername(username) {
    for (const [ws, info] of clients) {
        if (info.username === username) return ws;
    }
    return null;
}

function broadcast(data, excludeWs = null) {
    const msg = JSON.stringify(data);
    for (const [ws] of clients) {
        if (ws !== excludeWs && ws.readyState === 1) ws.send(msg);
    }
}

function sendOnlineList() {
    // Feature disabled: UI no longer renders the online list
}

export function attachChat(server) {
    const wss = new WebSocketServer({ server, path: '/chat-ws' });

    wss.on('connection', (ws) => {
        let authed = false;
        let lastMsgTime = 0; // Rate limiting for global messages

        ws.on('message', async (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            // ── REGISTER ──────────────────────────────────────────
            if (msg.type === 'register') {
                const users = loadUsers();
                const username = String(msg.username || '').trim().toLowerCase();
                const password = String(msg.password || '');

                if (!username || username.length < 2 || username.length > 20) {
                    return ws.send(JSON.stringify({ type: 'error', text: 'Username must be 2–20 characters.' }));
                }
                if (!/^[a-z0-9_]+$/.test(username)) {
                    return ws.send(JSON.stringify({ type: 'error', text: 'Username: letters, numbers, underscores only.' }));
                }
                if (password.length < 4 || password.length > 256) {
                    return ws.send(JSON.stringify({ type: 'error', text: 'Password must be 4-256 characters.' }));
                }
                if (users[username]) {
                    return ws.send(JSON.stringify({ type: 'error', text: 'Username already taken.' }));
                }

                const hash = await bcrypt.hash(password, 10);
                const displayName = String(msg.displayName || username).trim().slice(0, 30);
                users[username] = { hash, displayName, joined: Date.now() };
                saveUsers(users);
                ws.send(JSON.stringify({ type: 'registered', username }));
                return;
            }

            // ── LOGIN ─────────────────────────────────────────────
            if (msg.type === 'login') {
                const users = loadUsers();
                const username = String(msg.username || '').trim().toLowerCase();
                const password = String(msg.password || '');
                const user = users[username];

                if (!user || !(await bcrypt.compare(password, user.hash))) {
                    return ws.send(JSON.stringify({ type: 'error', text: 'Wrong username or password.' }));
                }
                if (findClientByUsername(username)) {
                    return ws.send(JSON.stringify({ type: 'error', text: 'Already logged in elsewhere.' }));
                }

                authed = true;
                const isAdmin = !!user.admin;
                const displayName = user.displayName || username;
                const badge = user.badgeName || null;
                const color = user.badgeColor || null;
                clients.set(ws, { username, displayName, isAdmin, badge, color });

                ws.send(JSON.stringify({
                    type: 'authed',
                    username,
                    displayName,
                    isAdmin,
                    history: channelHistories['global'],
                    allHistories: channelHistories,
                    channels: customChannels
                }));

                broadcast({ type: 'system', text: `${displayName} joined the chat.` }, ws);
                sendOnlineList();
                return;
            }

            // ── Require auth for everything below ─────────────────
            if (!authed) return;

            const info = clients.get(ws);

            // ── GLOBAL MESSAGE ────────────────────────────────────
            if (msg.type === 'global' || msg.type === 'channel_msg') {
                // Rate limit (1 message per 500ms max)
                const now = Date.now();
                if (!info.isAdmin && now - lastMsgTime < 500) return;
                lastMsgTime = now;

                const text = String(msg.text || '').trim();
                console.log(`[DEBUG] Msg from ${info.username} (Admin: ${info.isAdmin}): "${text}"`);

                if (info.isAdmin && text.startsWith('/')) {
                    // Split by any number of spaces and filter empty items
                    const parts = text.split(/\s+/).filter(p => p.length > 0);
                    const cmd = parts[0].slice(1).toLowerCase();
                    const args = parts.slice(1).join(' '); // Use joined args for content
                    const argParts = parts.slice(1); // Use parts array for clean arguments

                    if (cmd === 'channel') {
                        const action = argParts[0]?.toLowerCase();
                        const cname = argParts[1]?.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        if (action === 'create' && cname) {
                            if (!customChannels.includes(cname)) {
                                customChannels.push(cname);
                                channelHistories[cname] = [];
                                broadcast({ type: 'new_channel', channel: cname });
                                broadcast({ type: 'system', text: `Admin ${info.username} created channel #${cname}.` });
                            }
                            return;
                        }
                        return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /channel create <name>' }));
                    }
                    if (cmd === 'clear') {
                        channelHistories['global'] = [];
                        broadcast({ type: 'system', text: `Chat history cleared by ${info.username}.` });
                        broadcast({ type: 'clear_history' });
                        return;
                    }
                    if (cmd === 'announce') {
                        if (!args) return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /announce <message>' }));
                        broadcast({
                            type: 'announce',
                            fromDisplayName: info.displayName,
                            text: args
                        });
                        return;
                    }
                    if (cmd === 'help') {
                        const helpText = 'Admin Cmds: /clear, /announce <msg>, /kick <user>, /warn <user>, /motd <msg>, /search deep <user>, /rank <user> <badge> [color], /effect <me|all> <shield> [text], /channel create <name>';
                        ws.send(JSON.stringify({ type: 'system', text: helpText }));
                        return;
                    }
                    if (cmd === 'effect') {
                        const target = argParts[0]?.toLowerCase(); // 'me' or 'all'
                        const effectType = argParts[1]?.toLowerCase();
                        const customText = argParts.slice(2).join(' ');

                        if (!target || !effectType || effectType !== 'shield') {
                            return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /effect <me|all> shield [custom_text]' }));
                        }

                        const payload = {
                            type: 'shield_blocked',
                            text: customText || (target === 'all' ? '🚨 ADMIN ANNOUNCEMENT 🚨' : '🛡️ SYSTEM TEST 🛡️')
                        };

                        if (target === 'all') {
                            broadcast(payload);
                        } else {
                            ws.send(JSON.stringify(payload));
                        }
                        return;
                    }
                    if (cmd === 'rank') {
                        const target = argParts[0]?.toLowerCase();
                        const badge = argParts[1];
                        const color = argParts[2] || 'var(--purple)';

                        if (!target || !badge) {
                            return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /rank <user> <badge_text> [color] (use "none" to remove)' }));
                        }

                        const users = loadUsers();
                        if (!users[target]) return ws.send(JSON.stringify({ type: 'error', text: `User "${target}" not found.` }));

                        if (badge.toLowerCase() === 'none') {
                            delete users[target].badgeName;
                            delete users[target].badgeColor;
                            broadcast({ type: 'system', text: `🛡️ Admin ${info.username} removed the rank badge from ${target}.` });
                        } else {
                            users[target].badgeName = badge.toUpperCase();
                            users[target].badgeColor = color;
                            broadcast({ type: 'system', text: `💎 Admin ${info.username} gave the badge [${badge.toUpperCase()}] to ${target}.` });
                        }

                        saveUsers(users);

                        // If the user is online, update their current session instantly
                        const targetWs = findClientByUsername(target);
                        if (targetWs) {
                            const tInfo = clients.get(targetWs);
                            tInfo.badge = users[target].badgeName || null;
                            tInfo.color = users[target].badgeColor || null;
                            clients.set(targetWs, tInfo);
                            sendOnlineList(); // Refresh badges for everyone
                        }
                        return;
                    }
                    if (cmd === 'search') {
                        // Check if the word after search is 'deep' (ignoring extra spaces)
                        if (argParts[0] !== 'deep' || !argParts[1]) {
                            return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /search deep <username>' }));
                        }
                        const targetUser = argParts[1].toLowerCase();

                        const users = loadUsers();
                        const userData = users[targetUser];
                        if (!userData) return ws.send(JSON.stringify({ type: 'error', text: `User "${targetUser}" not found.` }));

                        console.log(`[Admin Activity] ${info.username} searched for user: ${targetUser}`);

                        // Get history
                        const userMsgs = [];
                        for (const room in channelHistories) {
                            for (const h of channelHistories[room]) {
                                if (h && h.from === targetUser) userMsgs.push({...h, room: `#${room}`});
                            }
                        }
                        for (const dm of allDMs) {
                            if (dm && dm.from === targetUser) {
                                userMsgs.push({...dm, room: `DM to @${dm.to}`});
                            }
                        }
                        
                        // Sort by chronological ts
                        userMsgs.sort((a,b) => a.ts - b.ts);

                        const out = JSON.stringify({
                            type: 'search_results',
                            target: targetUser,
                            userData: {
                                displayName: userData.displayName || targetUser,
                                joined: userData.joined,
                                isAdmin: !!userData.admin
                            },
                            history: userMsgs
                        });

                        ws.send(out, (err) => {
                            if (err) console.log(`[ERROR] Failed to send search results:`, err);
                            else console.log(`[SUCCESS] Search result sent to ${info.username}`);
                        });
                        return;
                    }
                    if (cmd === 'motd') {
                        if (!args) return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /motd <message>' }));
                        broadcast({ type: 'system', text: `📜 Message of the Day: ${args}` });
                        return;
                    }
                    if (cmd === 'warn') {
                        const targetUser = parts[1]?.toLowerCase();
                        const reason = parts.slice(2).join(' ') || 'No reason specified';
                        if (!targetUser) return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /warn <username> <reason>' }));

                        // OWNER PERK: Immunity
                        const targetWs = findClientByUsername(targetUser);
                        if (targetWs && clients.get(targetWs).badge === 'OWNER' && info.username !== targetUser) {
                            return ws.send(JSON.stringify({ type: 'shield_blocked', text: 'ERROR: You cannot warn the OWNER.' }));
                        }

                        broadcast({ type: 'system', text: `⚠️ User "${targetUser}" was warned by Admin ${info.username} for: ${reason}` });
                        return;
                    }
                    if (cmd === 'kick') {
                        const targetUser = parts[1]?.toLowerCase();
                        if (!targetUser) return ws.send(JSON.stringify({ type: 'error', text: 'Usage: /kick <username>' }));
                        const targetWs = findClientByUsername(targetUser);
                        if (targetWs) {
                            // OWNER PERK: Immunity
                            if (clients.get(targetWs).badge === 'OWNER' && info.username !== targetUser) {
                                return ws.send(JSON.stringify({ type: 'shield_blocked', text: 'Nice try! You cannot kick the OWNER.' }));
                            }

                            targetWs.send(JSON.stringify({ type: 'error', text: 'You have been kicked by an admin.' }));
                            targetWs.close();
                            broadcast({ type: 'system', text: `👤 User "${targetUser}" was kicked by Admin ${info.username}.` });
                        } else {
                            ws.send(JSON.stringify({ type: 'error', text: `User "${targetUser}" not found or not online.` }));
                        }
                        return;
                    }

                    // ── CATCH-ALL FOR ADMIN CMDS ──
                    // If no command matched, tell the admin instead of showing in chat
                    ws.send(JSON.stringify({ type: 'error', text: `Unrecognized admin command: /${cmd}` }));
                    return;
                }

                const ch = msg.channel || 'global';
                if (!customChannels.includes(ch)) return;

                const histObj = {
                    from: info.username,
                    displayName: info.displayName,
                    text: text,
                    ts: Date.now(),
                    isAdmin: info.isAdmin,
                    badge: info.badge,
                    color: info.color
                };

                channelHistories[ch].push(histObj);
                if (channelHistories[ch].length > 100) channelHistories[ch].shift();

                broadcast({
                    type: 'channel_msg',
                    channel: ch,
                    from: info.username,
                    displayName: info.displayName,
                    text: text,
                    ts: histObj.ts,
                    isAdmin: info.isAdmin,
                    badge: info.badge,
                    color: info.color
                });
                return;
            }

            // ── PRIVATE MESSAGE ───────────────────────────────────
            if (msg.type === 'dm') {
                const to = String(msg.to || '').trim().toLowerCase();
                const text = String(msg.text || '').trim().slice(0, 500);
                if (!text || !to) return;
                
                // Rate limiting for DM
                const now = Date.now();
                if (!info.isAdmin && now - lastMsgTime < 500) return;
                lastMsgTime = now;

                const recipientWs = findClientByUsername(to);
                if (!recipientWs) {
                    return ws.send(JSON.stringify({ type: 'error', text: `${to} is not online.` }));
                }

                const entry = { from: info.username, to, text, ts: Date.now() };
                allDMs.push(entry);
                if (allDMs.length > 1000) allDMs.shift(); // keep last 1000 DMs

                // Send to recipient
                recipientWs.send(JSON.stringify({ type: 'dm', ...entry }));
                // Echo back to sender
                ws.send(JSON.stringify({ type: 'dm', ...entry, echo: true }));
                return;
            }
        });

        ws.on('close', () => {
            const info = clients.get(ws);
            if (info) {
                clients.delete(ws);
                broadcast({ type: 'system', text: `${info.displayName || info.username} left the chat.` });
                sendOnlineList();
            }
        });
    });

    console.log('Deep Slate Chat WebSocket attached to /chat-ws');
}
