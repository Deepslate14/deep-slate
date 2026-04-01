// create-admin.js — Run this to create or upgrade an admin account
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return {};
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
        console.error('Error loading users:', e.message);
        return {};
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        console.log('\n╔══════════════════════════════╗');
        console.log('║   Deep Slate Admin Setup     ║');
        console.log('╚══════════════════════════════╝\n');

        const username = (await rl.question('Admin username (private login): ')).trim().toLowerCase();
        
        if (!username || !/^[a-z0-9_]+$/.test(username) || username.length < 2) {
            console.error('❌ Invalid username. Use letters, numbers, underscores (min 2 chars).');
            return rl.close();
        }

        const displayName = (await rl.question('Admin exhibit name (public name): ')).trim() || username;

        const password = (await rl.question('Admin password: ')).trim();
        if (password.length < 4) {
            console.error('❌ Password must be at least 4 characters.');
            return rl.close();
        }

        const confirm = (await rl.question('Confirm password: ')).trim();
        if (password !== confirm) {
            console.error('❌ Passwords do not match.');
            return rl.close();
        }

        const users = loadUsers();
        if (users[username] && !users[username].admin) {
            console.log(`\n⚠️ User "${username}" already exists as a regular user.`);
            const overwrite = (await rl.question('Upgrade this user to admin? (y/n): ')).trim().toLowerCase();
            if (overwrite !== 'y') {
                console.log('Cancelled.');
                return rl.close();
            }
        }

        const hash = bcrypt.hashSync(password, 12);
        users[username] = { 
            hash, 
            displayName,
            admin: true, 
            joined: users[username]?.joined || Date.now() 
        };

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        console.log(`\n✅ Admin account "${username}" created/updated successfully!`);
        console.log('   Restart the server and log in at the chat page.\n');

    } catch (err) {
        console.error('\n❌ An error occurred:', err.message);
    } finally {
        rl.close();
    }
}

main();
