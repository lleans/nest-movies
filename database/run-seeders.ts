import AppDataSource from './data-source';
import { DatabaseSeeder } from './seeders/database.seeder';

async function runSeeders() {
  const dataSource = AppDataSource;

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const databaseSeeder = new DatabaseSeeder(dataSource);
    await databaseSeeder.run();
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seeders
runSeeders();
