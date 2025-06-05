import { User } from '@app/modules/users/entities/users.entity';
import { randAvatar, randEmail, randFullName } from '@ngneat/falso';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';

export class UserSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.time('👥 Seeding users');
    console.log('👥 Seeding users...');

    const userRepository = this.dataSource.getRepository(User);

    // Check if users already exist
    const existingCount = await userRepository.count();
    if (existingCount > 0) {
      console.log('📋 Users already exist, skipping...');
      return;
    }

    // Prepare all user data at once
    const users: Partial<User>[] = [];

    // Create admin user
    const adminPassword = await argon2.hash('admin123');
    users.push({
      name: 'Admin User',
      email: 'admin@cinema.com',
      password: adminPassword,
      isAdmin: true,
      avatar: randAvatar(),
    });

    // Create regular test user
    const testPassword = await argon2.hash('user123');
    users.push({
      name: 'Test User',
      email: 'user@cinema.com',
      password: testPassword,
      isAdmin: false,
      avatar: randAvatar(),
    });

    // Create 10 random users with the same password
    const randomUserPassword = await argon2.hash('randomuser123');

    // Generate random users in bulk
    for (let i = 0; i < 10; i++) {
      const name = randFullName();
      const email = randEmail({
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1],
      });

      users.push({
        name,
        email,
        password: randomUserPassword,
        isAdmin: false,
        avatar: randAvatar(),
      });
    }

    // Bulk insert all users at once
    await userRepository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(users)
      .execute();

    console.timeEnd('👥 Seeding users');
    console.log(
      `✅ Successfully seeded ${users.length} users (1 admin, 1 test user, 10 random users)`,
    );
    console.log('📧 Admin credentials: admin@cinema.com / admin123');
    console.log('📧 Test user credentials: user@cinema.com / user123');
    console.log('📧 Random users password: randomuser123');
  }
}
