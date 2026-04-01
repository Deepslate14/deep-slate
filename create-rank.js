// create-rank.js — Interactive Terminal Tool for Deep Slate Ranks
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\n--- 🛠️  DEEP SLATE RANK CREATOR ---');
    
    if (!fs.existsSync(USERS_FILE)) {
        console.error('❌ Error: users.json not found. Make sure the server has been run at least once!');
        process.exit(1);
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    // 1. Username
    const username = (await question('👤 Enter user LOGIN (username): ')).trim().toLowerCase();
    
    if (!users[username]) {
        console.error(`❌ Error: User "${username}" does not exist. They must register first!`);
        process.exit(1);
    }

    console.log(`✅ Found user: ${users[username].displayName || username}`);

    // 2. Display Name
    const currentName = users[username].displayName || username;
    const newDisplayName = await question(`📝 New Display Name (Enter to keep "${currentName}"): `);
    if (newDisplayName) users[username].displayName = newDisplayName.trim();

    // 3. Badge Name
    const badgeName = await question('💎 Badge Name (e.g. VIP, OWNER, MOD): ');
    if (badgeName) users[username].badgeName = badgeName.trim().toUpperCase();

    // 4. Badge Color
    const badgeColor = await question('🎨 Badge Color (e.g. #AF52DE, gold, lime, cyan): ');
    if (badgeColor) users[username].badgeColor = badgeColor.trim();

    // 5. Admin Status
    const isAdmin = await question('🛡️  Make this user an Admin? (y/n): ');
    if (isAdmin.toLowerCase() === 'y') users[username].admin = true;
    else if (isAdmin.toLowerCase() === 'n') users[username].admin = false;

    // Save changes
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    console.log('\n-----------------------------------');
    console.log(`✅ SUCCESS: Rank updated for ${username}!`);
    console.log(`   Badge: [${users[username].badgeName || 'None'}]`);
    console.log(`   Color: ${users[username].badgeColor || 'Default'}`);
    console.log('-----------------------------------\n');
    console.log('💡 Restart your server to apply changes!');

    process.exit(0);
}

main();
