import { DataSource } from 'typeorm';
import { MovieScheduleSeeder } from './movie-schedule.seeder';
import { MovieSeeder } from './movie.seeder';
import { SeatSeeder } from './seat.seeder';
import { Seeder } from './seeder.interface';
import { StudioSeeder } from './studio.seeder';
import { TagSeeder } from './tag.seeder';
import { UserSeeder } from './user.seeder';

export class DatabaseSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    // Run seeders in order (dependencies first)
    const seeders: Seeder[] = [
      new TagSeeder(this.dataSource), // First - no dependencies
      new UserSeeder(this.dataSource), // First - no dependencies
      new StudioSeeder(this.dataSource), // First - no dependencies
      new SeatSeeder(this.dataSource), // Depends on studios
      new MovieSeeder(this.dataSource), // Depends on tags
      new MovieScheduleSeeder(this.dataSource), // Depends on movies and studios
    ];

    for (const seeder of seeders) {
      await seeder.run();
    }

    console.log('✅ Database seeding completed!');
    console.log('');
    console.log('📊 Seeded data summary:');
    console.log('  - 20 movie tags/genres');
    console.log('  - 12 users (1 admin, 1 test, 10 random)');
    console.log('  - 8 cinema studios with different features');
    console.log('  - Seats for each studio based on capacity');
    console.log('  - 10 popular movies with tags');
    console.log('  - Movie schedules for the next 30 days');
    console.log('');
    console.log('🔑 Login credentials:');
    console.log('  Admin: admin@cinema.com / admin123');
    console.log('  Test User: user@cinema.com / user123');
    console.log('  Random Users: password123');
  }
}
