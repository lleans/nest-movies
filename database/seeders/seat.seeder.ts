import { Seat } from '@app/modules/studio/entities/seats.entity';
import { Studio } from '@app/modules/studio/entities/studio.entity';
import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';

export class SeatSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.time('💺 Seeding seats');
    console.log('💺 Seeding seats for all studios...');

    const studioRepository = this.dataSource.getRepository(Studio);
    const seatRepository = this.dataSource.getRepository(Seat);

    // Check if seats already exist
    const existingCount = await seatRepository.count();
    if (existingCount > 0) {
      console.log('📋 Seats already exist, skipping...');
      return;
    }

    // Get all studios
    const studios = await studioRepository.find();

    // We'll collect all seats in one array for bulk insert
    const allSeats: Partial<Seat>[] = [];
    let totalSeats = 0;

    // For each studio, create the appropriate number of seats
    for (const studio of studios) {
      console.log(`Creating seats for Studio ${studio.studioNumber}...`);

      // Calculate a reasonable layout based on capacity
      // We'll use a square-ish layout with slightly more columns than rows
      const totalSeatsNeeded = studio.seatCapacity;
      const approxRows = Math.floor(Math.sqrt(totalSeatsNeeded));
      const seatsPerRow = Math.ceil(totalSeatsNeeded / approxRows);

      let seatCount = 0;

      // Create seats with row labels (A, B, C...) and seat numbers
      for (
        let rowIndex = 0;
        rowIndex < approxRows && seatCount < totalSeatsNeeded;
        rowIndex++
      ) {
        // Convert row index to letter (0 -> A, 1 -> B, etc.)
        const rowLabel = String.fromCharCode(65 + rowIndex);

        for (
          let seatNum = 1;
          seatNum <= seatsPerRow && seatCount < totalSeatsNeeded;
          seatNum++
        ) {
          allSeats.push({
            studioId: studio.id,
            rowLabel: rowLabel,
            seatNumber: seatNum,
          });
          seatCount++;
        }
      }

      console.log(
        `Generated ${seatCount} seats for Studio ${studio.studioNumber}`,
      );
      totalSeats += seatCount;
    }

    // Bulk insert all seats at once
    if (allSeats.length > 0) {
      // Insert in chunks of 1000 to avoid query size limitations
      const chunkSize = 1000;
      for (let i = 0; i < allSeats.length; i += chunkSize) {
        const chunk = allSeats.slice(i, i + chunkSize);
        await seatRepository
          .createQueryBuilder()
          .insert()
          .into(Seat)
          .values(chunk)
          .execute();
        console.log(
          `Inserted chunk ${i / chunkSize + 1} of ${Math.ceil(allSeats.length / chunkSize)}`,
        );
      }
    }

    console.timeEnd('💺 Seeding seats');
    console.log(
      `✅ Successfully seeded ${totalSeats} seats across all studios`,
    );
  }
}
