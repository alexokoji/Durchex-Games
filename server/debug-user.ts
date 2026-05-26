import dns from 'node:dns';
import mongoose from 'mongoose';
import { User } from './src/models/User';
import { Bet } from './src/models/Bet';
import { Transaction } from './src/models/Transaction';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://durchex-casino:DurchexiGames@cluster0.1jmzxi9.mongodb.net/durchex-games?appName=Cluster0';

async function main() {
  try {
    if (MONGO_URI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(MONGO_URI);
    console.log('[connected] MongoDB');

    const email = 'blaqconcept@gmail.com';
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log(`User not found: ${email}`);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`USER PROFILE: ${user.email}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`ID: ${user._id}`);
    console.log(`Currency: ${user.currency}`);
    console.log(`Balance: ${user.balance}`);
    console.log(`Total Wagered: ${user.totalWagered}`);
    console.log(`Total Won: ${user.totalWon}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECENT TRANSACTIONS');
    console.log('═══════════════════════════════════════════════════════════════');
    const txs = await Transaction.find({ userId: user._id })
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(30)
      .lean();

    for (const tx of txs) {
      console.log(`- [${tx.kind}] Amount: ${tx.amount} ${tx.currency} | Status: ${tx.status} | Ref: ${tx.reference} | Date: ${new Date(tx.completedAt || tx.createdAt).toLocaleString()}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECENT WON BETS');
    console.log('═══════════════════════════════════════════════════════════════');
    const wonBets = await Bet.find({ userId: user._id, status: 'won' })
      .sort({ placedAt: -1 })
      .limit(10)
      .lean();

    for (const bet of wonBets) {
      console.log(`- Bet ID: ${bet._id} | Game: ${bet.gameId} | Stake: ${bet.stake} | Payout: ${bet.payout} | Placed: ${new Date(bet.placedAt).toLocaleString()}`);
    }

  } catch (err) {
    console.error('[error]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
