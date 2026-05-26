import dns from 'node:dns';
import mongoose from 'mongoose';
import { Bet } from './src/models/Bet';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://durchex-casino:DurchexiGames@cluster0.1jmzxi9.mongodb.net/durchex-games?appName=Cluster0';

async function main() {
  try {
    if (MONGO_URI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(MONGO_URI);
    
    const bet = await Bet.findById('6a14624dd7eee3765349a5bd').lean();
    console.log(JSON.stringify(bet, null, 2));

  } catch (err) {
    console.error('[error]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
