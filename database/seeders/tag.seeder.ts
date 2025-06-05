import { Tag } from '@app/modules/movies/entities/tags.entity';
import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';

export class TagSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.time('🏷️  Seeding tags');
    console.log('🏷️  Seeding tags...');

    const tagRepository = this.dataSource.getRepository(Tag);

    // Check if tags already exist
    const existingCount = await tagRepository.count();
    if (existingCount > 0) {
      console.log('📋 Tags already exist, skipping...');
      return;
    }

    // Define movie genres/tags
    const tagData = [
      { name: 'Action', slug: 'action' },
      { name: 'Adventure', slug: 'adventure' },
      { name: 'Comedy', slug: 'comedy' },
      { name: 'Drama', slug: 'drama' },
      { name: 'Horror', slug: 'horror' },
      { name: 'Romance', slug: 'romance' },
      { name: 'Sci-Fi', slug: 'sci-fi' },
      { name: 'Thriller', slug: 'thriller' },
      { name: 'Animation', slug: 'animation' },
      { name: 'Fantasy', slug: 'fantasy' },
      { name: 'Crime', slug: 'crime' },
      { name: 'Mystery', slug: 'mystery' },
      { name: 'Family', slug: 'family' },
      { name: 'War', slug: 'war' },
      { name: 'Western', slug: 'western' },
      { name: 'Biography', slug: 'biography' },
      { name: 'Documentary', slug: 'documentary' },
      { name: 'Musical', slug: 'musical' },
      { name: 'Sport', slug: 'sport' },
      { name: 'History', slug: 'history' },
    ];

    // Bulk insert all tags at once
    await tagRepository
      .createQueryBuilder()
      .insert()
      .into(Tag)
      .values(tagData)
      .execute();

    console.timeEnd('🏷️  Seeding tags');
    console.log(`✅ Successfully seeded ${tagData.length} tags`);
  }
}
