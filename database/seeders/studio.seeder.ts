import { Studio } from '@app/modules/studio/entities/studio.entity';
import { randBoolean, randNumber } from '@ngneat/falso';
import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';

export class StudioSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.time('🎬 Seeding studios');
    console.log('🎬 Seeding studios...');

    const studioRepository = this.dataSource.getRepository(Studio);

    // Check if studios already exist
    const existingCount = await studioRepository.count();
    if (existingCount > 0) {
      console.log('📋 Studios already exist, skipping...');
      return;
    }

    // Create 8 studios with different configurations
    const studioData: Partial<Studio>[] = [];
    for (let i = 1; i <= 8; i++) {
      studioData.push({
        studioNumber: i,
        seatCapacity: randNumber({ min: 50, max: 200 }),
        hasImax: i <= 2 ? true : randBoolean(), // First 2 studios have IMAX
        has3D: i <= 4 ? true : randBoolean(), // First 4 studios have 3D
        isActive: true,
      });
    }

    // Bulk insert all studios at once
    await studioRepository
      .createQueryBuilder()
      .insert()
      .into(Studio)
      .values(studioData)
      .execute();

    console.timeEnd('🎬 Seeding studios');
    console.log(`✅ Successfully seeded ${studioData.length} studios`);
  }
}
