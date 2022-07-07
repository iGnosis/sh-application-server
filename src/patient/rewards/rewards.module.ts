import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RewardsController],
  providers: [RewardsService],
})
export class RewardsModule {}

// Default rewards JSONB field in 'patients' table.

// As a patient:
// - I can select the entire JSONB field

// [
//   {
//     isUnlocked: false,
//     isAccessed: false,
//     tier: 'bronze',
//     description: '10% off on all therapy equipment from EXERTOOLS',
//     unlocksAtDayCompleted: 5
//   },
//   {
//     isUnlocked: false,
//     isAccessed: false,
//     tier: 'silver',
//     description: '15% off on all therapy equipment from EXERTOOLS',
//     unlocksAtDayCompleted: 10
//   },
//   {
//     isUnlocked: false,
//     isAccessed: false,
//     tier: 'gold',
//     description: 20 % off on all therapy equipment from EXERTOOLS',
//     unlocksAtDayCompleted: 15
//   }
// ]

// Need to worry about this:
// --> API that runs to update patient rewards

// Given a patientId, I would need
