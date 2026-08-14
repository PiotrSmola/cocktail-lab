-- AlterTable
ALTER TABLE "Cocktail" ADD COLUMN     "abv" DOUBLE PRECISION,
ADD COLUMN     "abvEstimated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dilutionMethod" TEXT,
ADD COLUMN     "nameSort" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "nameSort" TEXT NOT NULL DEFAULT '';

-- Backfill collation-stable sort keys for existing rows; the seed keeps them in sync afterwards.
UPDATE "Cocktail" SET "nameSort" = lower("name");
UPDATE "Ingredient" SET "nameSort" = lower("name");

-- CreateTable
CREATE TABLE "PantryItem" (
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("userId","ingredientId")
);

-- CreateIndex
CREATE INDEX "PantryItem_ingredientId_idx" ON "PantryItem"("ingredientId");

-- CreateIndex
CREATE INDEX "Cocktail_nameSort_idx" ON "Cocktail"("nameSort");

-- CreateIndex
CREATE INDEX "Cocktail_glass_idx" ON "Cocktail"("glass");

-- CreateIndex
CREATE INDEX "Cocktail_abv_idx" ON "Cocktail"("abv");

-- CreateIndex
CREATE INDEX "Ingredient_nameSort_idx" ON "Ingredient"("nameSort");

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
