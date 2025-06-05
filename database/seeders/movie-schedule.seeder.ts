import { Movie } from '@app/modules/movies/entities/movies.entity';
import { MovieSchedule } from '@app/modules/orders/entities/movies-schedule.entity';
import { Studio } from '@app/modules/studio/entities/studio.entity';
import { randNumber } from '@ngneat/falso';
import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';

export class MovieScheduleSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.time('📅 Seeding movie schedules');
    console.log('📅 Seeding movie schedules...');

    const scheduleRepository = this.dataSource.getRepository(MovieSchedule);
    const movieRepository = this.dataSource.getRepository(Movie);
    const studioRepository = this.dataSource.getRepository(Studio);

    // Check if schedules already exist
    const existingCount = await scheduleRepository.count();
    if (existingCount > 0) {
      console.log('📋 Movie schedules already exist, skipping...');
      return;
    }

    const movies = await movieRepository.find();
    const studios = await studioRepository.find();

    if (movies.length === 0) {
      console.log('⚠️ No movies found. Please run movie seeder first.');
      return;
    }

    if (studios.length === 0) {
      console.log('⚠️ No studios found. Please run studio seeder first.');
      return;
    }

    const schedules: Partial<MovieSchedule>[] = [];
    const timeSlots = [
      { hour: 10, minute: 0 }, // 10:00 AM
      { hour: 13, minute: 0 }, // 1:00 PM
      { hour: 16, minute: 0 }, // 4:00 PM
      { hour: 19, minute: 0 }, // 7:00 PM
      { hour: 21, minute: 30 }, // 9:30 PM
    ];

    // Use a Set to track unique studio + time combinations to avoid conflicts
    const scheduledSlots = new Set<string>();

    // Generate schedules for the next 30 days
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(today.getDate() + dayOffset);
      const dateStr = scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Create 8-15 random schedules per day
      const schedulesPerDay = randNumber({ min: 8, max: 15 });

      console.log(`Generating ${schedulesPerDay} schedules for ${dateStr}...`);

      for (let i = 0; i < schedulesPerDay; i++) {
        const randomMovie = movies[Math.floor(Math.random() * movies.length)];
        const randomStudio =
          studios[Math.floor(Math.random() * studios.length)];
        const randomTimeSlot =
          timeSlots[Math.floor(Math.random() * timeSlots.length)];

        // Create start time
        const startTime = new Date(scheduleDate);
        startTime.setHours(randomTimeSlot.hour, randomTimeSlot.minute, 0, 0);

        // Create end time (assuming 2-3 hour movies)
        const endTime = new Date(startTime);
        const movieDuration = randNumber({ min: 120, max: 180 }); // 2-3 hours in minutes
        endTime.setMinutes(startTime.getMinutes() + movieDuration);

        // Create a unique key for this studio + date + time slot
        const slotKey = `${randomStudio.id}_${dateStr}_${randomTimeSlot.hour}_${randomTimeSlot.minute}`;

        // Skip if this slot is already taken
        if (scheduledSlots.has(slotKey)) {
          continue;
        }

        // Mark this slot as taken
        scheduledSlots.add(slotKey);

        // Generate price based on time slot and studio features
        let basePrice = 50000; // Base price in IDR

        // Premium pricing for evening shows
        if (randomTimeSlot.hour >= 19) {
          basePrice += 15000;
        }

        // Premium pricing for IMAX
        if (randomStudio.hasImax) {
          basePrice += 25000;
        }

        // Premium pricing for 3D
        if (randomStudio.has3D) {
          basePrice += 10000;
        }

        schedules.push({
          movieId: randomMovie.id,
          studioId: randomStudio.id,
          startTime,
          endTime,
          date: scheduleDate,
          price: basePrice,
          bookedSeats: 0, // Start with no bookings
        });
      }
    }

    // Bulk insert all schedules
    if (schedules.length > 0) {
      // Insert in chunks to avoid query size limitations
      const chunkSize = 500;
      for (let i = 0; i < schedules.length; i += chunkSize) {
        const chunk = schedules.slice(i, i + chunkSize);
        await scheduleRepository
          .createQueryBuilder()
          .insert()
          .into(MovieSchedule)
          .values(chunk)
          .execute();
        console.log(
          `Inserted chunk ${i / chunkSize + 1} of ${Math.ceil(schedules.length / chunkSize)}`,
        );
      }
    }

    console.timeEnd('📅 Seeding movie schedules');
    console.log(
      `✅ Successfully seeded ${schedules.length} movie schedules for the next 30 days`,
    );
  }
}
