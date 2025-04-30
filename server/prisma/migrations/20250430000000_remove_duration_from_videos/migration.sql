-- First make the column nullable
ALTER TABLE "Video" ALTER COLUMN "duration" DROP NOT NULL;
 
-- Then drop the column
ALTER TABLE "Video" DROP COLUMN "duration"; 