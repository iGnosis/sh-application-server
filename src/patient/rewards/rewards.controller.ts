import { Controller } from '@nestjs/common';

@Controller('rewards')
export class RewardsController {}

// Call this API on every activity completion (?)
// Write an API that updates the patient reward JSONB field.

/*
- StatService to work out Monthly Goals
- user request must have intl timezone 'Asia/Kolkata'
- SQL -
    - Convert Unix epoch ms to timestamp UTC
    - Then convert to local timestamp using user's timezone. eg. 'Asia/Kolkata'
    - Aggregate by day, and apply count on 'activityEnded'
    - You should read data for an entire month
- Days having activityEnded count >= 3 would be considered as Active
- Unlock rewards based on this number
*/
